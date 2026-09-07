import { useEffect } from 'react';
import { create } from 'zustand';
import { KEYS, storage } from '../../core/storage';
import { type Favorites, toggle } from '../favorites';
import { type Stored, parse, serialize } from './stored';

// The stories you kept and whether the turn is withheld, owned by the room
// that shows them. She is told none of it, so none of it reaches her context
// and none of it belongs in the soul store. The deck is deliberately NOT here
// — it is reshuffled every time the room opens, the same as the advice room's.

// The same bargain every module store strikes: a failed write costs this
// session's marks and nothing else, and must never reach the void call site as
// an unhandled rejection.
const save = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.horror, serialize(stored));
  } catch {
    // an unwritable disk — kept for this session only
  }
};

interface HorrorState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (key: string) => Promise<void>;
  setHidden: (hidden: boolean) => Promise<void>;
}

// Both halves of the room mount asking for the same hydration. The flag alone
// would let two callers past the guard before either finished, so the second
// waits on the first's promise instead of reading the disk twice.
let inFlight: Promise<void> | null = null;

export const useHorrorStore = create<HorrorState>((set, get) => ({
  hydrated: false,
  favorites: new Set<string>(),
  hidden: true,

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.horror);
      } catch {
        // unreadable disk — the room opens hidden with nothing kept
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  toggleFavorite: async (key: string): Promise<void> => {
    await get().hydrate();
    const favorites = toggle(get().favorites, key);
    set({ favorites });
    await save({ ...get(), favorites });
  },

  // Hydrate first for the same reason the advice room does: `save` spreads
  // whatever `get()` holds, so writing before the disk has been read would
  // rewrite the record with `favorites` still the empty initial Set and erase
  // every kept story.
  setHidden: async (hidden: boolean): Promise<void> => {
    await get().hydrate();
    set({ hidden });
    await save({ ...get(), hidden });
  },
}));

// Everything that shows a star or withholds a turn goes through this: it
// subscribes to the live state and makes sure something has read the disk.
export const useHorror = (): {
  favorites: Favorites;
  toggleFavorite: (key: string) => Promise<void>;
  hidden: boolean;
  setHidden: (hidden: boolean) => Promise<void>;
} => {
  const favorites = useHorrorStore((s) => s.favorites);
  const toggleFavorite = useHorrorStore((s) => s.toggleFavorite);
  const hidden = useHorrorStore((s) => s.hidden);
  const setHidden = useHorrorStore((s) => s.setHidden);
  const hydrate = useHorrorStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { favorites, toggleFavorite, hidden, setHidden };
};
