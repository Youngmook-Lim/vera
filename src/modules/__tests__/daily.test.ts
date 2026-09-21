import { PLAN_DAYS, dueForSync, planBag, planDaily, planDates } from '../daily';

// Nine is the advice room's hour; the horror room passes twenty-two. The hour
// is the caller's now, so these exercise it as an argument.
const NINE = 9;

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('the daily plan', () => {
  it('lays out one card a day, at nine, for the whole horizon', () => {
    const plan = planDaily(new Date(2026, 8, 4, 8, 0), 232, NINE);
    expect(plan).toHaveLength(PLAN_DAYS);
    for (const { at } of plan) {
      expect(at.getHours()).toBe(NINE);
      expect(at.getMinutes()).toBe(0);
    }
  });

  // Every entry is built from local date parts rather than by adding
  // milliseconds, so an hour gained or lost overnight still lands at nine.
  it('starts today when nine has not passed, and tomorrow when it has', () => {
    const before = planDaily(new Date(2026, 8, 4, 8, 59), 232, NINE);
    expect(before[0].at.getDate()).toBe(4);

    const after = planDaily(new Date(2026, 8, 4, 9, 0), 232, NINE);
    expect(after[0].at.getDate()).toBe(5);
  });

  it('walks forward one day at a time, across a month boundary', () => {
    const plan = planDaily(new Date(2026, 8, 29, 10, 0), 232, NINE, 4);
    expect(plan.map((p) => [p.at.getMonth(), p.at.getDate()])).toEqual([
      [8, 30], [9, 1], [9, 2], [9, 3],
    ]);
  });

  it('draws every card from inside the book', () => {
    const plan = planDaily(new Date(2026, 8, 4, 8, 0), 232, NINE, 5, seq(0, 0.5, 0.999, 0.25, 0.75));
    expect(plan.map((p) => p.index)).toEqual([0, 116, 231, 58, 174]);
  });
});

describe('whether a sync is due', () => {
  const now = new Date(2026, 8, 4, 10, 0);

  it('is due when nothing has ever been synced', () => {
    expect(dueForSync(null, now)).toBe(true);
  });

  it('is not due again the same day', () => {
    expect(dueForSync(now.toDateString(), now)).toBe(false);
  });

  it('is due again once the day turns over', () => {
    expect(dueForSync(new Date(2026, 8, 3, 23, 59).toDateString(), now)).toBe(true);
  });
});

describe('the seeded bag', () => {
  const ELEVEN = 11;
  const AT_EIGHT = (day: number) => new Date(2026, 8, day, 8, 0);

  // THE test. A fresh shuffle per sync fails exactly here: the horizon is
  // rewritten every morning, so only the first entry of any plan ever fires,
  // and a plan that knows nothing of yesterday's draws independently.
  it('agrees with yesterday’s plan about every day they share', () => {
    const monday = planBag(AT_EIGHT(21), 10, ELEVEN, 14);
    const tuesday = planBag(AT_EIGHT(22), 10, ELEVEN, 14);

    expect(tuesday.slice(0, 13).map((p) => p.index))
      .toEqual(monday.slice(1).map((p) => p.index));
  });

  it('gives the same day the same line however far ahead it was planned', () => {
    const near = planBag(AT_EIGHT(21), 10, ELEVEN, 14);
    const far = planBag(AT_EIGHT(14), 10, ELEVEN, 30);
    const sameDay = far.find((p) => p.at.getDate() === 21 && p.at.getMonth() === 8);

    expect(sameDay?.index).toBe(near[0].index);
  });

  it('deals every line once before dealing any of them twice', () => {
    // A pass runs from day 10k to 10k+9. The window has to be aligned to one,
    // or it straddles two independently seeded shuffles and may legitimately
    // carry a line twice.
    const plan = planBag(AT_EIGHT(21), 10, ELEVEN, 30);
    const first = Math.floor(Date.UTC(2026, 8, 21) / 86400000);
    const aligned = (10 - (first % 10)) % 10;

    const pass = plan.slice(aligned, aligned + 10);
    expect(new Set(pass.map((p) => p.index)).size).toBe(10);
  });

  // The seam between one pass and the next is seeded independently, so the
  // shuffle alone cannot keep them apart.
  it('never repeats on consecutive days, across a pass boundary', () => {
    const plan = planBag(AT_EIGHT(21), 10, ELEVEN, 90);
    for (let i = 1; i < plan.length; i++) {
      expect([i, plan[i].index === plan[i - 1].index]).toEqual([i, false]);
    }
  });

  // Seeding every pass alike would survive every other test here: it is
  // deterministic, it carries all ten per pass, and its seam never repeats.
  // What it produces is one fixed ten-day loop, forever, which a subject would
  // have spotted long before a test did.
  it('does not settle into the same ten-line loop forever', () => {
    const plan = planBag(AT_EIGHT(21), 10, ELEVEN, 90).map((p) => p.index);

    expect(plan.slice(10).some((index, i) => index !== plan[i])).toBe(true);
  });

  it('lays out one line a day at the given hour, for the whole horizon', () => {
    const plan = planBag(AT_EIGHT(21), 10, ELEVEN, 14);
    expect(plan).toHaveLength(14);
    for (const { at } of plan) {
      expect(at.getHours()).toBe(ELEVEN);
      expect(at.getMinutes()).toBe(0);
    }
  });

  it('starts today when the hour has not passed, and tomorrow when it has', () => {
    expect(planBag(new Date(2026, 8, 21, 10, 59), 10, ELEVEN)[0].at.getDate()).toBe(21);
    expect(planBag(new Date(2026, 8, 21, 11, 0), 10, ELEVEN)[0].at.getDate()).toBe(22);
  });

  // An empty pool would otherwise schedule the literal string "undefined".
  it('plans nothing at all from an empty pool', () => {
    expect(planBag(AT_EIGHT(21), 0, ELEVEN, 14)).toEqual([]);
  });

  it('defaults to the same horizon planDaily does', () => {
    expect(planBag(AT_EIGHT(21), 10, ELEVEN)).toHaveLength(PLAN_DAYS);
  });
});

describe('the dates', () => {
  // Extracted so the DST rule exists once. planDaily's own tests passing
  // unchanged is the proof the extraction was behaviour-preserving; this is
  // the proof the new planner shares the rule rather than restating it.
  it('is what both planners lay their days on', () => {
    const now = new Date(2026, 8, 21, 8, 0);
    const dates = planDates(now, 11, 14);
    expect(planDaily(now, 10, 11, 14).map((p) => p.at)).toEqual(dates);
    expect(planBag(now, 10, 11, 14).map((p) => p.at)).toEqual(dates);
  });
});
