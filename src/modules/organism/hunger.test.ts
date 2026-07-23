import { START_HUNGER, FEED_PER_TAP, HUNGRY_THRESHOLD, hungerForNow, feed, isHungry } from './hunger';

describe('hungerForNow', () => {
  it('defaults to START_HUNGER on a first-ever visit', () => {
    expect(hungerForNow(null, null, new Date())).toBe(START_HUNGER);
  });
  it('drifts up with elapsed time since last fed', () => {
    const fed = new Date('2026-07-23T00:00:00Z');
    const tenHoursLater = new Date('2026-07-23T10:00:00Z');
    const h = hungerForNow(20, fed.toISOString(), tenHoursLater);
    expect(h).toBeGreaterThan(20);
    expect(h).toBeCloseTo(20 + 10 * 2.5, 5); // DRIFT_PER_HOUR = 2.5
  });
  it('clamps at 100', () => {
    const fed = new Date('2026-07-01T00:00:00Z');
    expect(hungerForNow(90, fed.toISOString(), new Date('2026-07-23T00:00:00Z'))).toBe(100);
  });
  it('never returns below 0', () => {
    expect(hungerForNow(0, new Date().toISOString(), new Date())).toBeGreaterThanOrEqual(0);
  });
});

describe('feed', () => {
  it('lowers hunger by FEED_PER_TAP', () => {
    expect(feed(80)).toBe(80 - FEED_PER_TAP);
  });
  it('floors at 0', () => {
    expect(feed(5)).toBe(0);
  });
});

describe('isHungry', () => {
  it('is true at/above the threshold, false below', () => {
    expect(isHungry(HUNGRY_THRESHOLD)).toBe(true);
    expect(isHungry(HUNGRY_THRESHOLD - 1)).toBe(false);
  });
});
