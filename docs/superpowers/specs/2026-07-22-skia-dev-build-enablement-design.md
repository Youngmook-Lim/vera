# Skia + Dev-Build Enablement — design

*Decided 2026-07-22. Phase 4 infrastructure prerequisite for the organism module (and later hazard). This is sub-project A; the organism module itself is sub-project B, built on top of this. Concept: `docs/architecture.md` (Deployment; "@shopify/react-native-skia" in the stack table).*

## Summary

Enable `@shopify/react-native-skia` in the app and stand up an EAS **development** build so Skia can run on a real device. Skia is a native module — it cannot run under Expo Go at all — so every remaining Skia-drawn centerpiece (organism blob now, hazard optic eye later) is blocked until a dev build with Skia is installed and proven on-device.

This is deliberately a **facility-wide, one-time** change, separated from the organism module so it has a crisp, independently-verifiable done-condition: *a red Skia circle renders in the dev build on the user's phone*. Until that is true, building the blob would be building blind.

This ends the "stay in Expo Go" run that carried results and incinerator. From here, the app on the user's phone is the **dev build**, not Expo Go (hot reload still works via `expo start --dev-client`).

## Background / why now

Results and incinerator both avoided Skia (their centerpieces are SVG gradient art). The organism blob is the first centerpiece that has no faithful non-Skia path the user chose to accept: the prototype blob uses an animating elliptical `border-radius` with no RN equivalent, and the user chose Skia (over an SVG path-morph alternative) for the richest result and to unblock hazard. See `docs/superpowers/specs/` organism design (sub-project B, written after this).

Build method: **EAS cloud build** (chosen over local `expo run:android`) — no local Android SDK/Android Studio required, matching how the user already sideloads Expo Go APKs.

## Scope

### In scope (committable, done by the implementer)

1. **Dependencies.** Add `@shopify/react-native-skia` and `expo-dev-client` via `npx expo install` (Expo resolves SDK-57-compatible versions). If the sandbox cannot reach the network, pin the SDK-57-compatible versions directly in `package.json` and note it in the report for the user to `npx expo install` themselves.
2. **`eas.json`.** Create with a `development` profile (`developmentClient: true`, `distribution: "internal"`, Android `buildType: "apk"`) and a `preview` profile (internal APK, for the eventual friends build) plus a `production` placeholder. Include the CLI version field.
3. **Jest mock for Skia.** Wire `@shopify/react-native-skia`'s official jest mock in `jest.setup.ts` (or an equivalent `jest.mock`) so the suite and any Skia-importing module stay green under jsdom (Skia's native/canvas layer cannot run in jest). The exact mock entrypoint is version-specific — the implementer confirms it against the installed version's docs. Verified by `npm test` staying at 116/116 and `npx tsc --noEmit` clean.
4. **Temporary `SkiaProbe`.** A tiny self-contained component rendering a Skia `<Canvas>` with a single red `<Circle>` (~64×64), mounted at the bottom of the Facility home (`src/shell/FacilityScreen`) behind a clearly-marked `// TEMP: remove after Skia verified on-device (sub-project B removes this)` comment. This is the on-device proof artifact. It is removed as the first step of the organism module (sub-project B).

### Out of scope / handoff to the user (native build cannot run from this environment)

The user runs, in order:
```
eas login                                   # free Expo account under the GitHub email
eas init                                    # writes extra.eas.projectId into app.json
eas build -p android --profile development  # cloud build (~10-15 min)
# download the resulting APK, install on the phone, open it
```
Then reports whether the red Skia circle appears on the Facility home.

### Explicitly not in this sub-project

- The organism module (sub-project B).
- Any real Skia artwork (the probe is throwaway).
- iOS dev build (Android-first; iOS is a later concern per `docs/architecture.md`).
- Removing Expo Go support (the app still bundles fine; only the on-device runtime for the user changes to the dev build).

## Architecture & files

| File | Change |
|---|---|
| `package.json` | Add `@shopify/react-native-skia`, `expo-dev-client` (via `npx expo install`). |
| `eas.json` | New. `development` + `preview` + `production` profiles; `cli.version`. |
| `jest.setup.ts` | Add the Skia jest mock so the suite stays green. |
| `src/shell/components/SkiaProbe.tsx` | New, temporary. `<Canvas>` + red `<Circle>`. |
| `src/shell/FacilityScreen.tsx` | Mount `<SkiaProbe/>` temporarily at the bottom of the grid, clearly marked TEMP. |
| `app.json` | `extra.eas.projectId` is written by `eas init` (user-run) — not hand-edited. No `plugins` change needed (Skia and expo-dev-client need no config plugin for a standard install). |

## Verification

- **Automated (implementer, in-environment):** `npm test` stays at 116/116 with the Skia mock in place; `npx tsc --noEmit` clean; the app still bundles (`npx expo export` or `expo start` sanity if runnable in sandbox — otherwise typecheck + tests are the gate).
- **On-device (user, after the build):** the dev-build APK boots and the red Skia circle renders on the Facility home. This is the sub-project's true done-condition.

## Risks & notes

- **Version compatibility:** Skia for Expo SDK 57 / RN 0.86 — use `npx expo install` (never a hand-picked latest) so the compatible version is chosen.
- **Jest mock entrypoint is version-specific:** the implementer must confirm the correct mock path/shape for the installed version rather than assume a fixed path; the gate is a green suite.
- **First dev build is the slow one:** cloud queue + full native build (~10-15 min). Subsequent JS changes hot-reload without rebuilding; only native/dependency changes need a new build.
- **Metro/babel:** no `metro.config.js` or `babel.config.js` changes expected for a standard Skia install (babel uses `babel-preset-expo` defaults). If Skia's install docs for SDK 57 require a config plugin or metro tweak, add it and note it — but do not add speculative config.
- After this lands, update `docs/architecture.md` / `CLAUDE.md` build notes to reflect that a dev build now exists and Skia is available (done at the end of sub-project B or here, whichever merges first).
