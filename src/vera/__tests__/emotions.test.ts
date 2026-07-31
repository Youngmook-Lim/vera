import { EMOTIONS, emotionLabel, isEmotionKey } from '../emotions';

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
