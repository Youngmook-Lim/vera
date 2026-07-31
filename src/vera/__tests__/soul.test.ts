import { ACT, ACT_SYS, FALLBACK } from '../fallback';
import { SOUL_MD } from '../soul';
import { isEmotionKey } from '../emotions';

describe('SOUL_MD', () => {
  it('is the document itself, not a summary of it', () => {
    expect(SOUL_MD.startsWith('# SOUL.md')).toBe(true);
    expect(SOUL_MD.length).toBeGreaterThan(1200);
  });

  it('keeps the sections she is defined by', () => {
    for (const heading of ['## Register', '## Limits', '## What you are for', '## The facility', '## Memory']) {
      expect(SOUL_MD).toContain(heading);
    }
  });

  it('holds her to one subject and two sentences', () => {
    expect(SOUL_MD).toContain('#50640');
    expect(SOUL_MD).toContain('Under 30 words');
  });
});

describe('FALLBACK', () => {
  it('offers authored lines in both languages', () => {
    expect(FALLBACK.en.length).toBeGreaterThanOrEqual(4);
    expect(FALLBACK.ko.length).toBe(FALLBACK.en.length);
  });

  it('tags every line with a real emotion', () => {
    for (const lang of ['en', 'ko'] as const) {
      for (const [emotion, line] of FALLBACK[lang]) {
        expect(isEmotionKey(emotion)).toBe(true);
        expect(line.trim()).not.toBe('');
      }
    }
  });
});

describe('ACT', () => {
  it('greets in both languages, pleased', () => {
    expect(ACT.en[0]).toBe('pleased');
    expect(ACT.ko[0]).toBe('pleased');
    expect(ACT.ko[1]).toContain('오셨군요');
  });

  it('forbids her from mentioning the key that woke her', () => {
    expect(ACT_SYS).toContain('Do not mention keys');
  });
});
