import * as Notifications from 'expo-notifications';
import { KEYS, storage } from '../../../core/storage';
import { PLAN_DAYS } from '../daily';
import { parse } from '../stored';
import { useAdviceStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;

const onDisk = async () => (await parse(await storage.get(KEYS.advice))).favorites;

// A cold start: nothing hydrated, whatever is on disk is all there is.
const coldStart = async () => {
  useAdviceStore.setState({ hydrated: false, favorites: new Set() });
  await useAdviceStore.getState().hydrate();
  return useAdviceStore.getState().favorites;
};

describe('the advice store', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await storage.clearAll();
    useAdviceStore.setState({ hydrated: false, favorites: new Set() });
  });

  it('keeps nothing when there is nothing on disk', async () => {
    expect((await coldStart()).size).toBe(0);
  });

  it('round-trips a favorite through the real save and load paths', async () => {
    await useAdviceStore.getState().toggleFavorite('Finish the small thing before starting the next one.');
    expect([...(await onDisk())]).toEqual(['Finish the small thing before starting the next one.']);
    expect([...(await coldStart())]).toEqual(['Finish the small thing before starting the next one.']);
  });

  it('takes a favorite off the disk when it is unmarked again', async () => {
    const { toggleFavorite } = useAdviceStore.getState();
    await toggleFavorite('a');
    await toggleFavorite('a');
    expect((await onDisk()).size).toBe(0);
    expect((await coldStart()).size).toBe(0);
  });

  it('costs you the favorites, not the room, when the record is corrupt', async () => {
    await storage.set(KEYS.advice, '}{ not json');
    expect((await coldStart()).size).toBe(0);
  });

  // The same bargain the organism store strikes: an unwritable disk must never
  // surface as an unhandled rejection at the void call site.
  it('keeps the favorite for this session when the disk refuses it', async () => {
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('read-only'));
    await expect(useAdviceStore.getState().toggleFavorite('a')).resolves.toBeUndefined();
    expect(useAdviceStore.getState().favorites.has('a')).toBe(true);
  });

  it('reads the disk once however many callers ask', async () => {
    await storage.set(KEYS.advice, JSON.stringify({ favorites: ['a'] }));
    const get = jest.spyOn(storage, 'get');
    useAdviceStore.setState({ hydrated: false, favorites: new Set() });
    const { hydrate } = useAdviceStore.getState();
    await Promise.all([hydrate(), hydrate(), hydrate()]);
    expect(get).toHaveBeenCalledTimes(1);
    expect([...useAdviceStore.getState().favorites]).toEqual(['a']);
  });

  // SYSTEM can call setDaily before the room itself has ever mounted, so
  // nothing has hydrated the store yet. Before this, setDaily's own `save`
  // spread `get().favorites` — still the empty initial Set — and rewrote the
  // disk record with the kept quotes gone for good.
  it('does not erase favorites on disk when switched on before anything has hydrated', async () => {
    await storage.set(
      KEYS.advice,
      JSON.stringify({ favorites: ['a', 'b'], daily: false, syncedOn: null }),
    );
    useAdviceStore.setState({ hydrated: false, favorites: new Set(), daily: false, syncedOn: null });
    await useAdviceStore.getState().setDaily(true, 'en');
    expect([...(await onDisk())]).toEqual(['a', 'b']);
  });
});

describe('the daily card', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    await storage.clearAll();
    useAdviceStore.setState({
      hydrated: false, favorites: new Set(), daily: false, syncedOn: null,
    });
  });

  it('is off until it is asked for', async () => {
    await useAdviceStore.getState().hydrate();
    expect(useAdviceStore.getState().daily).toBe(false);
  });

  it('schedules the moment it is switched on, without waiting for a launch', async () => {
    const on = await useAdviceStore.getState().setDaily(true, 'en');
    expect(on).toBe(true);
    expect(useAdviceStore.getState().daily).toBe(true);
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  // Android never re-prompts. A refusal must leave the store off, or the row
  // would say ON over a phone that will never show a card.
  it('stays off when the subject refuses the permission', async () => {
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const on = await useAdviceStore.getState().setDaily(true, 'en');
    expect(on).toBe(false);
    expect(useAdviceStore.getState().daily).toBe(false);
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels everything when it is switched off', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    jest.clearAllMocks();
    await useAdviceStore.getState().setDaily(false, 'en');
    expect(useAdviceStore.getState().daily).toBe(false);
    expect(notifs.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('survives a restart, on and stamped', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    useAdviceStore.setState({ hydrated: false, favorites: new Set(), daily: false, syncedOn: null });
    await useAdviceStore.getState().hydrate();
    expect(useAdviceStore.getState().daily).toBe(true);
    expect(useAdviceStore.getState().syncedOn).toBe(new Date().toDateString());
  });

  // Ninety cancels and ninety native calls in the boot path, for an
  // identically-shaped result, on every single launch.
  it('syncs once a day, not once a launch', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    jest.clearAllMocks();

    await useAdviceStore.getState().syncIfDue('en');
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();

    await useAdviceStore.getState().syncIfDue('en', new Date(Date.now() + 86_400_000));
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  it('does no work at all while it is switched off', async () => {
    await useAdviceStore.getState().hydrate();
    await useAdviceStore.getState().syncIfDue('en');
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notifs.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});
