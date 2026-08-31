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

  // module 02 — bone paper, one ink, none of her vocabulary
  identity: {
    paper: '#efe7d7',
    rule: '#dbd2be',
    ink: '#1c1a15',
    inkSoft: '#6b6455',
    inkFaint: '#9a917d',
    inkPressed: '#4a4438', // hover of the line-remove glyph's #8a7f68
    inkGhost: '#b3aa95',
    tileBorder: '#d6cdb9',
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

// Her voice, and only her voice. A machine that speaks in typeset serif is
// more unsettling than one that speaks in a UI font (design doc, turn 2).
export const serif = (lang: Lang = 'en'): string =>
  lang === 'ko' ? 'NanumMyeongjo_400Regular' : 'InstrumentSerif_400Regular';

// And the one size her voice is set at. It used to be a ladder — a short line
// loud, a long one shrunk to fit (`fluid.ts`, now gone) — because her words sat
// loose on the stage with nothing around them and only their own size to give
// them weight. In 3a they live inside a bordered window, and a size that moved
// under her fought the frame it was in.
//
// This is the ladder's old bottom rung: the size her longest replies were
// already being set at. SOUL.md holds her under 30 words, which at this size is
// about eight lines of the window's body — so a reply arrives whole and the
// ScrollView behind it never has to move. Korean is 12% smaller with looser
// leading, for the same reason the ladder carried two of everything: Nanum
// Myeongjo's hangul sits optically larger than Instrument Serif's latin at the
// same px (design doc, turn 5f).
export const voice = (lang: Lang = 'en'): { fontSize: number; lineHeight: number } => {
  const [size, leading] = lang === 'ko' ? [14, 1.68] : [15, 1.56];
  const fontSize = ms(size);
  return { fontSize, lineHeight: fontSize * leading };
};

// Module 02's title ink. Instrument Serif Italic carries no hangul, so a
// Korean title set in it falls back to whatever the system offers — on the one
// page whose whole premise is a single deliberate ink. Nanum Myeongjo has no
// true italic; its upright form is the correct Korean answer, not a compromise.
export const serifItalic = (lang: Lang = 'en'): string =>
  lang === 'ko' ? 'NanumMyeongjo_400Regular' : 'InstrumentSerif_400Regular_Italic';
