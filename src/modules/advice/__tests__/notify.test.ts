import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../daily';
import { permissionState, requestDaily, syncDaily } from '../notify';
import { QUOTES, SOURCE } from '../quotes';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
});

describe('the executor', () => {
  it('hands over one card a day for the whole horizon', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  // The text has to be inside the notification before Android takes it:
  // nothing of ours is awake at nine to choose one.
  it('writes the quote and the book into every card', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('EXCELLENT ADVICE');
    expect(typeof content.data.quote).toBe('number');
    expect(content.body).toContain(QUOTES[content.data.quote]);
    expect(content.body).toContain(SOURCE.author);
  });

  it('titles the card in the reading language', async () => {
    await syncDaily(true, 'ko', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('훌륭한 조언');
  });

  it('makes the channel before it schedules anything', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalled();
    const channelOrder = mocked.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const scheduleOrder = mocked.scheduleNotificationAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(scheduleOrder);
  });

  it('cancels and schedules nothing when it is switched off', async () => {
    await syncDaily(false, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  // An icon is a courtesy. A phone that refuses to schedule, or a build with no
  // native module in it, must never be the reason the room fails to open.
  it('swallows a refusal from the native side', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('no'));
    await expect(syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0))).resolves.toBeUndefined();
  });
});

describe('the permission', () => {
  it('reads granted, refused and not-yet-asked apart', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
    expect(await permissionState()).toBe('granted');

    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await permissionState()).toBe('ask');

    // Android never re-prompts once it has been refused.
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await permissionState()).toBe('blocked');
  });

  it('asks, and reports what the subject chose', async () => {
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await requestDaily()).toBe(false);
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalled();
  });
});
