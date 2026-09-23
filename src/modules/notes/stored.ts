// The whole of what module 03 keeps on disk. The first room whose corpus the
// subject writes, so unlike the two that deal from a fixed book, the content
// IS the stored thing rather than a set of marks against one.

export interface Note {
  // Carried on every notification and matched when cancelling, so it has to
  // survive an edit: changing a note's words or its hour keeps the id and
  // replaces its triggers.
  id: string;
  text: string;
  hour: number;
  minute: number;
  // Date.getDay()'s order, 0 = Sunday. See schedule.ts for why the stored
  // indexing is the platform's rather than expo's.
  days: readonly number[];
  // A switch, not a deletion. An alarm wanted back next month should not have
  // to be retyped.
  enabled: boolean;
}

export interface Stored {
  notes: readonly Note[];
}

export const EMPTY_STORED: Stored = { notes: [] };

export const serialize = (s: Stored): string =>
  JSON.stringify({
    notes: s.notes.map((n) => ({
      id: n.id, text: n.text, hour: n.hour, minute: n.minute,
      days: [...n.days], enabled: n.enabled,
    })),
  } satisfies Stored);

const isDay = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6;

const readNote = (v: unknown): Note | null => {
  const n = v as Partial<Note> | null;
  if (!n || typeof n !== 'object') return null;
  if (typeof n.id !== 'string' || n.id === '') return null;
  if (typeof n.text !== 'string') return null;
  if (typeof n.hour !== 'number' || n.hour < 0 || n.hour > 23) return null;
  if (typeof n.minute !== 'number' || n.minute < 0 || n.minute > 59) return null;
  if (!Array.isArray(n.days) || !n.days.every(isDay)) return null;
  if (typeof n.enabled !== 'boolean') return null;
  return {
    id: n.id, text: n.text, hour: n.hour, minute: n.minute,
    days: n.days, enabled: n.enabled,
  };
};

// A note missing a field is DROPPED rather than defaulted. Both rooms default
// a missing field and lose nothing by it, because theirs are preferences over
// a corpus that exists either way. Here the note IS the content: one with no
// hour has no correct hour to fall back to, and scheduling it at midnight
// would be the app inventing an instruction the subject never gave.
export const parse = (raw: string | null): Stored => {
  if (!raw) return EMPTY_STORED;
  try {
    const blob = JSON.parse(raw) as Partial<Stored>;
    if (!Array.isArray(blob.notes)) return EMPTY_STORED;
    return { notes: blob.notes.map(readNote).filter((n): n is Note => n !== null) };
  } catch {
    return EMPTY_STORED;
  }
};
