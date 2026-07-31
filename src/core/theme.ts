import type { Lang } from './i18n';

// Every value verbatim from the design doc's 4a markup. Do not tweak.
export const palette = {
  // the shell — her stage and the views behind it
  bg: '#14130f',
  bgDeep: '#131210',
  bgFile: '#100f0d',
  panel: '#1a1913',
  panelAlt: '#17161a',
  border: '#2c2a22',
  borderSoft: '#221f18',
  borderFaint: '#232118',
  hairline: '#35322a',
  text: '#f2e7d3',
  textDim: '#8a8578',
  textMuted: '#a8a29a',
  textFaint: '#57534a',
  textGhost: '#4a4740',
  textGhostest: '#3a372c',
  amber: '#f4b43a',
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

export const serifItalic = 'InstrumentSerif_400Regular_Italic';
