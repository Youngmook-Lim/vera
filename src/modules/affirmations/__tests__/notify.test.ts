import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../../daily';
import { LINES, SOURCE } from '../lines';
import { NOTIFY_HOUR, syncDaily } from '../notify';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('the daily affirmation', () => {
  it('arrives at ten', () => {
    expect(NOTIFY_HOUR).toBe(10);
  });

  it('hands over one card a day for the whole horizon, at ten', async () => {
    await syncDaily(true, 'en', new Date(2026, 9, 29, 8, 0));
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
    const { trigger } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(new Date(trigger.date).getHours()).toBe(10);
    expect(trigger.channelId).toBe('affirmations.v1');
  });

  it('writes her line and her name into every card, tagged as this room', async () => {
    await syncDaily(true, 'en', new Date(2026, 9, 29, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('AFFIRMATIONS');
    expect(content.data.room).toBe('affirmations');
    expect(content.body).toBe(`${LINES[content.data.index]}\n— ${SOURCE.author}`);
  });

  it('cancels only its own pending cards', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'f1', content: { data: { room: 'affirmations', index: 3 } } },
      { identifier: 'a1', content: { data: { room: 'advice', index: 3 } } },
    ]);
    await syncDaily(false, 'en', new Date(2026, 9, 29, 8, 0));
    const cancelled = mocked.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]);
    expect(cancelled).toEqual(['f1']);
  });
});
