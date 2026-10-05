import { MODES, MODE_ORDER } from '../modes/registry';
import type { TransmissionSlot } from '../modes/types';

// The lines she sends to a lock screen, and the rules they sign. They are not
// in `bank`, so bank.test.ts does not reach them and the same constraints have
// to be held over them here.
const SLOTS: readonly TransmissionSlot[] = ['midday', 'afternoon'];

const pools = MODE_ORDER.flatMap((mode) =>
  SLOTS.map((slot) => ({ mode, slot, lines: MODES[mode].transmissions[slot] })));

const everyLine = pools.flatMap(({ mode, slot, lines }) =>
  lines.map((line) => ({ mode, slot, line })));

describe('every pool', () => {
  it('carries ten lines', () => {
    for (const { mode, slot, lines } of pools) {
      expect({ mode, slot, n: lines.length }).toEqual({ mode, slot, n: 10 });
    }
  });

  // Across all four, not only within one: the same line in two registers would
  // mean the pill changed nothing at that hour.
  it('shares no line with any other pool', () => {
    const all = everyLine.map(({ line }) => line);
    expect(new Set(all).size).toBe(all.length);
  });
});

// The core document's format limits, which the bank's lines already sign.
describe('every line', () => {
  it('stays under thirty words', () => {
    for (const { line } of everyLine) {
      expect([line, line.split(/\s+/).length < 30]).toEqual([line, true]);
    }
  });

  it('runs to at most three sentences', () => {
    for (const { line } of everyLine) {
      expect([line, line.split(/[.?]\s+/).length <= 3]).toEqual([line, true]);
    }
  });

  it('uses no dash, no parenthesis, no emoji and no exclamation mark', () => {
    for (const { line } of everyLine) {
      expect([line, /[—–(){}[\]!]/.test(line)]).toEqual([line, false]);
      expect([line, /\p{Extended_Pictographic}/u.test(line)]).toEqual([line, false]);
    }
  });

  it('ends a question with a question mark', () => {
    const opener = /^(are|is|do|does|did|have|has|was|were|will|would|can|could|what|why|how|when|where|who)\b/i;
    for (const { line } of everyLine) {
      if (opener.test(line)) expect([line, line.includes('?')]).toEqual([line, true]);
    }
  });
});

// The two rules that are this corpus's own. A transmission is chosen a
// fortnight before it is read, so the hour of its slot is the only thing about
// that day it can possibly know.
describe('every line carries nothing about the subject', () => {
  // A count, a date or a duration is a fact the scheduler could not have had.
  // Where a line names its hour it spells it out.
  it('contains no digit', () => {
    for (const { line } of everyLine) {
      expect([line, /\d/.test(line)]).toEqual([line, false]);
    }
  });

  // A line is baked into the notification up to a fortnight before it fires, so
  // she cannot know what the subject did in between. That rules out exactly one
  // kind of claim: HOW LONG they were away.
  //
  // It does NOT rule out saying they are not here now. Anything on a lock
  // screen is read by someone who is, by definition, not in the app — so an
  // invitation is tautologically well founded, where "you have been gone a
  // while" is a guess that is wrong for anyone who closed her twenty minutes
  // ago. This used to ban `back` and `again` alongside the duration words and
  // was over-broad for that reason (2026-10-05): she may ask, she may not
  // measure.
  it('never says how long the subject was away', () => {
    const absence = /\b(gone|away|returned|missed|absent|lately|since you|a while|all day|for days)\b/i;
    for (const { line } of everyLine) {
      expect([line, absence.test(line)]).toEqual([line, false]);
    }
  });

  // She has one eye and it is not pointed at them.
  it('never claims to see the subject', () => {
    const seeing = /\b(you look|you seem|i can see you|watching you|i see you)\b/i;
    for (const { line } of everyLine) {
      expect([line, seeing.test(line)]).toEqual([line, false]);
    }
  });
});
