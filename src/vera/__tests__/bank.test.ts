import { BANK, pick } from '../bank';
import type { BankTrigger } from '../speak';
import { isEmotionKey } from '../emotions';

const TRIGGERS: BankTrigger[] = ['open', 'activation', 'subject_tapped_your_optic'];

describe('BANK', () => {
  it('covers every stimulus she answers without the model, in both languages', () => {
    for (const trigger of TRIGGERS) {
      expect(BANK[trigger].en.length).toBeGreaterThan(0);
      expect(BANK[trigger].ko.length).toBeGreaterThan(0);
    }
  });

  it('tags every line with a real emotion and no empty text', () => {
    for (const trigger of TRIGGERS) {
      for (const lang of ['en', 'ko'] as const) {
        for (const [emotion, line] of BANK[trigger][lang]) {
          expect(isEmotionKey(emotion)).toBe(true);
          expect(line.trim()).not.toBe('');
        }
      }
    }
  });

  // She is never dormant when a bank line is spoken, so no pool may offer the
  // dormant optic — the eye would go dead mid-greeting.
  it('never offers the dormant state', () => {
    for (const trigger of TRIGGERS) {
      for (const lang of ['en', 'ko'] as const) {
        for (const [emotion] of BANK[trigger][lang]) {
          expect(emotion).not.toBe('dormant');
        }
      }
    }
  });
});

describe('pick', () => {
  it('answers in the reading language', () => {
    for (const trigger of TRIGGERS) {
      expect(pick(trigger, 'ko').line).toMatch(/[가-힣]/);
      expect(pick(trigger, 'en').line).not.toMatch(/[가-힣]/);
    }
  });

  it('only ever returns a line that is actually in the pool', () => {
    for (const trigger of TRIGGERS) {
      for (const lang of ['en', 'ko'] as const) {
        const lines = BANK[trigger][lang].map(([, line]) => line);
        for (let i = 0; i < 50; i += 1) {
          expect(lines).toContain(pick(trigger, lang).line);
        }
      }
    }
  });
});
