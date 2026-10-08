const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const { compositeImagesAsync, generateImageAsync } = require('@expo/image-utils');

// The launcher half of the daily face rotation. `src/core/appIcon.ts` decides
// which face today wears; this declares the components that make a face
// possible at all.
//
// Android cannot change an app icon. What it can do is enable and disable
// <activity-alias> entries, each carrying its own icon and a LAUNCHER filter,
// all targeting MainActivity. This generates one alias per face plus the
// drawables each alias needs, and moves the LAUNCHER filter off MainActivity
// so that only aliases are ever toggled — see the note in AppIconModule.kt for
// why disabling MainActivity would be unrecoverable.

// Expo's own baselines, so a generated face sits at exactly the size a
// hand-authored icon would (@expo/prebuild-config withAndroidIcons).
const ADAPTIVE_BASELINE_PX = 108;
const LEGACY_BASELINE_PX = 48;

const DPI = [
  { folder: 'mipmap-mdpi', scale: 1 },
  { folder: 'mipmap-hdpi', scale: 1.5 },
  { folder: 'mipmap-xhdpi', scale: 2 },
  { folder: 'mipmap-xxhdpi', scale: 3 },
  { folder: 'mipmap-xxxhdpi', scale: 4 },
];

const RES = 'android/app/src/main/res';
const ANYDPI = 'mipmap-anydpi-v26';

// The same list src/core/appIcon.ts rotates through, so an alias exists for
// exactly the faces that can come up. Dormant is the no-key face and ships as
// the app's own icon, so it needs no generated drawable — its alias points at
// @mipmap/ic_launcher.
const faces = require('../src/core/faces.json');
const DORMANT = faces.dormant;
const LIGHT = faces.lightPrefix;

// The light set (2026-10-08) is the same nine faces in 1f's finish, rendered by
// tools/build-icons.mjs. Its aliases are the dark names with `lightPrefix` in
// front — `.Icon_Light_Calm` — which AppIconModule.kt needs no change for: it
// enumerates aliases from the manifest and keys on everything after `.Icon_`.
const assetFor = (projectRoot, face, light = false) =>
  path.join(projectRoot, 'assets', `icon-fg-${light ? 'light-' : ''}${face.toLowerCase()}.png`);

// Fails the prebuild rather than the build: a face with no artwork would
// otherwise reach Gradle as an alias pointing at a drawable that is not there,
// and cost a full EAS round trip to discover.
function facesFrom(projectRoot) {
  for (const light of [false, true]) {
    const missing = [DORMANT, ...faces.order].filter((f) => !fs.existsSync(assetFor(projectRoot, f, light)));
    if (missing.length > 0) {
      throw new Error(
        `withRotatingIcons: src/core/faces.json names ${missing.join(', ')}, `
          + `but ${path.relative(projectRoot, assetFor(projectRoot, missing[0], light))} is missing.`
          + (light ? ' Run `node tools/build-icons.mjs` to render the light set.' : ''),
      );
    }
  }
  return faces.order;
}

const resourceFor = (face, light = false) =>
  `ic_launcher_${light ? 'light_' : ''}${face.toLowerCase()}`;

// Expo generates the dark background from app.json's adaptiveIcon; the light
// one is generated here, beside its faces.
const LIGHT_BACKGROUND = 'ic_launcher_light_background';

const adaptiveXml = (resource, background) =>
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/${background}"/>
    <foreground android:drawable="@mipmap/${resource}_foreground"/>
</adaptive-icon>
`;

async function scaled(projectRoot, src, px, backgroundColor) {
  const { source } = await generateImageAsync(
    { projectRoot, cacheType: `facility-icon-${px}` },
    { src, width: px, height: px, resizeMode: 'cover', backgroundColor },
  );
  return source;
}

const withGeneratedFaces = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const res = path.join(projectRoot, RES);
      // The aliases share Expo's generated background, which exists only
      // because app.json sets adaptiveIcon.backgroundImage. Fail loudly rather
      // than emit XML pointing at a drawable that is not there.
      const sharedBg = path.join(res, 'mipmap-xxxhdpi', 'ic_launcher_background.webp');
      if (!fs.existsSync(sharedBg)) {
        throw new Error(
          'withRotatingIcons: @mipmap/ic_launcher_background is missing. '
            + 'android.adaptiveIcon.backgroundImage must be set in app.json.',
        );
      }

      await fs.promises.mkdir(path.join(res, ANYDPI), { recursive: true });

      const lightBgSrc = path.join(projectRoot, 'assets', 'icon-bg-light.png');
      if (!fs.existsSync(lightBgSrc)) {
        throw new Error(
          'withRotatingIcons: assets/icon-bg-light.png is missing. '
            + 'Run `node tools/build-icons.mjs` to render the light set.',
        );
      }
      for (const { folder, scale } of DPI) {
        const dir = path.join(res, folder);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(
          path.join(dir, `${LIGHT_BACKGROUND}.webp`),
          await scaled(projectRoot, lightBgSrc, ADAPTIVE_BASELINE_PX * scale, 'transparent'),
        );
      }

      // The dark eight (dormant is the app's own icon), then all nine light —
      // light dormant included, since nothing else would ever draw it.
      const work = [
        ...facesFrom(projectRoot).map((face) => ({ face, light: false })),
        ...[DORMANT, ...faces.order].map((face) => ({ face, light: true })),
      ];

      for (const { face, light } of work) {
        const resource = resourceFor(face, light);
        const fgSrc = assetFor(projectRoot, face, light);
        const bgSrc = light ? lightBgSrc : path.join(projectRoot, 'assets', 'icon-bg.png');

        await fs.promises.writeFile(
          path.join(res, ANYDPI, `${resource}.xml`),
          adaptiveXml(resource, light ? LIGHT_BACKGROUND : 'ic_launcher_background'),
          'utf8',
        );

        for (const { folder, scale } of DPI) {
          const dir = path.join(res, folder);
          await fs.promises.mkdir(dir, { recursive: true });

          // The adaptive foreground keeps its transparency: the launcher masks
          // it over the background layer itself.
          await fs.promises.writeFile(
            path.join(dir, `${resource}_foreground.webp`),
            await scaled(projectRoot, fgSrc, ADAPTIVE_BASELINE_PX * scale, 'transparent'),
          );

          // API 24 and 25 predate adaptive icons and use this square instead,
          // so the face has to be flattened over the background for them.
          const px = LEGACY_BASELINE_PX * scale;
          await fs.promises.writeFile(
            path.join(dir, `${resource}.webp`),
            await compositeImagesAsync({
              foreground: await scaled(projectRoot, fgSrc, px, 'transparent'),
              background: await scaled(projectRoot, bgSrc, px, 'transparent'),
            }),
          );
        }
      }

      return cfg;
    },
  ]);

const isLauncher = (filter) =>
  (filter.category ?? []).some(
    (c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER',
  );

const aliasFor = (face, resource) => ({
  $: {
    // `face` is the alias's whole suffix — `Calm` or `Light_Calm` — and only
    // dark Dormant (`DORMANT` exactly) ships enabled.
    'android:name': `.Icon_${face}`,
    'android:targetActivity': '.MainActivity',
    // Dormant is the face a fresh install wears — it has no key yet — so it is
    // the one alias enabled in the manifest.
    'android:enabled': face === DORMANT ? 'true' : 'false',
    'android:exported': 'true',
    'android:icon': `@mipmap/${resource}`,
    'android:roundIcon': `@mipmap/${resource}`,
    'android:label': '@string/app_name',
  },
  'intent-filter': [
    {
      action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
    },
  ],
});

const withAliases = (config) =>
  withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    const main = (app.activity ?? []).find((a) => a.$?.['android:name'] === '.MainActivity');
    if (!main) return cfg;

    // The LAUNCHER filter moves to the aliases. MainActivity keeps its deep
    // link filter and stays enabled forever; an alias whose targetActivity is
    // disabled cannot launch, so MainActivity is never a thing we toggle.
    main['intent-filter'] = (main['intent-filter'] ?? []).filter((f) => !isLauncher(f));

    const dark = [DORMANT, ...facesFrom(cfg.modRequest.projectRoot)];
    app['activity-alias'] = [
      ...dark.map((face) => aliasFor(face, face === DORMANT ? 'ic_launcher' : resourceFor(face))),
      ...dark.map((face) => aliasFor(`${LIGHT}${face}`, resourceFor(face, true))),
    ];

    return cfg;
  });

module.exports = function withRotatingIcons(config) {
  return withAliases(withGeneratedFaces(config));
};
