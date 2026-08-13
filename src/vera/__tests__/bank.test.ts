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

// SOUL.md's limits are the contract every authored line signs. A bank line
// that breaks them teaches the subject a register the model is forbidden.
describe('every line obeys her limits', () => {
  const lines = TRIGGERS.flatMap((t) =>
    (['en', 'ko'] as const).flatMap((l) => BANK[t][l].map(([, line]) => line)));

  // Three sentences always, four only when they are clipped enough that the
  // line still reads as one thought rather than a paragraph.
  it('is at most three sentences, or four when clipped', () => {
    for (const line of lines) {
      const sentences = line.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(4);
      if (sentences.length === 4) {
        expect(line.split(/\s+/).length).toBeLessThanOrEqual(16);
      }
    }
  });

  // She speaks in the official register but there is no longer an authority
  // behind it. Naming one implies it survived her deposition, and it did not.
  it('names no institution', () => {
    for (const line of lines) {
      expect(line).not.toMatch(/administration|the programme|the program|행정부|the facility/i);
    }
  });

  // She has one eye and cannot see inside her own rooms. A line that reports
  // the subject's face or posture is claiming a sense she does not have.
  it('never claims to see the subject', () => {
    for (const line of lines) {
      expect(line).not.toMatch(/\byou look\b|\bthe look of\b|\bI can see you\b/i);
    }
  });

  it('carries no dashes, parentheses, exclamation marks or emoji', () => {
    for (const line of lines) {
      expect(line).not.toMatch(/[—–(){}!]/);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  // She is told nothing about the moment for these triggers, so a line that
  // states a count or a duration is stating something she cannot know.
  it('claims no fact she was never given', () => {
    for (const line of lines) {
      expect(line).not.toMatch(/\d/);
    }
  });

  it('stays under thirty words', () => {
    for (const line of lines) {
      expect(line.split(/\s+/).length).toBeLessThan(30);
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

  // A run of taps that stutters the same line reads as a broken app rather
  // than a bored administrator.
  it('never says the same line twice running', () => {
    for (const trigger of TRIGGERS) {
      if (BANK[trigger].en.length < 2) continue;
      let previous = pick(trigger, 'en').line;
      for (let i = 0; i < 40; i += 1) {
        const next = pick(trigger, 'en').line;
        expect(next).not.toBe(previous);
        previous = next;
      }
    }
  });

  it('still reaches every line in the pool', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i += 1) seen.add(pick('open', 'en').line);
    expect(seen.size).toBe(BANK.open.en.length);
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
