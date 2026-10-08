import type { Theme } from '../core/theme';

// What the eye is MADE of, per ground — and nothing about how it moves, which
// is all opticGeometry.ts. Its own module, with no runtime imports, for the
// same reason `src/core/faces.json` is one: two readers. `Optic.tsx` draws the
// live eye from it, and `tools/build-icons.mjs` draws the launcher faces from
// it under plain Node, so the icon and the eye cannot drift apart.

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
export interface OpticArt {
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

export const ART: Record<Theme, OpticArt> = {
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
