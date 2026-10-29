import * as Notifications from 'expo-notifications';
import { KEYS, storage } from '../../../core/storage';
import { parse } from '../stored';
import { useAffirmationsStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;
const onDisk = async () => parse(await storage.get(KEYS.affirmations));
const coldStart = async () => {
  useAffirmationsStore.setState({ hydrated: false, favorites: new Set(), daily: false, syncedOn: null });
  await useAffirmationsStore.getState().hydrate();
  return useAffirmationsStore.getState();
};

beforeEach(async () => {
  jest.clearAllMocks();
  await storage.clearAll();
  notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  useAffirmationsStore.setState({ hydrated: false, favorites: new Set(), daily: false, syncedOn: null });
});

describe('the affirmations store', () => {
  it('keeps a card by its words, through the real save and load', async () => {
    await useAffirmationsStore.getState().toggleFavorite('I am allowed to begin again.');
    expect([...(await onDisk()).favorites]).toEqual(['I am allowed to begin again.']);
    expect([...(await coldStart()).favorites]).toEqual(['I am allowed to begin again.']);
  });

  it('lets a card go again', async () => {
    const { toggleFavorite } = useAffirmationsStore.getState();
    await toggleFavorite('a');
    await toggleFavorite('a');
    expect((await coldStart()).favorites.size).toBe(0);
  });

  // Review Focus 4. SYSTEM can reach this before the room has ever opened, and
  // `save` spreads whatever the store holds — an unhydrated store would write
  // an empty set over every card the subject kept.
  it('does not wipe the kept cards when the daily card is switched on from SYSTEM first', async () => {
    await storage.set(KEYS.affirmations, JSON.stringify({ favorites: ['kept'], daily: false, syncedOn: null }));
    await useAffirmationsStore.getState().setDaily(true, 'en');
    expect([...(await onDisk()).favorites]).toEqual(['kept']);
    expect((await onDisk()).daily).toBe(true);
  });

  it('stamps the sync only once Android has taken the horizon', async () => {
    notifs.scheduleNotificationAsync.mockRejectedValueOnce(new Error('refused'));
    await useAffirmationsStore.getState().setDaily(true, 'en');
    expect(useAffirmationsStore.getState().daily).toBe(true);
    expect(useAffirmationsStore.getState().syncedOn).toBeNull();
  });

  it('stays off when the permission is refused', async () => {
    notifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await useAffirmationsStore.getState().setDaily(true, 'en')).toBe(false);
    expect(useAffirmationsStore.getState().daily).toBe(false);
  });

  // The pass outlives the room's screen; it is state, not `Stored`.
  it('keeps the deck in memory and never writes it down', async () => {
    useAffirmationsStore.getState().setDeck((d) => ({ order: d.order, at: 3 }));
    expect(useAffirmationsStore.getState().deck.at).toBe(3);
    await useAffirmationsStore.getState().toggleFavorite('x');
    expect(JSON.parse((await storage.get(KEYS.affirmations))!).deck).toBeUndefined();
  });

  it('syncs at boot only when the day has turned over', async () => {
    useAffirmationsStore.setState({ hydrated: true, daily: true, syncedOn: new Date(2026, 9, 29).toDateString() });
    await useAffirmationsStore.getState().syncIfDue('en', new Date(2026, 9, 29, 12));
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
    await useAffirmationsStore.getState().syncIfDue('en', new Date(2026, 9, 30, 8));
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalled();
    expect(useAffirmationsStore.getState().syncedOn).toBe(new Date(2026, 9, 30, 8).toDateString());
  });
});
