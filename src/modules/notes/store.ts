import { create } from 'zustand';
import { KEYS, storage } from '../../core/storage';
import { cancelNote, reconcile, requestNotes, scheduleNote } from './notify';
import { MAX_NOTES } from './schedule';
import { type Note, type Stored, parse, serialize } from './stored';

// The notes the subject has written, and the one path every change takes:
// write the disk, then tell Android. She is never told any of this exists.

const write = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.notes, serialize(stored));
  } catch {
    // an unwritable disk — the note is kept for this session only
  }
};

// It only has to be unique among twenty.
const newId = (): string =>
  `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export type Draft = Omit<Note, 'id'> & { id?: string };

interface NotesState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  save: (draft: Draft) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  setEnabled: (id: string, on: boolean) => Promise<void>;
  reconcileAll: () => Promise<void>;
}

// Both halves of the room mount asking for the same hydration. The flag alone
// would let two callers past the guard before either finished.
let inFlight: Promise<void> | null = null;

export const useNotesStore = create<NotesState>((set, get) => ({
  hydrated: false,
  notes: [],

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.notes);
      } catch {
        // unreadable disk — the room opens empty
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  // Returns whether it was saved, which is NOT what was asked for when the
  // permission is refused or the list is full. Android never re-prompts once
  // refused, so a note that will never arrive must not be left on the disk
  // looking as though it will.
  save: async (draft: Draft): Promise<boolean> => {
    await get().hydrate();

    const editing = draft.id != null && get().notes.some((n) => n.id === draft.id);
    if (!editing && get().notes.length >= MAX_NOTES) return false;

    // The ceremony is Android's and it belongs to the FIRST note. Asking again
    // on every save would be a dialog between the subject and a note they have
    // already written.
    if (get().notes.length === 0 && !(await requestNotes())) return false;

    const note: Note = {
      id: draft.id ?? newId(),
      text: draft.text,
      hour: draft.hour,
      minute: draft.minute,
      days: [...draft.days],
      enabled: draft.enabled,
    };

    const notes = editing
      ? get().notes.map((n) => (n.id === note.id ? note : n))
      : [...get().notes, note];

    set({ notes });
    await write({ notes });

    // The old triggers come down FIRST: they carry this id, and an edit that
    // scheduled before cancelling would cancel what it had just put up.
    if (editing) await cancelNote(note.id);
    await scheduleNote(note);
    return true;
  },

  remove: async (id: string): Promise<void> => {
    await get().hydrate();
    const notes = get().notes.filter((n) => n.id !== id);
    set({ notes });
    await write({ notes });
    await cancelNote(id);
  },

  setEnabled: async (id: string, on: boolean): Promise<void> => {
    await get().hydrate();
    const notes = get().notes.map((n) => (n.id === id ? { ...n, enabled: on } : n));
    set({ notes });
    await write({ notes });

    const note = notes.find((n) => n.id === id);
    await cancelNote(id);
    if (note && on) await scheduleNote(note);
  },

  // The boot path. Idempotent, so a queue that has drifted puts itself right.
  reconcileAll: async (): Promise<void> => {
    await get().hydrate();
    await reconcile(get().notes);
  },
}));
