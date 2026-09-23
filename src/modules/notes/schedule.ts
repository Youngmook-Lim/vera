import type { Note } from './stored';

// The only arithmetic in this room, in the only file allowed to do it.
//
// "Weekday" means three different things here and they are one apart:
//
//   Date.getDay()   0-6, Sunday first   <- what a Note stores
//   expo's weekday  1-7, Sunday first   <- what a trigger wants
//   the row         Monday first        <- what the subject reads
//
// The STORED one is the platform's, not the library's: a note on disk should
// not carry expo-notifications' convention in it forever.

export const toExpoWeekday = (day: number): number => day + 1;

// The row reads Monday to Sunday, which is neither of the other two.
export const DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export interface WeeklyTrigger {
  weekday: number;
  hour: number;
  minute: number;
}

// One per day the note is set for, in day order rather than the order they
// were tapped, so two notes with the same days queue identically.
//
// A note that is off, or has no day, asks for nothing — which is what makes
// the switch and an emptied day row the same operation to everything
// downstream, rather than two cases every caller has to know about.
export const triggersFor = (note: Note): WeeklyTrigger[] => {
  if (!note.enabled) return [];
  return [...note.days]
    .sort((a, b) => a - b)
    .map((day) => ({ weekday: toExpoWeekday(day), hour: note.hour, minute: note.minute }));
};

// Twenty notes at seven days each is 140 pending notifications, on top of the
// rooms' 180 and the transmissions' 28. There is no documented Android
// ceiling, so this stays well clear of an untested one.
export const MAX_NOTES = 20;

// The horror corpus caps its sentences here for the same reason: past this a
// notification body is truncated by the launcher, and the card it opens to
// stops being a card.
export const MAX_TEXT = 200;

// The picker is built rather than imported, and sixty positions is a worse
// control than twelve. One constant if that turns out to be wrong.
export const MINUTE_STEP = 5;

export const isSavable = (draft: { text: string; days: readonly number[] }): boolean =>
  draft.text.trim().length > 0 && draft.text.length <= MAX_TEXT && draft.days.length > 0;
