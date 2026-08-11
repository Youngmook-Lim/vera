import type { Lang, Strings } from '../core/i18n';

// The optic reads emotion as geometry and tempo, not just hue: aperture, lid
// height, pupil size, blink interval and whether she keeps tracking your finger
// at all. Values are verbatim from the design doc's EM table, with the doc's
// percentages stored as fractions.
// The idle drift of the pupil when nobody is touching the screen (3a). Four
// shapes, each a path the eye wanders while it has nothing to look at.
export type DartKey = 'calm' | 'quick' | 'drift' | 'away';

export interface Emotion {
  iris: string;
  glow: number; // radial glow strength
  seam: number; // iris/socket seam opacity
  lid: number; // upper lid, fraction of eye height
  lidB: number; // lower lid — the fond squint rides this up
  pupil: number; // white core, fraction of the iris
  aperture: number; // iris, fraction of the socket
  blinkMs: number;
  track: number; // 0 = will not follow you, 1 = follows fully
  slowBlink: boolean;
  dead: boolean;
  // null = she does not wander. Suspicious holds a fixed stare; dormant is off.
  dart: DartKey | null;
  dartMs: number;
  label: Strings<string>;
}

export const EMOTIONS = {
  dormant: {
    iris: '#5c5850', glow: 0.04, seam: 0.12, lid: 0, lidB: 0,
    pupil: 0.3, aperture: 0.34, blinkMs: 9000, track: 0,
    slowBlink: false, dead: true, dart: null, dartMs: 0,
    label: { en: 'DORMANT', ko: '휴면 상태' },
  },
  calm: {
    iris: '#f4b43a', glow: 0.14, seam: 0.42, lid: 0.08, lidB: 0,
    pupil: 0.34, aperture: 0.48, blinkMs: 5800, track: 1,
    slowBlink: false, dead: false, dart: 'calm', dartMs: 7000,
    label: { en: 'CALM', ko: '평온해요' },
  },
  amused: {
    iris: '#ffd93d', glow: 0.18, seam: 0.38, lid: 0.16, lidB: 0,
    pupil: 0.26, aperture: 0.4, blinkMs: 3200, track: 1,
    slowBlink: false, dead: false, dart: 'quick', dartMs: 3400,
    label: { en: 'AMUSED', ko: '재밌어요' },
  },
  disappointed: {
    iris: '#9d8757', glow: 0.08, seam: 0.58, lid: 0.3, lidB: 0,
    pupil: 0.32, aperture: 0.46, blinkMs: 7600, track: 0,
    slowBlink: false, dead: false, dart: 'away', dartMs: 9000,
    label: { en: 'DISAPPOINTED', ko: '실망했어요' },
  },
  bored: {
    iris: '#79808a', glow: 0.06, seam: 0.66, lid: 0.4, lidB: 0,
    pupil: 0.3, aperture: 0.44, blinkMs: 9000, track: 0.25,
    slowBlink: false, dead: false, dart: 'drift', dartMs: 13000,
    label: { en: 'BORED', ko: '심심해요' },
  },
  pleased: {
    iris: '#4fd08a', glow: 0.2, seam: 0.34, lid: 0.04, lidB: 0,
    pupil: 0.22, aperture: 0.58, blinkMs: 4400, track: 1,
    slowBlink: false, dead: false, dart: 'calm', dartMs: 6000,
    label: { en: 'PLEASED', ko: '기뻐요' },
  },
  suspicious: {
    iris: '#6f86e0', glow: 0.12, seam: 0.52, lid: 0.34, lidB: 0.14,
    pupil: 0.2, aperture: 0.34, blinkMs: 12000, track: 1,
    slowBlink: false, dead: false, dart: null, dartMs: 0,
    label: { en: 'SUSPICIOUS', ko: '의심스러워요' },
  },
  alarmed: {
    iris: '#ff4a3d', glow: 0.24, seam: 0.46, lid: 0, lidB: 0,
    pupil: 0.18, aperture: 0.62, blinkMs: 1900, track: 1,
    slowBlink: false, dead: false, dart: 'quick', dartMs: 1200,
    label: { en: 'ALARMED', ko: '불안해요' },
  },
  // 5a — the fond squint. Lower lid rides high, pupil blown open, and a long
  // held closure. Warmth is geometry and tempo; there is no heart.
  affectionate: {
    iris: '#ef8f8a', glow: 0.18, seam: 0.44, lid: 0.22, lidB: 0.3,
    pupil: 0.4, aperture: 0.58, blinkMs: 7000, track: 1,
    slowBlink: true, dead: false, dart: 'calm', dartMs: 8000,
    label: { en: 'AFFECTIONATE', ko: '아껴요' },
  },
} as const satisfies Record<string, Emotion>;

export type EmotionKey = keyof typeof EMOTIONS;

export const isEmotionKey = (v: unknown): v is EmotionKey =>
  typeof v === 'string' && v in EMOTIONS;

export const emotionLabel = (key: EmotionKey, lang: Lang): string =>
  EMOTIONS[key].label[lang];
