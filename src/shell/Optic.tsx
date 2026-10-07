import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Shadow,
  SweepGradient,
  rect,
  rrect,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { dartLegs, opticGeometry } from './opticGeometry';
import { LIGHT_MIX, type Theme } from '../core/theme';
import { EMOTIONS, type EmotionKey } from '../vera/emotions';

// fdartQuick alone uses steps(1,end).
const DART_STEPPED = new Set(['quick']);

// A thin shell: every number the eye draws from comes out of opticGeometry.
// Nothing here computes anything *about an emotion* — only the arithmetic
// Skia itself needs to turn those numbers into a canvas (radii, transforms,
// path builders). See opticGeometry.ts for the tested math.
//
// Layer-for-layer against the 3a optic in
// `design/The Facility - Overhaul.dc.html`, and — since 2026-10-07 — against
// `1f BRUSHED INSTRUMENT` in `design/Light Optic Options.dc.html` on the pale
// ground. The two are the same OBJECT: every number in opticGeometry is shared,
// so aperture, pupil, both lids, the blink interval and the idle drift are
// identical in both themes and only what the eye is made of changes. That is
// the design's own framing — "Geometry and tempo are unchanged from
// emotions.ts... Each style only changes what the eye is made of."

const TRANSITION_MS = 420;
const WAKE_MS = 1150;

// Static layout constants — none of these vary by emotion OR by theme, so they
// live here rather than in opticGeometry's tested contract or in ART below.
const FIBRE_COUNT = 100; // repeating-conic-gradient at 3.6° pitch
const FIBRE_OUTER = 1; // the striation fills the iris, `inset:0`
const FIBRE_SLANT_DEG = 0.6; // half of the design's 1.2° coloured arc
const FIBRE_GROUP_OPACITY = 0.6;

// `left:25%;top:20%;width:22%;height:15%` — an ellipse, not a circle — filled
// with a white radial gradient and blurred. It is a bloom that falls off to
// nothing, not a solid white lozenge: the gradient is a *circle* in a
// wider-than-tall box, so CSS sizes it farthest-corner and the ellipse crops
// what spills past its top and bottom. The box is the same in both themes;
// only the core, the falloff stop and the blur move (see ART).
//
// These percentages are of the CANVAS here and of the SOCKET in the design,
// which puts the bloom about 2px up and left of where the mock draws it at the
// shipping size. Pre-existing, shared by both themes, and signed off on the
// device in the dark — left alone rather than moved under a light-theme change.
const CATCHLIGHT_LEFT = 0.25;
const CATCHLIGHT_TOP = 0.2;
const CATCHLIGHT_W = 0.22;
const CATCHLIGHT_H = 0.15;
// White at zero alpha, not `transparent`: black-at-zero would darken the ramp.
const CATCHLIGHT_EDGE = '#ffffff00';

// The socket's own radial-gradient is `circle at 50% 38%` in both themes; only
// its colours and its far stop differ.
const SOCKET_CENTRE_Y = 0.38;

// The iris gradient is off-centre at `42% 36%` in both themes — a well, not a
// lit disc.
const IRIS_CENTRE = [0.42, 0.36] as const;

// 1f's `inset:22%` ring inside the iris, drawn in the darkened iris. Light
// only; ART.innerRing carries its alpha, and null leaves it undrawn.
//
// `inset: 22%` pulls 22% in from EVERY edge, so the inner box is 56% of the
// iris's width and its radius is 0.56r — not 0.78r. The `1 - inset` reading is
// wrong by double, and `ringRadii` below carries the same trap.
const INNER_RING_RADIUS = 1 - 2 * 0.22;

// 1f's knurled rim: `repeating-conic-gradient(from 0deg, #15181b30 0deg .7deg,
// transparent .7deg 2.6deg)` masked to the outer 3.5px of the bezel. 360/2.6 is
// 138 ticks, and at the shipping radius a 0.7° arc is just under a pixel wide,
// so each one is a 1px radial stroke — the same construction as the fibre.
const KNURL_COUNT = 138;
const KNURL_DEPTH = 3.5;
const KNURL_ALPHA = 0.188; // #15181b30

// CSS measures a conic-gradient from twelve o'clock; Skia's sweep starts at
// three. `from 20deg` is therefore -70° here. The ramp's first and last stops
// are the same grey, so the seam is invisible either way, but the highlights
// land where the design put them.
const BEZEL_SWEEP_START = -70;

const LID_OVERHANG = 0.08; // `left:-8%;right:-8%`, then clipped by the socket

// `box-shadow` on the top lid alone — the shadow it throws down the eye. Skia's
// blur is the Gaussian's sigma and CSS's is twice that, so a 7px radius is 3.5
// here. The offset is 2px in both themes; the blur and the colour are ART's.
const LID_SHADOW_DY = 2;

// Everything the two grounds disagree about. The dark half is the 3a optic as
// it has always drawn; the light half is `1f BRUSHED INSTRUMENT` — a light
// anodised housing with a knurled rim, a smoke-glass socket and brushed
// shutters for lids, with her iris the only colour on it.
//
// The optic is NOT in `palette`, and deliberately: these are single-use art,
// not tokens anything else reads, and the dark set has lived here since the eye
// was built. Pushing them into theme.ts would mean inventing a light
// counterpart key for every dark literal purely to satisfy the key-set
// comparison in `palettes.test.ts`, which is the opposite of what that test is
// for. `ThemeSlider`'s two hardcoded grounds are the same kind of exception.
interface OpticArt {
  /** The bezel's flat fill. Under a sweep it is only what shows if it fails. */
  bezel: string;
  /** `conic-gradient(from 20deg, …)` — the brushed housing. null = flat. */
  bezelSweep: readonly string[] | null;
  /** `inset 0 1px 0` — the lip of light along the bezel's top edge. */
  bezelSheen: string;
  /**
   * `0 0 0 1px` — the hairline round the housing. null = none. The design's is
   * NOT inset, so it belongs just outside `bezelRadius`, where the canvas ends;
   * it is drawn just inside instead. Same clipping that dropped the cast
   * shadow, and the only version of it that can be seen at this canvas size.
   */
  bezelEdge: string | null;
  /** The knurl's ink. null = no knurl. */
  knurl: string | null;
  socket: readonly [string, string];
  socketStops: readonly [number, number];
  /** `inset 0 0 0 1px` — the machined edge of the socket. null = none. */
  socketEdge: string | null;
  /** `inset 0 2px 5px` — the socket sunk into the housing. null = none. */
  socketShade: string | null;
  /** The two engraved rings. null takes her iris, as the dark optic does. */
  ringInk: string | null;
  ringAlphas: readonly [number, number];
  /**
   * Their radii, as fractions of the socket's. The design writes them as
   * `inset:10%` / `inset:20%`, which is 0.8 and 0.6 — an inset comes off every
   * edge. The dark eye has drawn them at 0.9 and 0.8 since it was built, from
   * reading that as `1 - inset`, and it keeps those: it was signed off on the
   * device on 2026-08-11 and this design changes nothing dark. Light is new and
   * takes the design's own numbers. Do not unify these without re-checking the
   * dark eye on a phone.
   */
  ringRadii: readonly [number, number];
  /** The iris well, as a mix of her hue toward a base at each end. */
  irisCore: { mix: number; base: string };
  /** A mix like irisCore, or a fixed colour where the hue does not reach. */
  irisEdge: { mix: number; base: string } | string;
  irisStops: readonly [number, number];
  fibreAlpha: number;
  /** Alpha of 1f's `inset:22%` ring. null leaves it undrawn. */
  innerRing: number | null;
  /**
   * Whether the iris ring, the fibre, the inner ring and the lid seams take
   * `onLight(iris)` rather than the raw hue. 1f darkens all four, because on a
   * pale socket the raw hue is a wash — which is the same reason `emotionText`
   * exists for type. The iris FILL still carries the hue itself.
   */
  darkenAccent: boolean;
  pupil: string;
  /** `0 0 10px iris` — the core lit from behind. null takes pupilSheen. */
  pupilGlow: number | null;
  /** `inset 0 1px 1px` — a machined highlight on an ink core. */
  pupilSheen: string;
  catchCore: string;
  catchStop: number;
  catchBlur: number;
  /** Read top-down. A `0deg` CSS ramp runs bottom-to-top and is reversed. */
  lidTop: readonly string[];
  lidTopStops: readonly number[];
  lidBottom: readonly string[];
  lidBottomStops: readonly number[];
  /** The hairline grain over each lid's body, and its pitch and direction. */
  grainTop: string;
  grainBottom: string;
  grainPitch: number;
  /** `90deg` striates down the lid (x); `0deg` striates across it (y). */
  grainAxis: 'x' | 'y';
  lidShadowBlur: number;
  lidShadowColour: string;
  /**
   * The lids' leading edges. null takes `geometry.seamAlpha` — the per-emotion
   * `--seam`, 0.34 to 0.66. 1f does not read it: both edges are fixed, because
   * the darkened iris on brushed metal already carries the state at full
   * strength where a faint tint on near-black had to be scaled to be seen.
   */
  seamAlpha: number | null;
  seamBAlpha: number | null;
}

const ART: Record<Theme, OpticArt> = {
  dark: {
    bezel: '#191811',
    bezelSweep: null,
    bezelSheen: '#ffffff14',
    bezelEdge: null,
    knurl: null,
    socket: ['#1c1b15', '#0a0a08'],
    socketStops: [0, 0.74],
    socketEdge: null,
    socketShade: null,
    ringInk: null,
    ringAlphas: [0.16, 0.07],
    ringRadii: [0.9, 0.8], // as built, not as the design reads — see above

    // color-mix(in srgb, var(--iris) 34%, #000) — the iris at a third strength
    // over black, which is what makes the well read as deep rather than lit.
    irisCore: { mix: 0.34, base: '#000000' },
    irisEdge: '#0a0a08',
    irisStops: [0, 0.88],
    fibreAlpha: 0.26,
    innerRing: null,
    darkenAccent: false,
    pupil: '#ffffff',
    pupilGlow: 5, // `0 0 10px`, halved for Skia's sigma
    pupilSheen: '#ffffff00',
    catchCore: '#ffffffcc',
    catchStop: 0.74,
    catchBlur: 1.4,
    // The lid's own body: a vertical gradient under a 1px striation. Both ramps
    // map to the lid's OWN box, which is what `height:var(--lid)` makes them —
    // so the whole ramp compresses into a resting lid and stretches as it
    // closes. Pinned to the closed extent instead, a resting lid only ever
    // showed the first sixth of its gradient and never darkened at all.
    lidTop: ['#221f18', '#151309', '#0d0c08'],
    lidTopStops: [0, 0.64, 1],
    lidBottom: ['#0d0c08', '#131208', '#1e1c16'],
    lidBottomStops: [0, 0.3, 1],
    // `repeating-linear-gradient(90deg,#ffffff07 0 1px,transparent 1px 3px)` —
    // a 1px hairline every 3px, the grain that keeps the lid from reading as
    // flat paint.
    grainTop: '#ffffff07',
    grainBottom: '#ffffff05',
    grainPitch: 3,
    grainAxis: 'x',
    lidShadowBlur: 3.5, // `0 2px 7px`
    lidShadowColour: '#000000aa',
    seamAlpha: null,
    seamBAlpha: null,
  },
  light: {
    bezel: '#eceef0',
    bezelSweep: [
      '#f4f5f6',
      '#c6cbd0',
      '#eef0f2',
      '#b5bbc1',
      '#f4f5f6',
      '#cbd0d4',
      '#eceef0',
      '#bdc3c8',
      '#f4f5f6',
    ],
    bezelSheen: '#ffffff',
    bezelEdge: '#a7aeb4',
    knurl: '#15181b',
    socket: ['#fbfcfd', '#d2d7db'],
    socketStops: [0, 0.8],
    socketEdge: '#9aa2a9',
    socketShade: '#2a333b66',
    // The engraved rings go to ink here rather than to her hue: on smoke glass
    // an iris-tinted hairline at 16% is nothing, and the design draws them as
    // machining on the housing instead of as light from her.
    ringInk: '#15181b',
    ringAlphas: [0.18, 0.102], // #15181b2e / #15181b1a
    ringRadii: [0.8, 0.6], // `inset:10%` / `inset:20%`, read correctly
    irisCore: { mix: 0.5, base: '#ffffff' },
    irisEdge: { mix: 0.8, base: '#000000' },
    irisStops: [0, 0.92],
    fibreAlpha: 0.4,
    innerRing: 0.5,
    darkenAccent: true,
    // The core turns to ink so she still has a pupil. A white core on a white
    // socket is not a pupil, it is a hole in the drawing — which is the one
    // thing `design/Theme Options.dc.html` and `1f` agree on outright.
    pupil: '#15181b',
    pupilGlow: null,
    pupilSheen: '#ffffff40',
    catchCore: '#ffffffee',
    catchStop: 0.7,
    catchBlur: 0.8,
    lidTop: ['#e6e9ec', '#c2c8cd'],
    lidTopStops: [0, 1],
    lidBottom: ['#c8cdd2', '#e6e9ec'],
    lidBottomStops: [0, 1],
    // `repeating-linear-gradient(0deg, …)` rather than 90deg: the brushing runs
    // ACROSS the shutter, not down it, so the grain repeats along y.
    grainTop: '#ffffff66',
    grainBottom: '#ffffff55',
    grainPitch: 2,
    grainAxis: 'y',
    lidShadowBlur: 2.5, // `0 2px 5px`
    lidShadowColour: '#2a333b55',
    seamAlpha: 1,
    seamBAlpha: 0.6,
  },
};

export interface OpticProps {
  emotion: EmotionKey;
  size: number;
  gazeX?: SharedValue<number>;
  gazeY?: SharedValue<number>;
  /** True while a touch owns the eye, which stands the idle drift down. */
  tracking?: boolean;
  onPress?: () => void;
  waking?: boolean;
  /**
   * Which ground she is being drawn on. A PROP and not a store read, because
   * `Splash.tsx` is theme-invariant: its ground is `iconBg`, fixed in app.json
   * at build time, so a brushed-metal eye there would sit pale on near-black —
   * the exact inverse of the read that `1f` was drawn to fix. The splash passes
   * nothing and gets the dark eye whatever the subject has stored.
   */
  theme?: Theme;
}

export function Optic({
  emotion,
  size,
  gazeX,
  gazeY,
  tracking,
  onPress,
  waking,
  theme = 'dark',
}: OpticProps) {
  const center = size / 2;
  const geometry = useMemo(() => opticGeometry(emotion, size), [emotion, size]);
  const art = ART[theme];

  const irisRadius = useSharedValue(geometry.irisRadius);
  const pupilRadius = useSharedValue(geometry.pupilRadius);
  // One clock for the blink — 0 open, 1 shut — and one resting height per lid.
  // Two lids running two identical loops are still two loops: reanimated
  // decides each animation's timeline against THAT value's own previous
  // animation, so the pair can end up on different sides of the decision and
  // close 420ms apart. A single clock cannot disagree with itself.
  const blink = useSharedValue(0);
  const openTop = useSharedValue(geometry.lidHeight);
  const openBottom = useSharedValue(geometry.lowerLidHeight);
  const colorFrom = useSharedValue(geometry.iris);
  const colorTo = useSharedValue(geometry.iris);
  const colorProgress = useSharedValue(1);

  const dartX = useSharedValue(0);
  const dartY = useSharedValue(0);

  const defaultGazeX = useSharedValue(0);
  const defaultGazeY = useSharedValue(0);
  const lookX = gazeX ?? defaultGazeX;
  const lookY = gazeY ?? defaultGazeY;

  const wakeScale = useSharedValue(waking ? 0.86 : 1);
  const wakeOpacity = useSharedValue(waking ? 1 : 0);

  // Emotional transitions: ease every shared value to the new geometry, then
  // restart the blink loop on the new tempo. Every state blinks — 3a runs
  // fshutT on all eight cells, and nothing in the design stares.
  useEffect(() => {
    irisRadius.value = withTiming(geometry.irisRadius, { duration: TRANSITION_MS });
    pupilRadius.value = withTiming(geometry.pupilRadius, { duration: TRANSITION_MS });

    colorFrom.value = colorTo.value;
    colorTo.value = geometry.iris;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: TRANSITION_MS });

    openTop.value = withTiming(geometry.lidHeight, { duration: TRANSITION_MS });
    openBottom.value = withTiming(geometry.lowerLidHeight, { duration: TRANSITION_MS });

    // The settle and the loop are one animation, not a JS timer handing off to
    // one. withTiming inherits the START TIME AND START VALUE of the animation
    // it replaces whenever that one is an unfinished timing with the same
    // toValue (reanimated's `onStart`, animation/timing.ts) — and a
    // setTimeout(420) always fires a frame before a 420ms UI animation has
    // finished, so the loop's first leg used to adopt the settle's clock:
    // still crawling toward the new resting height, but now over blinkRestMs
    // instead — 5.3s on calm, 10.9s on suspicious. Inside a sequence a leg
    // only starts once its predecessor has FINISHED, and a finished timing
    // zeroes its own startTime, so nothing here can inherit anything.
    blink.value = withSequence(
      withTiming(0, { duration: TRANSITION_MS }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: geometry.blinkRestMs }),
          withTiming(1, { duration: geometry.blinkCloseMs }),
          withTiming(1, { duration: geometry.blinkHoldMs }),
          withTiming(0, { duration: geometry.blinkOpenMs }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(blink);
      cancelAnimation(openTop);
      cancelAnimation(openBottom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  // The idle drift (3a) — her resting motion, and the ground truth for what
  // each emotion does with an eye nobody is touching. It is the only thing
  // moving the pupil when it runs: 4a's live optic drives that same transform
  // from the finger and carries no drift at all, so a touch stands the drift
  // down (`tracking`) and gets the eye to itself until Stage gives it back.
  useEffect(() => {
    const key = EMOTIONS[emotion].dart;
    if (!key || tracking) {
      dartX.value = withTiming(0, { duration: TRANSITION_MS });
      dartY.value = withTiming(0, { duration: TRANSITION_MS });
      return;
    }
    const legs = dartLegs(key, EMOTIONS[emotion].dartMs, geometry.socketDiameter);
    const stepped = DART_STEPPED.has(key);
    const run = (axis: 'x' | 'y') =>
      withRepeat(
        withSequence(
          ...legs.map((leg) =>
            withTiming(leg[axis], {
              // Every leg runs for the length the keyframes give it, stepped or
              // not — the fixations ARE the long legs (fdartQuick holds 0–8%,
              // 9–30%, …), so collapsing them ran the whole 3.4s cycle in a
              // few frames.
              duration: leg.ms,
              // A stepped leg already carries the fixation it holds (see
              // dartLegs), so it takes its value at once and keeps it for the
              // whole leg: no travel, no in-between position.
              easing: stepped ? Easing.steps(1, true) : Easing.inOut(Easing.ease),
            }),
          ),
        ),
        -1,
      );
    dartX.value = run('x');
    dartY.value = run('y');
    return () => {
      cancelAnimation(dartX);
      cancelAnimation(dartY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotion, geometry.socketDiameter, tracking]);

  // A single wake bloom, once, whenever `waking` turns on.
  useEffect(() => {
    if (waking) {
      wakeScale.value = 0.86;
      wakeOpacity.value = 1;
      wakeScale.value = withTiming(1.06, { duration: WAKE_MS });
      wakeOpacity.value = withTiming(0, { duration: WAKE_MS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waking]);

  const irisColor = useDerivedValue(() =>
    interpolateColor(colorProgress.value, [0, 1], [colorFrom.value, colorTo.value]),
  );
  // onLight(iris) on the UI thread. A channel-wise multiply toward black is
  // exactly what `interpolateColor` does between black and a colour, so this
  // and theme.ts's `onLight` cannot drift apart while they share LIGHT_MIX.
  const darkIris = useDerivedValue(() =>
    interpolateColor(LIGHT_MIX, [0, 1], ['#000000', irisColor.value]),
  );
  // Whatever she is drawn WITH, as opposed to the hue the iris is filled with.
  const accent = art.darkenAccent ? darkIris : irisColor;

  // Both ends of the iris well. A mix toward a base at each end covers both
  // themes: the dark optic's far stop is a fixed near-black the hue never
  // reaches, so `irisEdge` is allowed to be a plain colour. Plain values off
  // `art` are captured, so the deps array is what re-reads them on a switch.
  const coreMix = art.irisCore.mix;
  const coreBase = art.irisCore.base;
  const edgeMix = typeof art.irisEdge === 'string' ? null : art.irisEdge.mix;
  const edgeBase = typeof art.irisEdge === 'string' ? art.irisEdge : art.irisEdge.base;
  const irisGradientColors = useDerivedValue(
    () => [
      interpolateColor(coreMix, [0, 1], [coreBase, irisColor.value]),
      edgeMix === null
        ? edgeBase
        : interpolateColor(edgeMix, [0, 1], [edgeBase, irisColor.value]),
    ],
    [coreMix, coreBase, edgeMix, edgeBase],
  );

  const wakeColors = useDerivedValue(() => ['#ffffff', irisColor.value]);
  const wakeTransform = useDerivedValue(() => [{ scale: wakeScale.value }]);
  const dartTransform = useDerivedValue(() => [
    { translateX: dartX.value },
    { translateY: dartY.value },
  ]);
  // Both lids hang off the socket's edges, not the canvas's — anchored to the
  // outer box each starts BEZEL_INSET too far out and they stop meeting when
  // shut. Plain numbers off `geometry`, so both need an explicit deps array to
  // be re-read when the emotion changes (as gazeTransform does below).
  // Each lid is its resting height carried toward its closed height by the one
  // blink clock, which is what `height:var(--lid)` animating to a fixed shut
  // height is. Both are read off the same value, in the same frame.
  const topLid = useDerivedValue(
    () => openTop.value + (geometry.lidClosedHeight - openTop.value) * blink.value,
    [geometry.lidClosedHeight],
  );
  const lowerLid = useDerivedValue(
    () => openBottom.value + (geometry.lowerLidClosedHeight - openBottom.value) * blink.value,
    [geometry.lowerLidClosedHeight],
  );

  const lowerLidY = useDerivedValue(
    () => geometry.socketBottom - lowerLid.value,
    [geometry.socketBottom],
  );
  // The seam rides the lid's leading edge, one pixel above it.
  const seamY = useDerivedValue(
    () => geometry.socketTop + topLid.value - 1,
    [geometry.socketTop],
  );
  // Each ramp ends on its own lid's leading edge, so it spans the lid and
  // nothing more.
  const topLidEnd = useDerivedValue(
    () => vec(0, geometry.socketTop + topLid.value),
    [geometry.socketTop],
  );
  const lowerLidStart = useDerivedValue(
    () => vec(0, geometry.socketBottom - lowerLid.value),
    [geometry.socketBottom],
  );

  // 1f's ring inside the iris, which has to follow the iris as it opens.
  const innerRingRadius = useDerivedValue(() => irisRadius.value * INNER_RING_RADIUS);

  // Gaze is a plain prop-driven clamp (opticGeometry.gazeLimitPx, already in
  // pixels), not itself an emotion the canvas animates through — an
  // explicit deps array (as Blob.tsx does for its plain `hunger` prop)
  // rebuilds it on change.
  const gazeTransform = useDerivedValue(() => {
    const limit = geometry.gazeLimitPx;
    return [{ translateX: lookX.value * limit }, { translateY: lookY.value * limit }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry.gazeLimitPx]);

  // 100 spokes at 3.6° pitch, each slanted 0.6° so the fibre reads as
  // striation rather than a static sunburst. Reads irisRadius off its shared
  // value so the fibre grows and shrinks with the iris.
  const fibrePath = usePathValue((b) => {
    'worklet';
    const outer = irisRadius.value * FIBRE_OUTER;
    for (let i = 0; i < FIBRE_COUNT; i++) {
      const a = (i / FIBRE_COUNT) * Math.PI * 2;
      const a2 = a + (FIBRE_SLANT_DEG * Math.PI) / 180;
      b.moveTo(center, center);
      b.lineTo(center + outer * Math.cos(a2), center + outer * Math.sin(a2));
    }
  });

  // The knurl: 138 radial ticks in the outer 3.5px of the housing. Static —
  // nothing about the rim moves — but built the same way as the fibre so the
  // whole eye stays one construction.
  const knurlPath = usePathValue((b) => {
    'worklet';
    const outer = geometry.bezelRadius;
    const inner = outer - KNURL_DEPTH;
    for (let i = 0; i < KNURL_COUNT; i++) {
      const a = (i / KNURL_COUNT) * Math.PI * 2;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      b.moveTo(center + inner * cos, center + inner * sin);
      b.lineTo(center + outer * cos, center + outer * sin);
    }
  });

  // The lids are full-width bars with an 8% overhang; without this clip they
  // paint square slabs across the whole canvas and past the eye's silhouette.
  // In the design the same job is done by the socket's `overflow:hidden`.
  const socketClip = useMemo(
    () =>
      rrect(
        rect(
          center - geometry.socketRadius,
          center - geometry.socketRadius,
          geometry.socketDiameter,
          geometry.socketDiameter,
        ),
        geometry.socketRadius,
        geometry.socketRadius,
      ),
    [center, geometry.socketRadius, geometry.socketDiameter],
  );

  const lidLeft = -size * LID_OVERHANG;
  const lidWidth = size * (1 + LID_OVERHANG * 2);

  // A `90deg` ramp varies along x and a `0deg` one along y. The x form is
  // anchored to the lid's own left edge, which never moves; the y form to the
  // canvas, so the brushing belongs to the metal rather than sliding with the
  // shutter it is on.
  const grainStart = art.grainAxis === 'x' ? vec(lidLeft, 0) : vec(0, 0);
  const grainEnd =
    art.grainAxis === 'x' ? vec(lidLeft + art.grainPitch, 0) : vec(0, art.grainPitch);
  // The hard stop is the doubled position, and a clear stop at zero alpha keeps
  // black out of the ramp.
  const grainStops = [0, 1 / art.grainPitch, 1 / art.grainPitch, 1] as const;
  const grainClear = '#ffffff00';

  // farthest-corner: half the catchlight box's diagonal.
  const catchlightRadius = Math.hypot(size * CATCHLIGHT_W, size * CATCHLIGHT_H) / 2;

  return (
    <Pressable onPress={onPress} testID="optic">
      <Canvas style={{ width: size, height: size }}>
        {/* The glow that used to sit here is gone (2026-10-02). It was drawn
            at `bezelRadius + 30` into a canvas of `bezelRadius * 2`, so it was
            clipped by the canvas RECTANGLE while still at 28% strength, in a
            square whose four corners fell outside the circle. Against
            `#14130f` that was about 4% amber over near-black and nobody ever
            saw it; against the light theme's `#eceef0` it was a visible grey
            box around her eye.

            At this canvas size a visible halo is geometrically impossible: the
            opaque bezel and the canvas edge are both at `bezelRadius`, so
            there is no room between them for one. Restoring it means a 218²
            canvas with the eye centred in it and a negative margin to keep the
            layout box and the tap target at 158 — see
            `design/Theme Options.dc.html`, whose `inset:-30px` box and
            `transparent 58%` falloff are what it would be drawn from.

            `EMOTIONS[…].glow` is left in place: it is her per-state data and
            the design's own table, and it is what a restored halo would read.
            Nothing renders it today.

            1f's `0 10px 24px #2a333b38` — the housing's cast shadow — is
            dropped for exactly the same reason, and it is the only thing in
            that design this file declines. An outer shadow needs room outside
            `bezelRadius` and there is none. */}

        {/* 1. bezel — a flat ground in the dark, a brushed housing on the pale
            one, with a knurled rim and a hairline edge. */}
        <Circle cx={center} cy={center} r={geometry.bezelRadius} color={art.bezel}>
          {art.bezelSweep ? (
            <SweepGradient
              c={vec(center, center)}
              start={BEZEL_SWEEP_START}
              end={BEZEL_SWEEP_START + 360}
              colors={[...art.bezelSweep]}
            />
          ) : null}
          <Shadow dx={0} dy={1} blur={0} color={art.bezelSheen} inner />
        </Circle>
        {art.knurl ? (
          <Path
            path={knurlPath}
            style="stroke"
            strokeWidth={1}
            color={art.knurl}
            opacity={KNURL_ALPHA}
          />
        ) : null}
        {art.bezelEdge ? (
          <Circle
            cx={center}
            cy={center}
            r={geometry.bezelRadius - 0.5}
            style="stroke"
            strokeWidth={1}
            color={art.bezelEdge}
          />
        ) : null}

        {/* 2. socket — the gradient's centre sits high, at 50% 38% */}
        <Circle cx={center} cy={center} r={geometry.socketRadius}>
          <RadialGradient
            c={vec(center, size * SOCKET_CENTRE_Y)}
            r={geometry.socketRadius}
            colors={[...art.socket]}
            positions={[...art.socketStops]}
          />
          {art.socketShade ? (
            <Shadow dx={0} dy={2} blur={2.5} color={art.socketShade} inner />
          ) : null}
        </Circle>
        {art.socketEdge ? (
          <Circle
            cx={center}
            cy={center}
            r={geometry.socketRadius - 0.5}
            style="stroke"
            strokeWidth={1}
            color={art.socketEdge}
          />
        ) : null}

        {/* 3. iris rings */}
        <Circle
          cx={center}
          cy={center}
          r={geometry.socketRadius * art.ringRadii[0]}
          style="stroke"
          strokeWidth={1}
          color={art.ringInk ?? irisColor}
          opacity={art.ringAlphas[0]}
        />
        <Circle
          cx={center}
          cy={center}
          r={geometry.socketRadius * art.ringRadii[1]}
          style="stroke"
          strokeWidth={1}
          color={art.ringInk ?? irisColor}
          opacity={art.ringAlphas[1]}
        />

        {/* 4. gaze group — iris, fibre, core */}
        <Group transform={gazeTransform} origin={vec(center, center)}>
         <Group transform={dartTransform} origin={vec(center, center)}>
          <Circle cx={center} cy={center} r={irisRadius}>
            <RadialGradient
              c={vec(
                center - geometry.irisRadius * (1 - IRIS_CENTRE[0] * 2),
                center - geometry.irisRadius * (1 - IRIS_CENTRE[1] * 2),
              )}
              r={irisRadius}
              colors={irisGradientColors}
              positions={[...art.irisStops]}
            />
          </Circle>

          <Group opacity={FIBRE_GROUP_OPACITY}>
            <Path path={fibrePath} style="stroke" strokeWidth={1} color={accent} opacity={art.fibreAlpha} />
          </Group>

          {/* 1f's inset ring, a second turn of machining inside the iris */}
          {art.innerRing !== null ? (
            <Circle
              cx={center}
              cy={center}
              r={innerRingRadius}
              style="stroke"
              strokeWidth={1}
              color={accent}
              opacity={art.innerRing}
            />
          ) : null}

          {/* the ring around the iris — full strength in the design; `--seam`
              belongs to the lid edge, not here. */}
          <Circle
            cx={center}
            cy={center}
            r={irisRadius}
            style="stroke"
            strokeWidth={1.5}
            color={accent}
          />

          <Circle cx={center} cy={center} r={pupilRadius} color={art.pupil}>
            {art.pupilGlow !== null ? (
              <Shadow dx={0} dy={0} blur={art.pupilGlow} color={irisColor} />
            ) : (
              <Shadow dx={0} dy={1} blur={0.5} color={art.pupilSheen} inner />
            )}
          </Circle>
         </Group>
        </Group>

        {/* 5. catchlight — an ellipse, hidden when dead (dormant) */}
        {geometry.showCatchlight ? (
          <Oval
            rect={rect(
              size * CATCHLIGHT_LEFT,
              size * CATCHLIGHT_TOP,
              size * CATCHLIGHT_W,
              size * CATCHLIGHT_H,
            )}
          >
            <RadialGradient
              c={vec(
                size * (CATCHLIGHT_LEFT + CATCHLIGHT_W / 2),
                size * (CATCHLIGHT_TOP + CATCHLIGHT_H / 2),
              )}
              r={catchlightRadius}
              colors={[art.catchCore, CATCHLIGHT_EDGE]}
              positions={[0, art.catchStop]}
            />
            <Blur blur={art.catchBlur} />
          </Oval>
        ) : null}

        {/* 6. lids — gradient bodies, an iris-coloured seam on the leading
            edge, and the grain over the top. Clipped to the socket. */}
        <Group clip={socketClip}>
          <Rect x={lidLeft} y={geometry.socketTop} width={lidWidth} height={topLid}>
            <LinearGradient
              start={vec(0, geometry.socketTop)}
              end={topLidEnd}
              colors={[...art.lidTop]}
              positions={[...art.lidTopStops]}
            />
            <Shadow
              dx={0}
              dy={LID_SHADOW_DY}
              blur={art.lidShadowBlur}
              color={art.lidShadowColour}
            />
          </Rect>
          {/* the grain, over the body — the first background layer in CSS */}
          <Rect x={lidLeft} y={geometry.socketTop} width={lidWidth} height={topLid}>
            <LinearGradient
              start={grainStart}
              end={grainEnd}
              colors={[art.grainTop, art.grainTop, grainClear, grainClear]}
              positions={[...grainStops]}
              mode="repeat"
            />
          </Rect>

          {/* the seam: `border-bottom: 1px solid color-mix(iris, --seam)` */}
          <Rect
            x={lidLeft}
            y={seamY}
            width={lidWidth}
            height={1}
            color={accent}
            opacity={art.seamAlpha ?? geometry.seamAlpha}
          />

          <Rect x={lidLeft} y={lowerLidY} width={lidWidth} height={lowerLid}>
            <LinearGradient
              start={lowerLidStart}
              end={vec(0, geometry.socketBottom)}
              colors={[...art.lidBottom]}
              positions={[...art.lidBottomStops]}
            />
          </Rect>
          {/* the lower lid's own grain, a shade fainter than the upper's */}
          <Rect x={lidLeft} y={lowerLidY} width={lidWidth} height={lowerLid}>
            <LinearGradient
              start={grainStart}
              end={grainEnd}
              colors={[art.grainBottom, art.grainBottom, grainClear, grainClear]}
              positions={[...grainStops]}
              mode="repeat"
            />
          </Rect>
          {/* `border-top: 1px solid color-mix(iris, --seamb)` */}
          <Rect
            x={lidLeft}
            y={lowerLidY}
            width={lidWidth}
            height={1}
            color={accent}
            opacity={art.seamBAlpha ?? geometry.seamBAlpha}
          />
        </Group>

        {/* 7. wake bloom — a single scale+fade burst, not a loop */}
        {waking ? (
          <Group transform={wakeTransform} origin={vec(center, center)} opacity={wakeOpacity}>
            <Circle cx={center} cy={center} r={geometry.bezelRadius}>
              <RadialGradient c={vec(center, center)} r={geometry.bezelRadius} colors={wakeColors} />
            </Circle>
          </Group>
        ) : null}
      </Canvas>
    </Pressable>
  );
}
