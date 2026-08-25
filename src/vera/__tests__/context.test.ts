import { buildContext, type ContextInput } from '../context';

const HOUR = 3_600_000;

const base = (over: Partial<ContextInput> = {}): ContextInput => ({
  now: new Date('2026-07-30T14:00:00'),
  lastOpen: null,
  askedAt: new Date('2026-07-30T14:00:00').getTime(),
  visits: 1,
  ...over,
});

describe('buildContext', () => {
  it('buckets the hour rather than handing her a clock', () => {
    expect(buildContext(base({ now: new Date('2026-07-30T03:00:00') })).time_of_day).toBe('the small hours');
    expect(buildContext(base({ now: new Date('2026-07-30T09:00:00') })).time_of_day).toBe('morning');
    expect(buildContext(base({ now: new Date('2026-07-30T14:00:00') })).time_of_day).toBe('afternoon');
    expect(buildContext(base({ now: new Date('2026-07-30T20:00:00') })).time_of_day).toBe('evening');
    expect(buildContext(base({ now: new Date('2026-07-30T23:30:00') })).time_of_day).toBe('near midnight');
  });

  // An unremarkable number is noise she will recite, so nothing notable is
  // offered unless it genuinely is.
  it('offers no notable fact on an ordinary afternoon visit', () => {
    expect(buildContext(base()).notable).toBeUndefined();
  });

  it('notices an indefensible hour', () => {
    const ctx = buildContext(base({ now: new Date('2026-07-30T03:00:00') }));
    expect(ctx.notable).toBe('they are awake at an indefensible hour');
  });

  it('notices a long absence, in days', () => {
    const now = new Date('2026-07-30T14:00:00');
    const ctx = buildContext(base({ now, lastOpen: now.getTime() - 96 * HOUR }));
    expect(ctx.notable).toBe('gone 4 days');
  });

  it('notices a fifth return today', () => {
    expect(buildContext(base({ visits: 5 })).notable).toBe('this is return number 5 today');
  });

  it('prefers the absence over the return count when both apply', () => {
    const now = new Date('2026-07-30T14:00:00');
    const ctx = buildContext(base({ now, visits: 6, lastOpen: now.getTime() - 96 * HOUR }));
    expect(ctx.notable).toBe('gone 4 days');
  });

  it('never offers more than one notable fact', () => {
    const now = new Date('2026-07-30T03:00:00');
    const ctx = buildContext(base({ now, visits: 9, lastOpen: now.getTime() - 200 * HOUR }));
    expect(typeof ctx.notable).toBe('string');
  });

  it('notes a reply that took over four minutes', () => {
    const now = new Date('2026-07-30T14:00:00');
    expect(buildContext(base({ now, askedAt: now.getTime() - 241_000 })).they_took_their_time).toBe(true);
    expect(buildContext(base({ now, askedAt: now.getTime() - 100_000 })).they_took_their_time).toBeUndefined();
  });

  // She is told nothing about Specimen-03 and nothing about erasures — the
  // module owns its own hunger, and the erasure count exists only for the
  // MEMORY.md screen. The context object is the proof: it has no field for
  // either, so nothing can leak into a prompt by accident.
  it('carries only the situational, now that the subject lives in MEMORY.md', () => {
    expect(Object.keys(buildContext(base())).sort()).toEqual(['time_of_day'].sort());
  });

  it('pins the precedence order of notable: all seven combinations', () => {
    const afternoon = new Date('2026-07-30T14:00:00');
    const earlyMorning = new Date('2026-07-30T03:00:00');

    // small hours only (3am, no absence, visits 1)
    expect(buildContext(base({ now: earlyMorning })).notable).toBe('they are awake at an indefensible hour');

    // absence only (afternoon, 96h absence, visits 1)
    expect(buildContext(base({ now: afternoon, lastOpen: afternoon.getTime() - 96 * HOUR })).notable).toBe('gone 4 days');

    // visits 6 only (afternoon, no absence, visits 6)
    expect(buildContext(base({ now: afternoon, visits: 6 })).notable).toBe('this is return number 6 today');

    // small hours + absence (3am, 96h absence, visits 1): absence wins
    expect(buildContext(base({ now: earlyMorning, lastOpen: earlyMorning.getTime() - 96 * HOUR })).notable).toBe('gone 4 days');

    // small hours + visits 6, no absence (3am, no absence, visits 6): visits wins
    expect(buildContext(base({ now: earlyMorning, visits: 6 })).notable).toBe('this is return number 6 today');

    // absence + visits (afternoon, 96h absence, visits 6): absence wins
    expect(buildContext(base({ now: afternoon, visits: 6, lastOpen: afternoon.getTime() - 96 * HOUR })).notable).toBe('gone 4 days');

    // all three (3am, 200h absence, visits 9): absence wins
    expect(buildContext(base({ now: earlyMorning, visits: 9, lastOpen: earlyMorning.getTime() - 200 * HOUR })).notable).toBe('gone 8 days');
  });

  it('tests exact boundaries for absence (72 hours)', () => {
    const now = new Date('2026-07-30T14:00:00');
    // exactly 72 hours should NOT trigger
    expect(buildContext(base({ now, lastOpen: now.getTime() - 72 * HOUR })).notable).toBeUndefined();
    // 72 hours and 1ms should trigger
    expect(buildContext(base({ now, lastOpen: now.getTime() - 72 * HOUR - 1 })).notable).toBe('gone 3 days');
  });

  it('tests exact boundary for reply latency (240 seconds)', () => {
    const now = new Date('2026-07-30T14:00:00');
    // exactly 240 seconds should NOT trigger
    expect(buildContext(base({ now, askedAt: now.getTime() - 240 * 1000 })).they_took_their_time).toBeUndefined();
    // 241 seconds should trigger
    expect(buildContext(base({ now, askedAt: now.getTime() - 241 * 1000 })).they_took_their_time).toBe(true);
  });

  it('tests exact boundaries for time_of_day buckets', () => {
    // hour 5 should be 'morning', not 'the small hours'
    expect(buildContext(base({ now: new Date('2026-07-30T05:00:00') })).time_of_day).toBe('morning');
    // hour 12 should be 'afternoon', not 'morning'
    expect(buildContext(base({ now: new Date('2026-07-30T12:00:00') })).time_of_day).toBe('afternoon');
    // hour 18 should be 'evening', not 'afternoon'
    expect(buildContext(base({ now: new Date('2026-07-30T18:00:00') })).time_of_day).toBe('evening');
    // hour 23 should be 'near midnight', not 'evening'
    expect(buildContext(base({ now: new Date('2026-07-30T23:00:00') })).time_of_day).toBe('near midnight');
  });
});
