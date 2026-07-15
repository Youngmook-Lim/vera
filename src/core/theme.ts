import type { Lang } from './i18n';

// Design tokens from design/README.md — final design intent, do not tweak.
export const palette = {
  // dark surfaces (V.E.R.A.'s domain)
  dark: {
    bg: '#14130f',
    bgAlt: '#17171a',
    card: '#1c1b17',
    cardHeader: '#201f1b',
    border: '#2c2a22',
    incineratorBg: '#120d0a',
    hazardBg: '#131011',
    fieldBg: '#0c1012',
    trayBg: '#131211',
    text: '#f2e7d3',
    textDim: '#8a8578',
    textFaint: '#77726a',
  },
  // light enamel (bureaucracy)
  light: {
    bg: '#ecebe4',
    card: '#faf9f6',
    cardAlt: '#f4f3ee',
    border: '#e4e1d7',
    borderStrong: '#dcd9cf',
    ink: '#17171a',
    inkSoft: '#3f3d37',
    textDim: '#8a8578',
    textFaint: '#b3aea1',
    vitrineBg: '#e7e5dd',
    vitrineBorder: '#c7c3b6',
    vitrineText: '#a49f92',
  },
  accent: {
    amber: '#f4b43a',
    orange: '#ff6a1a',
    red: '#d63a2a',
    redBright: '#ff5a48',
    green: '#4fd08a',
    blue: '#2f6fff',
    cyan: '#38c8c8',
    cyanBright: '#38f0e0',
  },
} as const;

// Tile tag pills on the facility grid (text / border / background per accent).
export const tagSchemes = {
  amber: { text: '#c98a17', border: '#f4b43a66', bg: '#f4b43a1c' },
  orange: { text: '#c2571a', border: '#ff6a1a66', bg: '#ff6a1a1c' },
  red: { text: '#c0281a', border: '#d63a2a66', bg: '#d63a2a1a' },
  blue: { text: '#2f6fff', border: '#2f6fff66', bg: '#2f6fff14' },
  green: { text: '#2c9a63', border: '#4fd08a88', bg: '#4fd08a22' },
} as const;
export type TagScheme = keyof typeof tagSchemes;

// The 388px mock maps ~1:1 to device dp for layout, but type scales ×1.1
// (design/README.md "Label style"). Use for font sizes only.
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

// RN has no CSS-style fallback chains, so localized text passes lang and
// Korean renders entirely in Pretendard (its Latin glyphs are fine).
// Pure-ASCII telemetry (timestamps, ids) omits lang and stays Plex Mono.
export const font = (role: 'display' | 'mono', weight: FontWeight, lang: Lang = 'en'): string =>
  lang === 'ko' ? hangul[weight] : role === 'display' ? display[weight] : mono[weight];
