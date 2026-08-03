import { FEED_PER_TAP, HUNGER_FLOOR, feed, hungerForNow, isHungry } from '../hunger';

describe('hunger', () => {
  it('starts at the prototype value with nothing stored', () => {
    expect(hungerForNow(null, null, new Date())).toBe(82);
  });

  it('climbs 2.5 points an hour since the last feed', () => {
    const fed = new Date('2026-07-30T00:00:00');
    const later = new Date('2026-07-30T10:00:00');
    expect(hungerForNow(8, fed.toISOString(), later)).toBe(33);
  });

  it('crosses into hungry about nineteen hours after a full feed', () => {
    const fed = new Date('2026-07-30T00:00:00');
    const at18 = new Date('2026-07-30T18:00:00');
    const at19 = new Date('2026-07-30T19:00:00');
    expect(isHungry(hungerForNow(8, fed.toISOString(), at18))).toBe(false);
    expect(isHungry(hungerForNow(8, fed.toISOString(), at19))).toBe(true);
  });

  it('never climbs past a hundred', () => {
    const fed = new Date('2026-07-01T00:00:00');
    expect(hungerForNow(82, fed.toISOString(), new Date('2026-07-30T00:00:00'))).toBe(100);
  });

  it('never drops below zero', () => {
    // hours is itself Math.max(0, ...) and drift is only ever added, so a
    // non-negative storedHunger can never reach the floor pre-clamp — the
    // only input that actually drives the pre-clamp value below zero is a
    // negative storedHunger (reachable via a corrupt or hand-edited blob).
    expect(hungerForNow(-20, new Date().toISOString(), new Date())).toBe(0);
  });

  it('takes 41 off a feed and stops at the floor', () => {
    expect(feed(82)).toBe(41);
    expect(feed(20)).toBe(HUNGER_FLOOR);
    expect(FEED_PER_TAP).toBe(41);
  });

  it('reads hungry strictly above 55', () => {
    expect(isHungry(55)).toBe(false);
    expect(isHungry(56)).toBe(true);
  });
});
