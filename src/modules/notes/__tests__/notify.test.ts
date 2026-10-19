import * as Notifications from 'expo-notifications';
import { readTapTarget as adviceTap } from '../../advice/notify';
import { CHANNEL, cancelNote, readTapTarget, reconcile, scheduleNote } from '../notify';
import type { Note } from '../stored';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, face: 'calm', ...over,
});

const queued = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req);
const cancelled = () => mocked.cancelScheduledNotificationAsync.mock.calls.map(([i]) => i);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('a note handed to Android', () => {
  it('asks for one repeating trigger per day it is set for', async () => {
    await scheduleNote(note());

    expect(queued()).toHaveLength(3);
    for (const r of queued()) {
      expect(r.trigger.type).toBe('weekly');
      expect(r.trigger.hour).toBe(9);
      expect(r.trigger.minute).toBe(0);
    }
    expect(queued().map((r) => r.trigger.weekday)).toEqual([2, 4, 6]);
  });

  // The whole reason makeDaily is unused: a note's text never varies, so it
  // repeats forever instead of being re-planned inside a horizon.
  it('repeats rather than being dated', async () => {
    await scheduleNote(note());
    for (const r of queued()) expect(r.trigger.date).toBeUndefined();
  });

  it('carries the note’s own words, and its id', async () => {
    await scheduleNote(note());
    for (const r of queued()) {
      expect(r.content.body).toBe('Stay positive');
      expect(r.content.data).toEqual({ room: 'notes', id: 'n1', face: 'calm' });
    }
  });

  // Never her name: she did not compose this and is not told it exists.
  it('is sent by the room, not by her', async () => {
    await scheduleNote(note());
    for (const r of queued()) expect(r.content.title).not.toBe('V.E.R.A.');
  });

  // channelId rides on the TRIGGER — WeeklyTriggerInput carries the field and
  // the content type rejects it.
  it('is filed under this room’s channel, named on the trigger', async () => {
    await scheduleNote(note());

    for (const r of queued()) expect(r.trigger.channelId).toBe(CHANNEL);
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      CHANNEL, expect.objectContaining({ enableVibrate: true }),
    );
  });

  it('asks for nothing while it is switched off', async () => {
    await scheduleNote(note({ enabled: false }));
    expect(queued()).toHaveLength(0);
  });
});

describe('cancelling', () => {
  const pending = (id: string, identifier: string) => ({
    identifier, content: { data: { room: 'notes', id } },
  });

  it('takes only the note it was asked for', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      pending('n1', 'a'), pending('n1', 'b'), pending('n2', 'c'),
    ]);

    await cancelNote('n1');

    expect(cancelled()).toEqual(['a', 'b']);
  });

  // The room check is not redundant beside the id check. No room carries an
  // `id` today — they carry `index` — so a test using their real payloads
  // passes with `owns` deleted. A future room that did would have its cards
  // cancelled by this one, silently.
  it('will not take a foreign card that happens to share an id', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'foreign', content: { data: { room: 'advice', id: 'n1' } } },
      { identifier: 'mine', content: { data: { room: 'notes', id: 'n1' } } },
    ]);

    await cancelNote('n1');

    expect(cancelled()).toEqual(['mine']);
  });

  it('leaves the rooms’ cards and her transmissions alone', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'x', content: { data: { room: 'advice', index: 3 } } },
      { identifier: 'y', content: { data: { room: 'transmission.midday', index: 1 } } },
    ]);

    await cancelNote('n1');

    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('the boot reconcile', () => {
  it('leaves one set however many times it runs', async () => {
    await reconcile([note()]);
    const first = queued().length;
    expect(first).toBe(3);

    jest.clearAllMocks();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
      Array.from({ length: first }, (_, i) => ({
        identifier: `i${i}`, content: { data: { room: 'notes', id: 'n1' } },
      })),
    );

    await reconcile([note()]);

    expect(cancelled()).toHaveLength(first);
    expect(queued()).toHaveLength(first);
  });

  it('schedules nothing for a list of switched-off notes', async () => {
    await reconcile([note({ enabled: false }), note({ id: 'n2', enabled: false })]);
    expect(queued()).toHaveLength(0);
  });
});

// A tap on a note must never be read as an index into a room's corpus.
describe('the rooms and this room do not read each other’s cards', () => {
  it('leaves a note to module 03', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'notes', id: 'n1' } } } },
    });
    expect(await adviceTap()).toBeNull();
  });

  it('and this room does not read theirs', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'advice', index: 3 } } } },
    });
    expect(await readTapTarget()).toBeNull();
  });

  it('reads its own', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'notes', id: 'n7' } } } },
    });
    expect(await readTapTarget()).toBe('n7');
  });
});

describe('the face a note wears', () => {
  it('rides on every one of its cards', async () => {
    await scheduleNote(note({ face: 'suspicious' }));
    expect(queued().length).toBeGreaterThan(0);
    for (const r of queued()) expect(r.content.data.face).toBe('suspicious');
  });
});
