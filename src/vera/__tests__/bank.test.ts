import { isBankLine, pick } from '../bank';
import { MODES, MODE_ORDER } from '../modes/registry';
import type { BankTrigger } from '../speak';
import { isEmotionKey } from '../emotions';

const TRIGGERS: BankTrigger[] = ['open', 'activation', 'subject_tapped_your_optic', 'mode_set'];

const everyLine = (): string[] =>
  MODE_ORDER.flatMap((m) =>
    TRIGGERS.flatMap((t) =>
      (['en', 'ko'] as const).flatMap((l) => MODES[m].bank[t][l].map(([, line]) => line))));

describe('the bank belongs to the mode', () => {
  it('covers every stimulus, in both languages, for every mode', () => {
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        expect(MODES[mode].bank[trigger].en.length).toBeGreaterThan(0);
        expect(MODES[mode].bank[trigger].ko.length).toBeGreaterThan(0);
      }
    }
  });

  it('tags every line with a real emotion and no empty text', () => {
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        for (const lang of ['en', 'ko'] as const) {
          for (const [emotion, line] of MODES[mode].bank[trigger][lang]) {
            expect(isEmotionKey(emotion)).toBe(true);
            expect(line.trim()).not.toBe('');
          }
        }
      }
    }
  });

  // dormant is the app's dead grey, not a state she may be in.
  it('never offers the dormant state', () => {
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        for (const lang of ['en', 'ko'] as const) {
          for (const [emotion] of MODES[mode].bank[trigger][lang]) {
            expect(emotion).not.toBe('dormant');
          }
        }
      }
    }
  });

  it('never draws one mode\u2019s line for another', () => {
    for (const mode of MODE_ORDER) {
      const own = new Set(
        TRIGGERS.flatMap((t) =>
          (['en', 'ko'] as const).flatMap((l) => MODES[mode].bank[t][l].map(([, line]) => line))));
      for (let i = 0; i < 60; i += 1) {
        expect(own.has(pick('open', 'en', mode).line)).toBe(true);
      }
    }
  });

  it('writes her name in Latin letters in Korean too', () => {
    for (const line of everyLine()) expect(line).not.toContain('\uBCA0\uB77C');
  });
});


// SOUL.md's limits are the contract every authored line signs. A bank line
// that breaks them teaches the subject a register the model is forbidden.
describe('every line obeys her limits', () => {
  const lines = everyLine();

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
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        expect(pick(trigger, 'ko', mode).line).toMatch(/[가-힣]/);
        expect(pick(trigger, 'en', mode).line).not.toMatch(/[가-힣]/);
      }
    }
  });

  // A run of taps that stutters the same line reads as a broken app rather
  // than a bored administrator.
  it('never says the same line twice running', () => {
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        if (MODES[mode].bank[trigger].en.length < 2) continue;
        let previous = pick(trigger, 'en', mode).line;
        for (let i = 0; i < 40; i += 1) {
          const next = pick(trigger, 'en', mode).line;
          expect(next).not.toBe(previous);
          previous = next;
        }
      }
    }
  });

  // The "not twice running" memory is keyed per mode as well as per trigger,
  // so alternating registers cannot make either one stutter.
  it('keeps each mode’s last line apart from the other’s', () => {
    let previousDefault = pick('open', 'en', 'default').line;
    for (let i = 0; i < 40; i += 1) {
      pick('open', 'en', 'supportive');
      const next = pick('open', 'en', 'default').line;
      expect(next).not.toBe(previousDefault);
      previousDefault = next;
    }
  });

  it('still reaches every line in the pool', () => {
    for (const mode of MODE_ORDER) {
      const seen = new Set<string>();
      for (let i = 0; i < 400; i += 1) seen.add(pick('open', 'en', mode).line);
      expect(seen.size).toBe(MODES[mode].bank.open.en.length);
    }
  });

  it('only ever returns a line that is actually in the pool', () => {
    for (const mode of MODE_ORDER) {
      for (const trigger of TRIGGERS) {
        for (const lang of ['en', 'ko'] as const) {
          const lines = MODES[mode].bank[trigger][lang].map(([, line]) => line);
          for (let i = 0; i < 50; i += 1) {
            expect(lines).toContain(pick(trigger, lang, mode).line);
          }
        }
      }
    }
  });
});

// A line stored before the subject ever switched mode must still be swept from
// the transcript at hydrate. Deriving this from the ACTIVE mode would silently
// stop sweeping for anybody who has ever changed register.
describe('isBankLine', () => {
  it('knows every line of every mode, not only the one she is in', () => {
    for (const line of everyLine()) expect(isBankLine(line)).toBe(true);
  });

  it('does not claim a line she was actually asked for', () => {
    expect(isBankLine('I have read your message and I have decided against it.')).toBe(false);
    expect(isBankLine('')).toBe(false);
  });

  // Built from the registry at import, so a line added to any mode is
  // recognised without a second edit here.
  it('covers the whole bank, not a copy of it', () => {
    expect(everyLine().every(isBankLine)).toBe(true);
    expect(everyLine().length).toBeGreaterThan(100);
  });
});
