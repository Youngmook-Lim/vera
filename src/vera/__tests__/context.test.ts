import { buildContext, type ContextInput } from '../context';

const HOUR = 3_600_000;

const base = (over: Partial<ContextInput> = {}): ContextInput => ({
  now: new Date('2026-07-30T14:00:00'),
  lastOpen: null,
  askedAt: new Date('2026-07-30T14:00:00').getTime(),
  visits: 1,
  hunger: 40,
  cleared: 0,
  mem: [],
  impressions: [],
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

  it('carries the last six exchanges and her conclusions', () => {
    const mem = [{ you: 'hello', her: 'You returned.' }];
    const ctx = buildContext(base({ mem, impressions: ['Answers quickly. Suspect anxiety.'] }));
    expect(ctx.recent_exchanges).toEqual(mem);
    expect(ctx.what_you_have_concluded_about_them).toEqual(['Answers quickly. Suspect anxiety.']);
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

  it('mentions the specimen only once it is genuinely suffering', () => {
    expect(buildContext(base({ hunger: 90 })).specimen).toBeUndefined();
    expect(buildContext(base({ hunger: 91 })).specimen).toBe('the specimen is genuinely suffering');
  });

  it('counts erasures only once it is a pattern', () => {
    expect(buildContext(base({ cleared: 1 })).erasures).toBeUndefined();
    expect(buildContext(base({ cleared: 2 })).erasures).toBe(2);
  });
});
