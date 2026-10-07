import type { Lang } from './i18n';

// Every value verbatim from the design doc's 4a markup. Do not tweak.
//
// THE HOVER RULE. The prototype is a web page and states several controls
// twice: a resting colour and a `style-hover` one. A touch screen has no
// hover, so the resting value is all anyone would ever see and the design's
// intent — this is pressable, this one is destructive — never arrives. Every
// such pair below is resolved to the HOVER value, which is the state the
// design meant you to read the control in.
export type Theme = 'dark' | 'light';

interface ModeSkin {
  ink: string;
  wash: string;
  edge: string;
}

interface RoomInk {
  bg: string;
  card: string;
  cardBorder: string;
  rule: string;
  ink: string;
  inkSoft: string;
  inkDim: string;
  inkGhost: string;
}

// One shape, two values. `palettes.test.ts` compares the two recursively, so a
// token added here and filled in on only one side fails the suite rather than
// rendering as `undefined` on a device.
export interface Palette {
  bg: string;
  bgDeep: string;
  bgFile: string;
  iconBg: string;
  panel: string;
  panelAlt: string;
  border: string;
  borderSoft: string;
  borderFaint: string;
  borderPill: string;
  borderLift: string;
  hairline: string;
  hairlineDim: string;
  text: string;
  textSoft: string;
  textDim: string;
  textMuted: string;
  textPill: string;
  textFaint: string;
  textGhost: string;
  textGhostest: string;
  amber: string;
  amberText: string;
  amberWash: string;
  amberEdge: string;
  amberEdgeSoft: string;
  danger: string;
  dangerSoft: string;
  dangerWash: string;
  dangerEdge: string;
  sealed: string;
  scrim: string;
  scrimStrong: string;
  sheet: string;
  youBg: string;
  emptyNum: string;
  footer: string;
  // The two register ids are spelled out rather than imported from vera/modes,
  // for the reason the comment on `mode` below gives: every hex in the app
  // stays greppable in this one file. A third register is a key here.
  mode: Record<'default' | 'supportive', ModeSkin>;
  advice: RoomInk;
  notes: RoomInk;
  horror: RoomInk & { redaction: string };
  organism: {
    bg: string;
    card: string;
    cardBorder: string;
    well: string;
    wellBorder: string;
    ink: string;
    inkDim: string;
    label: string;
    text: string;
    textBright: string;
    green: string;
    hungry: string;
  };
}

export const DARK: Palette = {
  // the shell — her stage and the views behind it
  bg: '#14130f',
  bgDeep: '#131210',
  bgFile: '#100f0d',
  // The adaptive icon's ground, and so the splash's — ICONS.md, and the native
  // splash's own backgroundColor in app.json. Deliberately not `bg`: the splash
  // is the icon enlarged, not a screen of the app, and the two must agree
  // across the handover or the seam shows.
  iconBg: '#131011',
  panel: '#1a1913',
  panelAlt: '#17161a',
  border: '#2c2a22',
  borderSoft: '#221f18',
  borderFaint: '#232118',
  borderPill: '#3d382b', // hover of #262319
  borderLift: '#4a4740', // hover of #2c2a22, on the ACCESS cancel button
  hairline: '#35322a',
  hairlineDim: '#6c6656',
  text: '#f2e7d3',
  textSoft: '#c9c1b2',
  textDim: '#8a8578',
  textMuted: '#a8a29a',
  textPill: '#a89f8c',
  textFaint: '#57534a',
  textGhost: '#4a4740',
  textGhostest: '#3a372c',
  amber: '#f4b43a',
  // Amber used as TYPE. In dark it is amber; the light palette darkens it,
  // which is the whole of the design's "Amber is darkened for type on light
  // grounds so it holds contrast; her iris keeps its hue."
  amberText: '#f4b43a',
  // the amber button skin: wash + edge, both at their hover strength
  amberWash: '#f4b43a1f', // hover of #f4b43a12
  amberEdge: '#f4b43a88', // hover of #f4b43a44
  amberEdgeSoft: '#f4b43a66', // hover of the SEND button's #35322a
  danger: '#ff4a3d',
  dangerSoft: '#ff6a5a',
  // The destructive chip's skin, on the amber button's idiom: a wash inside an
  // edge. Spelled out in LogScreen and FileScreen until the theme needed them.
  dangerWash: '#ff4a3d10',
  dangerEdge: '#ff4a3d55',
  sealed: '#9d8757',

  // Four surfaces that were raw literals until the theme needed them: the
  // cabinet's scrim, its sheet and its empty numerals, all three spelled out in
  // `Cabinet.tsx`, and the timestamp footer that `LogScreen`, `FileScreen` and
  // `SystemScreen` each wrote out separately.
  scrim: '#08080699',
  // The ACCESS panel's, which dims harder than the cabinet's: it is a modal
  // over the stage rather than a sheet in front of it. From `KeyPanel.tsx`.
  scrimStrong: '#080806cc',
  sheet: '#17171a',
  emptyNum: '#2b2820',
  footer: '#33302a',
  // The subject's own bubble in the LOG. It exists only inside that thread,
  // one notch further from the page than `panel` is, which is what makes it
  // read as a bubble rather than as the panel it sits on.
  youBg: '#1c1b17',

  // Her two registers, worn by the tag beside the wordmark and by each choice
  // in the picker. Each is the iris of the state that register is most often
  // in: calm's amber for the default, affectionate's rose for the supportive.
  // Kept here rather than in the ModeDef so that every hex in the app is still
  // in one file; a new mode adds a key here and a folder in vera/modes.
  // Three values each, on the SEND button's idiom: the ink, a wash to fill the
  // tag pill, and an edge to draw it. The wash is the ink at 12% and the edge
  // at 53%, written out rather than composed at render so that every hex in
  // the app is still greppable in this file.
  mode: {
    default: { ink: '#f4b43a', wash: '#f4b43a1f', edge: '#f4b43a88' },
    supportive: { ink: '#ef8f8a', wash: '#ef8f8a1f', edge: '#ef8f8a88' },
  },

  // module 01 — the terrarium owns every pixel inside its frame
  organism: {
    bg: '#0c110e',
    card: '#111a15',
    cardBorder: '#1e2a22',
    well: '#141d18',
    wellBorder: '#26362c',
    ink: '#6c9a80',
    inkDim: '#4a6b58',
    label: '#5c7a68',
    text: '#b8ccc0',
    textBright: '#e8f0ea',
    green: '#4fd08a',
    hungry: '#ff8a4a',
  },

  // module 02 — someone else's conclusions, filed. Her shell's register, but
  // its own ink: the exit and the fixed chrome are drawn in these. There is no
  // accent here on purpose — the room is lit in whatever SHE is wearing, so its
  // one live colour is `EMOTIONS[emotion].iris` and is read at render (see the
  // note in `modules/advice/index.tsx`). These are the values that hold still.
  // The horror room. Warmer in the shadows than the advice room's neutral
  // greys — the same darkness with blood left in it — and one colour the
  // advice room has no use for: the bar that stands in for a withheld second
  // sentence.
  // Module 03. Quiet and cool — the lane the warm advice room and the
  // near-black horror room leave open. A note you wrote to yourself should
  // not look like a warning. The accent is read from her emotion at render,
  // as both rooms' are.
  notes: {
    bg: '#0b0d0f',
    card: '#111417',
    cardBorder: '#1e242a',
    rule: '#191e23',
    ink: '#dde4ea',
    inkSoft: '#8d979f',
    inkDim: '#5d666d',
    inkGhost: '#394147',
  },
  horror: {
    bg: '#0a0909',
    card: '#121011',
    cardBorder: '#231e1f',
    rule: '#1b1718',
    ink: '#e6e0de',
    inkSoft: '#948c8a',
    inkDim: '#655e5d',
    inkGhost: '#413b3a',
    redaction: '#241f20',
  },
  advice: {
    bg: '#0f0f11',
    card: '#16161a',
    cardBorder: '#24242a',
    rule: '#1e1e23',
    ink: '#e9e6df',
    inkSoft: '#9a968c',
    inkDim: '#6a675f',
    inkGhost: '#45433d',
  },
};

// `2e COOL CLINICAL` from `design/Theme Options.dc.html`, picked by
// `design/Vera Final.dc.html`. Forty of these are transcribed verbatim; the
// rest are DERIVED, which that file authorises in as many words — "Every token
// in theme.ts gets a light counterpart" — under the three rules in
// `docs/superpowers/specs/2026-09-29-light-theme-design.md` §3. Every derived
// token used as type is held to AA by `palettes.test.ts` rather than by eye.
export const LIGHT: Palette = {
  bg: '#eceef0',
  bgDeep: '#e8ebed',
  // Derived: continues `bg → bgDeep`'s own step (−4,−3,−3) one rung further.
  bgFile: '#e4e8ea',
  // NOT themed. `app.json` fixes the native splash's ground at build time and
  // cannot know what theme is stored, so the JS frame must agree with the
  // native one rather than flash twice.
  iconBg: '#131011',
  panel: '#e2e6e9',
  panelAlt: '#f7f8f9',
  border: '#cbd1d6',
  borderSoft: '#d7dce0',
  borderFaint: '#d3d8dd',
  borderPill: '#b6bec5',
  // Derived: sits between borderPill and hairlineDim, as it does in dark.
  borderLift: '#a4acb3',
  hairline: '#c4cbd1',
  hairlineDim: '#7d868e',
  text: '#15181b',
  // Derived: between text and textDim, at dark's own proportion.
  textSoft: '#33393f',
  textDim: '#5b636b',
  // Derived: between textSoft and textDim.
  textMuted: '#474e55',
  textPill: '#4d565e',
  textFaint: '#848c94',
  textGhost: '#99a1a8',
  textGhostest: '#8a929a',
  // Her iris keeps its hue; the type darkens. 5.48:1 on `bg`.
  amber: '#d6920f',
  amberText: '#855500',
  amberWash: '#d6920f1a',
  amberEdge: '#d6920f99',
  // Derived: the light amber at the dark edge-soft's own alpha.
  amberEdgeSoft: '#d6920f66',
  // Derived, and the reason the rule exists: dark's #ff4a3d is 2.87:1 here,
  // under AA for type — and it is the app's own voice, on every CLEAR, every
  // ERASE and every systemNotice. This is 4.82:1.
  danger: '#c62a1c',
  // Derived: kept as the more vivid of the pair, as in dark.
  dangerSoft: '#e04a38',
  // Derived: the light red at the dark pair's own alphas.
  dangerWash: '#c62a1c10',
  dangerEdge: '#c62a1c55',
  // Derived: type only, on the SEALED label. 5.96:1.
  sealed: '#6b5730',
  scrim: '#1a1f2440',
  // Derived: the same dim, harder, as in dark.
  scrimStrong: '#1a1f2466',
  sheet: '#f8f9fa',
  emptyNum: '#d0d5da',
  footer: '#a9b0b7',
  // Derived: one notch FURTHER from the page than `panel`, which on a pale
  // ground means darker where in dark it meant lighter. The relationship is
  // what matters — the bubble has to be the most-separated surface on the
  // screen, or it stops reading as a bubble.
  youBg: '#dce1e5',
  // Derived: each register's accent takes amber's own two steps — the hue for
  // fills, a darkened form for type. Supportive's rose darkens to #c8534b.
  mode: {
    default: { ink: '#855500', wash: '#d6920f1a', edge: '#d6920f99' },
    supportive: { ink: '#8f332d', wash: '#c8534b1a', edge: '#c8534b99' },
  },
  // The advice room's light half is complete in the design.
  advice: {
    bg: '#f2f3f5',
    card: '#fbfcfd',
    cardBorder: '#dfe3e7',
    rule: '#e5e8ec',
    ink: '#1a1d21',
    inkSoft: '#5f666e',
    inkDim: '#767d85',
    inkGhost: '#b0b6bc',
  },
  // Four given, four derived from the advice room's ladder and tinted cool —
  // "each room keeps its own tint so the cabinet still reads as windows into
  // different rooms."
  notes: {
    bg: '#eef2f5',
    card: '#eaeff3',
    cardBorder: '#d2dbe2',
    rule: '#e1e8ee',
    ink: '#18212a',
    inkSoft: '#5d686f',
    inkDim: '#77828c',
    inkGhost: '#a8b2bb',
  },
  // Four given, five derived, tinted warm — the same darkness with blood left
  // in it, inverted. `redaction` INVERTS: in dark it is a bar slightly lighter
  // than the card, so here it is slightly darker. A withheld sentence has to
  // read as a solid, never as a hole.
  horror: {
    bg: '#f0eded',
    card: '#f2eeee',
    cardBorder: '#e0d8d8',
    rule: '#e9e1e0',
    ink: '#261f20',
    inkSoft: '#6b5f5f',
    inkDim: '#837777',
    inkGhost: '#b1a7a7',
    redaction: '#ded4d4',
  },
  // NOT themed. Off the registry since 2026-09-07 and unreachable, so reviving
  // the room means authoring its light half — a better line to leave than
  // twelve invented greens for a room nobody can open.
  organism: DARK.organism,
};

export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT };

// Both sheets, built ONCE at import and indexed at render. Not memoised per
// render: styles stay static, which several comments in this repo lean on,
// there is no frame on which a style object is a new identity, and the cost is
// nineteen small objects built twice at boot and never again.
export const themed = <T,>(make: (p: Palette) => T): Record<Theme, T> => ({
  dark: make(DARK),
  light: make(LIGHT),
});

// Her nine states keep their hues in both themes — the design's "her iris keeps
// its hue" — which is right for a dot and wrong for 9px type on a pale strip,
// where AMUSED's yellow is 1.10:1. The design asks for
// `color-mix(in srgb, iris 52%, #000)`; RN has no color-mix, so this is it, a
// linear sRGB mix toward black, which is what color-mix does in that space.
//
// 45%, not the design's 52%, and this is the one deliberate numeric departure
// from it. At 52% AMUSED lands at 3.82:1 — under AA, and it is the exact state
// the design's own prose names as the case to check. 47% is the first fraction
// that clears it, and does so at 4.50:1 exactly, which rounding could tip; 45%
// clears all eight waking states with room and is not a visibly different
// choice. `palettes.test.ts` holds every state to the number.
export const LIGHT_MIX = 0.45;

export const onLight = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `#${[16, 8, 0]
    .map((shift) => Math.round(((n >> shift) & 0xff) * LIGHT_MIX))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

// Her iris where it is used as TYPE. Objects — the pulse dots and the slider's
// ring — take the raw iris in both themes. The optic takes both: its iris is
// filled from the raw hue, and everything DRAWN in her colour there (the iris
// ring, the fibre, the lid seams) is darkened on the pale ground for the same
// reason type is. See ART in `Optic.tsx`.
export const emotionText = (iris: string, theme: Theme): string =>
  theme === 'light' ? onLight(iris) : iris;

// The 388px mock maps ~1:1 to device dp for layout, but type scales ×1.1.
// Use for font sizes only.
export const ms = (px: number) => Math.round(px * 1.1 * 2) / 2;

const display = {
  500: 'SpaceGrotesk_500Medium',
  600: 'SpaceGrotesk_600SemiBold',
  700: 'SpaceGrotesk_700Bold',
} as const;
const mono = {
  500: 'IBMPlexMono_500Medium',
  600: 'IBMPlexMono_600SemiBold',
  700: 'IBMPlexMono_600SemiBold',
} as const;
const hangul = {
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
} as const;

export type FontWeight = 500 | 600 | 700;

// RN has no CSS fallback chains, so localized text passes lang and Korean
// renders entirely in Pretendard (its latin glyphs are fine). Pure-ASCII
// telemetry omits lang and stays Plex Mono.
export const font = (role: 'display' | 'mono', weight: FontWeight, lang: Lang = 'en'): string =>
  lang === 'ko' ? hangul[weight] : role === 'display' ? display[weight] : mono[weight];

// Hers, and the book's. A machine that speaks in typeset serif is more
// unsettling than one that speaks in a UI font (design doc, turn 2) — and a
// page of quotations is the one other thing that earns the face, so Module 02
// sets its cards in it too. The cards are English whatever the interface is
// set to, so they call this with no lang and stay Instrument Serif, the same
// rule the pure-ASCII telemetry follows above.
export const serif = (lang: Lang = 'en'): string =>
  lang === 'ko' ? 'NanumMyeongjo_400Regular' : 'InstrumentSerif_400Regular';

// And the one size her voice is set at. It used to be a ladder — a short line
// loud, a long one shrunk to fit (`fluid.ts`, now gone) — because her words sat
// loose on the stage with nothing around them and only their own size to give
// them weight. In 3a they live inside a bordered window, and a size that moved
// under her fought the frame it was in.
//
// It began as the ladder's old bottom rung — the size her longest replies were
// already being set at — which read small in English once the window had grown
// around it, so latin is up one to 16 (2026-09-16). SOUL.md holds her under 30
// words, which at this size is still about eight lines of the window's body, so
// a reply arrives whole and the ScrollView behind it never has to move.
//
// Korean stays at 14 with looser leading, for the reason the ladder carried two
// of everything: Nanum Myeongjo's hangul sits optically larger than Instrument
// Serif's latin at the same px (design doc, turn 5f). The note here has always
// said hangul is set about 12% smaller, and at 15 against 14 it was only 6.7% —
// so raising latin is what finally makes that true rather than aspirational.
export const voice = (lang: Lang = 'en'): { fontSize: number; lineHeight: number } => {
  const [size, leading] = lang === 'ko' ? [14, 1.68] : [16, 1.56];
  const fontSize = ms(size);
  return { fontSize, lineHeight: fontSize * leading };
};

// The attribution under a card, and nothing else now that the identity page is
// gone. Instrument Serif Italic carries no hangul, so anything Korean set in it
// falls back to whatever the system offers; Nanum Myeongjo has no true italic,
// and its upright form is the correct Korean answer rather than a compromise.
export const serifItalic = (lang: Lang = 'en'): string =>
  lang === 'ko' ? 'NanumMyeongjo_400Regular' : 'InstrumentSerif_400Regular_Italic';
