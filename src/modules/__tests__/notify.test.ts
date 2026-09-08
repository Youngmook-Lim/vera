import * as Notifications from 'expo-notifications';
import { makeDaily } from '../notify';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

// The handler is registered once, when this file is imported — which is before
// any beforeEach can run, and clearAllMocks would wipe the record of it. Taken
// here, at import order, rather than made lazy to suit a test.
const handlerCalls = [...mocked.setNotificationHandler.mock.calls];

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
