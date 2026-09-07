import { PLAN_DAYS, dueForSync, planDaily } from '../daily';

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
