import {
  EMOTIONS, WAKING_EMOTIONS, emotionLabel, isEmotionKey, isWakingEmotion, type EmotionKey,
} from '../emotions';

// Exhaustive expected values transcribed independently from the design spec.
// This is the backstop test — it catches regressions in any field of any state.
const EXPECTED_GEOMETRY = {
  dormant: { iris: '#5c5850', glow: 0.04, seam: 0.12, lid: 0, lidB: 0, pupil: 0.3, aperture: 0.34, blinkMs: 9000, track: 0, slowBlink: false, dead: true },
  calm: { iris: '#f4b43a', glow: 0.14, seam: 0.42, lid: 0.08, lidB: 0, pupil: 0.34, aperture: 0.48, blinkMs: 5800, track: 1, slowBlink: false, dead: false },
  amused: { iris: '#ffd93d', glow: 0.18, seam: 0.38, lid: 0.16, lidB: 0, pupil: 0.26, aperture: 0.4, blinkMs: 3200, track: 1, slowBlink: false, dead: false },
  disappointed: { iris: '#9d8757', glow: 0.08, seam: 0.58, lid: 0.3, lidB: 0, pupil: 0.32, aperture: 0.46, blinkMs: 7600, track: 0, slowBlink: false, dead: false },
  bored: { iris: '#79808a', glow: 0.06, seam: 0.66, lid: 0.4, lidB: 0, pupil: 0.3, aperture: 0.44, blinkMs: 9000, track: 0.25, slowBlink: false, dead: false },
  pleased: { iris: '#4fd08a', glow: 0.2, seam: 0.34, lid: 0.04, lidB: 0, pupil: 0.22, aperture: 0.58, blinkMs: 4400, track: 1, slowBlink: false, dead: false },
  suspicious: { iris: '#6f86e0', glow: 0.12, seam: 0.52, lid: 0.34, lidB: 0.14, pupil: 0.2, aperture: 0.34, blinkMs: 12000, track: 1, slowBlink: false, dead: false },
  alarmed: { iris: '#ff4a3d', glow: 0.24, seam: 0.46, lid: 0, lidB: 0, pupil: 0.18, aperture: 0.62, blinkMs: 1900, track: 1, slowBlink: false, dead: false },
  affectionate: { iris: '#ef8f8a', glow: 0.18, seam: 0.44, lid: 0.22, lidB: 0.3, pupil: 0.4, aperture: 0.58, blinkMs: 7000, track: 1, slowBlink: true, dead: false },
} as const;

const EXPECTED_LABELS = {
  dormant: { en: 'DORMANT', ko: '휴면 상태' },
  calm: { en: 'CALM', ko: '평온해요' },
  amused: { en: 'AMUSED', ko: '재밌어요' },
  disappointed: { en: 'DISAPPOINTED', ko: '실망했어요' },
  bored: { en: 'BORED', ko: '심심해요' },
  pleased: { en: 'PLEASED', ko: '기뻐요' },
  suspicious: { en: 'SUSPICIOUS', ko: '의심스러워요' },
  alarmed: { en: 'ALARMED', ko: '불안해요' },
  affectionate: { en: 'AFFECTIONATE', ko: '아껴요' },
} as const;

describe('EMOTIONS', () => {
  it('holds the eight live states plus dormant', () => {
    expect(Object.keys(EMOTIONS)).toHaveLength(9);
    expect(EMOTIONS.dormant).toBeDefined();
  });

  it('carries the doc values for calm', () => {
    expect(EMOTIONS.calm).toMatchObject({
      iris: '#f4b43a',
      glow: 0.14,
      seam: 0.42,
      lid: 0.08,
      lidB: 0,
      pupil: 0.34,
      aperture: 0.48,
      blinkMs: 5800,
      track: 1,
    });
  });

  it('makes affectionate the fond squint — raised lower lid, wide pupil, slow blink', () => {
    expect(EMOTIONS.affectionate.lidB).toBe(0.3);
    expect(EMOTIONS.affectionate.pupil).toBe(0.4);
    expect(EMOTIONS.affectionate.slowBlink).toBe(true);
    expect(EMOTIONS.affectionate.iris).toBe('#ef8f8a');
  });

  it('switches her colour vocabulary off entirely when dormant', () => {
    expect(EMOTIONS.dormant.dead).toBe(true);
    expect(EMOTIONS.dormant.iris).toBe('#5c5850');
    expect(EMOTIONS.dormant.track).toBe(0);
  });

  it('stops disappointed from following you, and lets bored follow a quarter way', () => {
    expect(EMOTIONS.disappointed.track).toBe(0);
    expect(EMOTIONS.bored.track).toBe(0.25);
  });

  it('gives every state a label in both languages', () => {
    for (const [key, emotion] of Object.entries(EMOTIONS)) {
      expect(emotion.label.en).toBeTruthy();
      expect(emotion.label.ko).toBeTruthy();
      expect(emotion.label.en).toBe(emotion.label.en.toUpperCase());
      expect(key).toBeTruthy();
    }
  });

  it('matches the design table in every geometric field of every state', () => {
    for (const [key, expected] of Object.entries(EXPECTED_GEOMETRY)) {
      expect(EMOTIONS[key as EmotionKey]).toMatchObject(expected);
    }
  });

  it('covers every state in the design table (regression if a tenth is added)', () => {
    expect(Object.keys(EXPECTED_GEOMETRY).sort()).toEqual(Object.keys(EMOTIONS).sort());
  });

  it('carries exact bilingual labels for all states', () => {
    for (const [key, expected] of Object.entries(EXPECTED_LABELS)) {
      expect(EMOTIONS[key as EmotionKey].label).toEqual(expected);
    }
  });
});

describe('isEmotionKey', () => {
  it('accepts a real key and rejects anything else', () => {
    expect(isEmotionKey('alarmed')).toBe(true);
    expect(isEmotionKey('smug')).toBe(false);
    expect(isEmotionKey(null)).toBe(false);
    expect(isEmotionKey(7)).toBe(false);
  });
});

describe('emotionLabel', () => {
  it('answers in the reading language', () => {
    expect(emotionLabel('pleased', 'en')).toBe('PLEASED');
    expect(emotionLabel('pleased', 'ko')).toBe('기뻐요');
  });
});

describe('the waking states', () => {
  it('are every state but dormant, in the table’s order', () => {
    expect(WAKING_EMOTIONS).toEqual(Object.keys(EMOTIONS).filter((k) => k !== 'dormant'));
  });

  it('recognise a waking state and nothing else', () => {
    expect(isWakingEmotion('pleased')).toBe(true);
    expect(isWakingEmotion('dormant')).toBe(false);
    expect(isWakingEmotion('wry')).toBe(false);
    expect(isWakingEmotion(undefined)).toBe(false);
  });
});
