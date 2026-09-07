import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../../daily';
import { onTap, permissionState, readTapTarget, requestDaily, syncDaily } from '../notify';
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
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  // The blanket cancel is gone: it would take the horror room's horizon with
  // it, at any hour its own toggle happened to be flipped.
  it("cancels its own pending cards and leaves another room's alone", async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'a1', content: { data: { room: 'advice', index: 3 } } },
      { identifier: 'h1', content: { data: { room: 'horror', index: 9 } } },
      { identifier: 'legacy', content: { data: { quote: 12 } } },
    ]);
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));

    expect(mocked.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    const cancelled = mocked.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]);
    // 'legacy' is one of this room's own, scheduled before rooms had names.
    expect(cancelled.sort()).toEqual(['a1', 'legacy']);
  });

  // The text has to be inside the notification before Android takes it:
  // nothing of ours is awake at nine to choose one.
  it('writes the quote and the book into every card', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('EXCELLENT ADVICE');
    expect(content.data.room).toBe('advice');
    expect(typeof content.data.index).toBe('number');
    expect(content.body).toContain(QUOTES[content.data.index]);
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
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'a1', content: { data: { room: 'advice', index: 3 } } },
    ]);
    await syncDaily(false, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a1');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  // An icon is a courtesy. A phone that refuses to schedule, or a build with no
  // native module in it, must never be the reason the room fails to open.
  it('swallows a refusal from the native side', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('no'));
    await expect(syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0))).resolves.toBeUndefined();
    // The resolve alone would also pass for a syncDaily that did nothing at
    // all — this proves the loop actually ran and hit the rejection.
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalled();
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

describe('the tap target', () => {
  it('reads the index off a real notification response', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'advice', index: 41 } } } },
    });
    expect(await readTapTarget()).toBe(41);
  });

  // Ninety of these may be sitting in Android's queue from before the rename.
  it('still reads a card scheduled before rooms had names', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { quote: 41 } } } },
    });
    expect(await readTapTarget()).toBe(41);
  });

  // Another room's tap is not this one's to answer, and its index means
  // nothing against this corpus.
  it("returns null on another room's notification", async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'horror', index: 41 } } } },
    });
    expect(await readTapTarget()).toBeNull();
  });

  it('returns null on an ordinary cold start with no tap', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue(null);
    expect(await readTapTarget()).toBeNull();
  });

  it('returns null when the data carries no quote', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: {} } } },
    });
    expect(await readTapTarget()).toBeNull();
  });

  it('returns null when the index is not a number', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'advice', index: 'nope' } } } },
    });
    expect(await readTapTarget()).toBeNull();
  });
});

describe('the tap listener', () => {
  it('invokes the handler with the index when the listener fires', () => {
    const handler = jest.fn();
    onTap(handler);
    const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];
    listener({ notification: { request: { content: { data: { room: 'advice', index: 7 } } } } });
    expect(handler).toHaveBeenCalledWith(7);
  });

  it("ignores another room's notification", () => {
    const handler = jest.fn();
    onTap(handler);
    const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];
    listener({ notification: { request: { content: { data: { room: 'horror', index: 7 } } } } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not invoke the handler when the response carries no usable index', () => {
    const handler = jest.fn();
    onTap(handler);
    const listener = mocked.addNotificationResponseReceivedListener.mock.calls[0][0];
    listener({ notification: { request: { content: { data: {} } } } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns a callable unsubscribe that calls remove()', () => {
    const unsubscribe = onTap(jest.fn());
    const { remove } = mocked.addNotificationResponseReceivedListener.mock.results[0].value;
    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});
