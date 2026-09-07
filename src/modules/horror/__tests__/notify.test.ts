import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../../daily';
import { redactionFor } from '../card';
import { NOTIFY_HOUR, onTap, readTapTarget, syncNightly } from '../notify';
import { STORIES } from '../stories';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
});

describe('the nightly story', () => {
  it('goes out at ten at night, one a day for the whole horizon', async () => {
    await syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0));
    expect(NOTIFY_HOUR).toBe(22);
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.trigger.date.getHours()).toBe(22);
    }
  });

  // A notification is drawn by the launcher and readable on a lock screen the
  // moment it lands. There is no blur, so the only way to withhold the turn is
  // not to send it.
  it('sends the setup whole and never a word of the turn', async () => {
    await syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    const story = STORIES[content.data.index];

    expect(content.title).toBe('TWO SENTENCE HORROR');
    expect(content.body).toContain(story.setup);
    expect(content.body).not.toContain(story.turn);
    expect(content.body).toBe(`${story.setup}\n${redactionFor(story.turn)}`);
    expect(content.body).toContain('█');
  });

  it('titles the story in the reading language', async () => {
    await syncNightly(true, 'ko', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('두 문장 공포');
  });

  // The whole reason cancelling is per-room. This sync fires whenever its own
  // toggle is flipped, at any hour, with the advice room's horizon already in
  // the queue and its `syncedOn` stamped for today.
  it("cancels its own pending stories and leaves the advice room's alone", async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'h1', content: { data: { room: 'horror', index: 5 } } },
      { identifier: 'a1', content: { data: { room: 'advice', index: 3 } } },
      { identifier: 'legacy', content: { data: { quote: 12 } } },
    ]);
    await syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0));

    expect(mocked.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    const cancelled = mocked.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]);
    // Not 'legacy' either — that one is the advice room's, from before rooms
    // had names, and this room has no claim on it.
    expect(cancelled).toEqual(['h1']);
  });

  it('tags every story it schedules, so it can find them again', async () => {
    await syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0));
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.content.data.room).toBe('horror');
      expect(typeof call.content.data.index).toBe('number');
    }
  });

  it('swallows a refusal from the native side', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('no'));
    await expect(syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0))).resolves.toBeUndefined();
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalled();
  });
});

describe('the tap', () => {
  it('reads the story index off its own notification', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'horror', index: 12 } } } },
    });
    expect(await readTapTarget()).toBe(12);
  });

  // An index into the book is meaningless against this corpus, and the advice
  // room's legacy untagged cards must not be read here either.
  it("returns null on the advice room's notifications, tagged or legacy", async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'advice', index: 12 } } } },
    });
    expect(await readTapTarget()).toBeNull();

    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { quote: 12 } } } },
    });
    expect(await readTapTarget()).toBeNull();
  });

  it('ignores another room on the live listener too', () => {
    const handler = jest.fn();
    onTap(handler);
    const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];

    listener({ notification: { request: { content: { data: { room: 'advice', index: 4 } } } } });
    expect(handler).not.toHaveBeenCalled();

    listener({ notification: { request: { content: { data: { room: 'horror', index: 4 } } } } });
    expect(handler).toHaveBeenCalledWith(4);
  });
});
