import { askBatteryUnrestricted, isBatteryUnrestricted } from '../../core/power';
import { type PermissionState, ensureChannel } from '../notify';
import { triggersFor } from './schedule';
import type { Note } from './stored';

export type { PermissionState };

// Everything this room says to expo-notifications. WHICH day and WHAT hour are
// decided in schedule.ts, which is pure; this hands the answer to Android and
// does nothing else.
//
// It does NOT use makeDaily, and the reason is the interesting one. Both rooms
// hand over ninety DATED notifications with their text baked in, because a
// repeating trigger cannot vary its content and theirs must. A note's text
// never varies — it is whatever the subject typed, and it is the same text
// next Tuesday — so a repeating WEEKLY trigger is exactly right here. It fires
// forever, with no horizon, no re-planning, and no silence after a fortnight
// away from the app.

type Notifs = typeof import('expo-notifications');

// Lazily required, like every other caller of this module: a build without the
// native module in it must degrade to doing nothing rather than throwing at
// import time and taking the whole app with it.
const load = (): Notifs | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as Notifs;
  } catch {
    return null;
  }
};

export const CHANNEL = 'notes.v1';

// Not translated, matching both rooms. This is the name Android shows in its
// own settings, and it must not change under the subject when they switch
// language — the switch they silenced last week would be a different row today.
const CHANNEL_NAME = 'NOTES TO MYSELF';

const ROOM = 'notes';

interface Payload {
  room?: unknown;
  id?: unknown;
}

const dataOf = (request: unknown): Payload =>
  ((request as { content?: { data?: unknown } })?.content?.data as Payload) ?? {};

const owns = (data: Payload): boolean => data.room === ROOM;
const idOf = (data: Payload): string | null => (typeof data.id === 'string' ? data.id : null);

export const scheduleNote = async (note: Note): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    await ensureChannel({ channel: CHANNEL, channelName: CHANNEL_NAME });

    for (const { weekday, hour, minute } of triggersFor(note)) {
      await N.scheduleNotificationAsync({
        // The title is the room's, never hers. She did not compose this and is
        // not told it exists — putting her name on it is the thing
        // `systemNotice` is styled to prevent.
        content: { title: CHANNEL_NAME, body: note.text, data: { room: ROOM, id: note.id } },
        // `channelId` rides on the TRIGGER, not the content: WeeklyTriggerInput
        // carries the field and the content type rejects it. Naming no channel
        // does not fall back to the one just created — Android files the card
        // under expo's own fallback channel instead.
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: CHANNEL,
        },
      });
    }
  } catch {
    // A phone that refuses to schedule must never be why the note fails to save.
  }
};

// Only this note's. Matching the id as well as the room is what lets an edit
// replace one note's triggers without disturbing another's — the rooms cancel
// per ROOM, and this room holds many independent things.
export const cancelNote = async (id: string): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    const pending = await N.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      const data = dataOf(item);
      if (owns(data) && idOf(data) === id) {
        await N.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch {
    // nothing to be done, and nothing that should reach the caller
  }
};

// Cancel everything this room owns, then schedule every enabled note. Runs at
// boot: idempotent, cheap at this volume, and what lets a queue that has
// drifted — a failed write, a half-applied edit — put itself right without the
// subject ever knowing it was wrong.
export const reconcile = async (notes: readonly Note[]): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    const pending = await N.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      if (owns(dataOf(item))) await N.cancelScheduledNotificationAsync(item.identifier);
    }
  } catch {
    // Fall through and schedule anyway: too many is recoverable, none is not.
  }
  for (const note of notes) await scheduleNote(note);
};

export const notesPermission = async (): Promise<PermissionState> => {
  const N = load();
  if (!N) return 'blocked';
  try {
    const { granted, canAskAgain } = await N.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'ask' : 'blocked';
  } catch {
    return 'blocked';
  }
};

export const requestNotes = async (): Promise<boolean> => {
  const N = load();
  if (!N) return false;
  try {
    // The channel has to exist before the prompt, or the permission is granted
    // against nothing.
    await ensureChannel({ channel: CHANNEL, channelName: CHANNEL_NAME });
    const { granted } = await N.requestPermissionsAsync();

    // Permission is not delivery. Samsung's Freecess holds a frozen app's
    // alarms past their hour whatever Android has granted, and Battery →
    // Unrestricted is the only thing that lifts it. Writing the first note is
    // the moment that starts to matter. `=== false` is load-bearing: a null
    // means the module could not be read at all.
    if (granted && isBatteryUnrestricted() === false) {
      askBatteryUnrestricted();
    }
    return granted;
  } catch {
    return false;
  }
};

export const readTapTarget = async (): Promise<string | null> => {
  const N = load();
  if (!N) return null;
  try {
    const response = await N.getLastNotificationResponseAsync();
    const data = dataOf(
      (response as { notification?: { request?: unknown } })?.notification?.request,
    );
    return owns(data) ? idOf(data) : null;
  } catch {
    return null;
  }
};

export const onTap = (handler: (id: string) => void): (() => void) => {
  const N = load();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const data = dataOf(response?.notification?.request);
      if (!owns(data)) return;
      const id = idOf(data);
      if (id != null) handler(id);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
};
