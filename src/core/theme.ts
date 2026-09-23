import type { Lang } from './i18n';

// Every value verbatim from the design doc's 4a markup. Do not tweak.
//
// THE HOVER RULE. The prototype is a web page and states several controls
// twice: a resting colour and a `style-hover` one. A touch screen has no
// hover, so the resting value is all anyone would ever see and the design's
// intent — this is pressable, this one is destructive — never arrives. Every
// such pair below is resolved to the HOVER value, which is the state the
// design meant you to read the control in.
export const palette = {
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
  // the amber button skin: wash + edge, both at their hover strength
  amberWash: '#f4b43a1f', // hover of #f4b43a12
  amberEdge: '#f4b43a88', // hover of #f4b43a44
  amberEdgeSoft: '#f4b43a66', // hover of the SEND button's #35322a
  danger: '#ff4a3d',
  dangerSoft: '#ff6a5a',
  sealed: '#9d8757',

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
} as const;

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
