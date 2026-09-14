import * as Notifications from 'expo-notifications';
import Power from '../../../modules/power/src/PowerModule';
import { makeDaily } from '../notify';

const mocked = Notifications as unknown as Record<string, jest.Mock>;
const power = Power as unknown as Record<string, jest.Mock>;

// The handler is registered once, when this file is imported — which is before
// any beforeEach can run, and clearAllMocks would wipe the record of it. Taken
// here, at import order, rather than made lazy to suit a test.
const handlerCalls = [...mocked.setNotificationHandler.mock.calls];

// The dead-channel sweep runs at import too, and for the same reason has to be
// read before any beforeEach can clear it. Taken here rather than later, where
// ensureChannel's own deletions would be mixed in with it.
const sweptAtImport = mocked.deleteNotificationChannelAsync.mock.calls.map(([id]) => id);

// The shared half of both rooms' daily card. What is IN a notification belongs
// to the room and is tested there; these are the three things the mechanism
// itself has to get right, and every one of them was wrong on the phone before
// it was written down here (2026-09-08).
const daily = makeDaily({
  room: 'test',
  channel: 'test-channel',
  channelName: 'TEST',
  hour: 9,
  count: () => 3,
  build: (index) => ({ title: 'T', body: `card ${index}` }),
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

// A room that has moved channel once, so the deletion of the old one has
// something to act on.
const moved = makeDaily({
  room: 'moved',
  channel: 'moved-channel.v2',
  legacyChannel: 'moved-channel',
  channelName: 'MOVED',
  hour: 9,
  count: () => 1,
  build: () => ({ title: 'T', body: 'card' }),
});


// Android files a notification under the channel its request names, which for
// a scheduled card is the one on the TRIGGER — the content type has no such
// field. Naming none does not fall back to the channel the app just made — it
// falls back to expo's `expo_notifications_fallback_notification_channel`,
// which is importance 4 with vibration on. On the phone that meant both rooms'
// cards arrived under "Miscellaneous", louder than the DEFAULT they were
// created at, with the room channels sitting unused beside them.
describe('the channel a card is filed under', () => {
  it('is the room’s own, named on the trigger of every card', async () => {
    await daily.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalled();
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.trigger.channelId).toBe('test-channel');
    }
  });

  it('is the same channel the sync creates', async () => {
    await daily.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    const [created] = mocked.setNotificationChannelAsync.mock.calls[0];
    const { trigger } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(trigger.channelId).toBe(created);
  });
});

// Importance 3 is a status-bar icon and nothing else — Android peeks from 4 up
// — and vibration is off because `enableVibration` is applied only when the
// option is actually present. Both were measured on the phone: `advice` and
// `horror` sat at mImportance=3, mVibrationEnabled=false, with expo's fallback
// channel beside them at 4 with vibration on, which is what the cards were
// getting before they named a channel of their own.
describe('how loudly a card arrives', () => {
  it('is created loud enough to pop up at all, and to vibrate', async () => {
    await daily.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    const [, options] = mocked.setNotificationChannelAsync.mock.calls[0];
    expect(options.importance).toBe(Notifications.AndroidImportance.HIGH);
    expect(options.enableVibrate).toBe(true);
    expect(options.vibrationPattern?.length).toBeGreaterThan(0);
  });
});

// Android will not raise an existing channel's importance. The
// existing-channel branch of PreferencesHelper.createNotificationChannel
// updates the name, description and group, applies a new importance only when
// it is LOWER, and never touches vibration at all — so a phone already holding
// `advice` at 3 keeps it whatever this code asks for. Deleting and recreating
// the same id does not help either: Android remembers a deleted channel's
// settings and restores them. A new id is the only way through, which makes
// the old one somebody's to clean up.
describe('a channel the room has moved off', () => {
  it('is taken away, so no dead switch is left in Android’s settings', async () => {
    await moved.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    expect(mocked.deleteNotificationChannelAsync).toHaveBeenCalledWith('moved-channel');
  });

  it('is never the channel a card is filed under', async () => {
    await moved.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.trigger.channelId).toBe('moved-channel.v2');
    }
  });

  // The room has always had one channel, so there is nothing to remove and
  // asking would create the very orphan this is meant to prevent.
  it('is not asked for by a room that never moved', async () => {
    await daily.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    expect(mocked.deleteNotificationChannelAsync).not.toHaveBeenCalled();
  });

  // Switching a room's cards on creates the channel the permission is granted
  // against, and that is also the moment the old one has to go: a subject who
  // never opens SYSTEM again would otherwise keep the dead switch forever.
  it('is taken away at the toggle too, not only at a sync', async () => {
    await moved.request();

    expect(mocked.deleteNotificationChannelAsync).toHaveBeenCalledWith('moved-channel');
  });

  // The one way this mechanism could silence a room outright. Deleting the
  // channel the same call just created would take the cards down with it, and
  // every other test here would still pass.
  it('is never the channel the room is moving TO', async () => {
    const confused = makeDaily({
      room: 'confused',
      channel: 'same',
      legacyChannel: 'same',
      channelName: 'CONFUSED',
      hour: 9,
      count: () => 1,
      build: () => ({ title: 'T', body: 'card' }),
    });

    await confused.sync(true, 'en', new Date(2026, 8, 8, 8, 0));

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith('same', expect.anything());
    expect(mocked.deleteNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

// "The default behavior when the handler is not set or does not respond in
// time is not to show the notification." A card arriving while the subject has
// the app open was being dropped without a trace.
describe('a card that lands while the app is open', () => {
  it('is shown, because a handler says so', async () => {
    expect(handlerCalls.length).toBeGreaterThan(0);

    const [{ handleNotification }] = handlerCalls[0];
    await expect(handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });
});

// A channel outlives the code that made it: Android has no way to learn that a
// feature was cut, so it goes on offering the category in the notification
// settings forever. `vera` was created by v1's transmissions (acc4804) and
// orphaned when that file died in the v2 cut, and it has sat on the phone ever
// since as a switch governing nothing.
describe('a channel left behind by a feature that no longer exists', () => {
  it('is swept, so the settings screen stops offering it', () => {
    expect(sweptAtImport).toContain('vera');
  });

  // At import, not per room: it belongs to no room, and a sweep living inside
  // makeDaily would run once per room and read as one room's business.
  it('is swept once, without a room having to ask', () => {
    expect(sweptAtImport.filter((id) => id === 'vera')).toHaveLength(1);
  });
});

// Permission is not delivery. Samsung's Freecess holds a frozen app's alarms
// past their hour whatever Android has granted, and switching a room's cards
// on is the moment that starts to matter — so the ask rides along with the
// ceremony the subject is already in.
describe('the battery exemption, asked for at the toggle', () => {
  beforeEach(() => {
    power.isIgnoringBatteryOptimizations.mockReturnValue(true);
    power.requestIgnoreBatteryOptimizations.mockReturnValue(true);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  });

  it('is asked for when the cards are switched on without it', async () => {
    power.isIgnoringBatteryOptimizations.mockReturnValue(false);
    await expect(daily.request()).resolves.toBe(true);
    expect(power.requestIgnoreBatteryOptimizations).toHaveBeenCalled();
  });

  it('is not asked for when it is already held', async () => {
    await expect(daily.request()).resolves.toBe(true);
    expect(power.requestIgnoreBatteryOptimizations).not.toHaveBeenCalled();
  });

  // A dialog whose result we cannot read back would leave the subject no way
  // to tell whether it took.
  it('is not asked for when the setting cannot be read', async () => {
    power.isIgnoringBatteryOptimizations.mockImplementation(() => {
      throw new Error('unlinked');
    });
    await expect(daily.request()).resolves.toBe(true);
    expect(power.requestIgnoreBatteryOptimizations).not.toHaveBeenCalled();
  });

  // Nothing to protect: there are no cards to arrive late.
  it('is not asked for when the notification permission was refused', async () => {
    power.isIgnoringBatteryOptimizations.mockReturnValue(false);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    await expect(daily.request()).resolves.toBe(false);
    expect(power.requestIgnoreBatteryOptimizations).not.toHaveBeenCalled();
  });
});
