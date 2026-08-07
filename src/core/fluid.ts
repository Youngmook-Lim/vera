import type { Lang } from './i18n';
import { ms } from './theme';

export interface FluidStep {
  fontSize: number;
  lineHeight: number;
}

// Overflow is absorbed by typography rather than scrolling: a short line gets
// to be loud, a long one shrinks to fit. Korean runs 12% smaller with looser
// leading because Nanum Myeongjo's hangul sits optically larger than
// Instrument Serif's latin at the same px (design doc, turn 5f).
const LADDERS: Record<Lang, readonly (readonly [number, number])[]> = {
  en: [
    [30, 1.32],
    [26, 1.38],
    [21, 1.44],
    [18, 1.5],
    [15, 1.56],
  ],
  ko: [
    [26, 1.46],
    [23, 1.5],
    [19, 1.56],
    [16, 1.62],
    [14, 1.68],
  ],
};

const BOUNDARIES = [8, 14, 22, 32] as const;

export const fluid = (line: string, lang: Lang): FluidStep => {
  const trimmed = String(line ?? '').trim();
  const count = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  const rung = BOUNDARIES.findIndex((max) => count <= max);
  const [size, leading] = LADDERS[lang][rung === -1 ? BOUNDARIES.length : rung];
  const fontSize = ms(size);
  return { fontSize, lineHeight: fontSize * leading };
};
