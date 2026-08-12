import { KEYS, storage } from '../../../core/storage';
import { START_HUNGER } from '../hunger';
import { useOrganismStore } from '../store';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const saved = (blob: Record<string, unknown>) =>
  storage.set(KEYS.organism, JSON.stringify(blob));

// A cold start: nothing hydrated, whatever is on disk is all there is.
const coldStart = async () => {
  useOrganismStore.setState({ hydrated: false, hunger: START_HUNGER, hungerAt: null });
  await useOrganismStore.getState().hydrate();
  return useOrganismStore.getState().hunger;
};

describe('the organism store', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await storage.clearAll();
    useOrganismStore.setState({ hydrated: false, hunger: START_HUNGER, hungerAt: null });
  });

  it('starts an unanchored specimen at START_HUNGER', async () => {
    expect(await coldStart()).toBe(START_HUNGER);
    expect(useOrganismStore.getState().hungerAt).toBeNull();
  });

  it('rehydrates hunger as stored-plus-drift, not the stored number', async () => {
    await saved({ hunger: 40, hungerAt: hoursAgo(10) });
    expect(await coldStart()).toBeCloseTo(40 + 10 * 2.5, 1); // DRIFT_PER_HOUR = 2.5
    expect(useOrganismStore.getState().hungerAt).not.toBeNull();
  });

  // The drifted value hydrate just computed is hunger as of NOW, so the pair it
  // leaves in state must be stamped NOW. Carrying the older stamp forward is
  // what lets the next writer persist a drifted number beside a stale timestamp
  // and have the drift counted twice.
  it('re-stamps the rehydrated hunger with the instant it was measured', async () => {
    const fedAt = hoursAgo(10);
    await saved({ hunger: 8, hungerAt: fedAt });

    expect(await coldStart()).toBeCloseTo(33, 1);
    const { hungerAt } = useOrganismStore.getState();
    expect(hungerAt).not.toBe(fedAt);
    expect(Date.now() - new Date(hungerAt as string).getTime()).toBeLessThan(5_000);
  });

  it('degrades a corrupt record to a fresh specimen rather than dying', async () => {
    await storage.set(KEYS.organism, '{{{not json');
    expect(await coldStart()).toBe(START_HUNGER);
  });

  it('reads the disk once, however many things ask for the specimen', async () => {
    await saved({ hunger: 40, hungerAt: hoursAgo(10) });
    const get = jest.spyOn(storage, 'get');

    // The tile and the room mount together and both ask.
    await Promise.all([
      useOrganismStore.getState().hydrate(),
      useOrganismStore.getState().hydrate(),
    ]);
    await useOrganismStore.getState().hydrate();

    expect(get).toHaveBeenCalledTimes(1);
  });

  // The regression this guards: a dropped `hungerAt` would still write *some*
  // blob, so a test that only checks "something was written" cannot catch it.
  // On the next cold start hungerForNow(_, null, _) returns START_HUNGER
  // unconditionally — the specimen would silently reset to 82 rather than
  // resuming its drift from 41.
  it('round-trips a feed through a restart', async () => {
    await useOrganismStore.getState().hydrate();
    await useOrganismStore.getState().feed();
    expect(useOrganismStore.getState().hunger).toBe(41);

    const raw = await storage.get(KEYS.organism);
    expect(Object.keys(JSON.parse(raw as string)).sort()).toEqual(['hunger', 'hungerAt']);

    expect(await coldStart()).toBeCloseTo(41, 1);
  });

  it('survives a disk that refuses to write, and stays fed for the session', async () => {
    await useOrganismStore.getState().hydrate();
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('disk full'));

    await expect(useOrganismStore.getState().feed()).resolves.toBeUndefined();
    expect(useOrganismStore.getState().hunger).toBe(41);
  });

  // Hunger is measured on the way in and does not tick during a session, so a
  // feed hours later works from the value hydrate computed — not from one
  // re-drifted against the clock. Re-drifting would feed a specimen that had
  // notionally grown hungrier while nothing was watching it.
  it('feeds from the value measured on the way in, not a re-drifted one', async () => {
    jest.useFakeTimers();
    try {
      await saved({ hunger: 60, hungerAt: hoursAgo(10) });
      expect(await coldStart()).toBeCloseTo(85, 1); // 60 + 10h × 2.5

      jest.advanceTimersByTime(5 * 3_600_000); // she is left open for five hours
      await useOrganismStore.getState().feed();

      // 85 − 41, and stamped at the feed, so the next launch reads it back flat.
      // A re-drift would have fed 97.5 instead and left 56.5 here.
      expect(await coldStart()).toBeCloseTo(44, 1);
    } finally {
      jest.useRealTimers();
    }
  });
});
