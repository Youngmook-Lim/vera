import { useEffect } from 'react';
import { create } from 'zustand';
import { KEYS, storage } from '../../core/storage';
import { type Favorites, toggle } from './favorites';
import { type Stored, parse, serialize } from './stored';

// The cards you kept, owned by the room that shows them. She is not told this
// exists, so none of it reaches her context and none of it belongs in the soul
// store. The deck itself is deliberately NOT here — it is reshuffled every time
// the room opens, and a pass you did not finish is not a thing worth keeping.

// The same bargain the organism store strikes: a failed write costs this
// session's marks and nothing else, and must never reach the void call site as
// an unhandled rejection.
const save = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.advice, serialize(stored));
  } catch {
    // an unwritable disk — the card is kept for this session only
  }
};

interface AdviceState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (quote: string) => Promise<void>;
}

// Both halves of the room mount asking for the same hydration. The flag alone
// would let two callers past the guard before either finished, so the second
// waits on the first's promise instead of reading the disk twice.
let inFlight: Promise<void> | null = null;

export const useAdviceStore = create<AdviceState>((set, get) => ({
  hydrated: false,
  favorites: new Set<string>(),
  daily: false,
  syncedOn: null,

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.advice);
      } catch {
        // unreadable disk — the room opens with nothing kept
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  toggleFavorite: async (quote: string): Promise<void> => {
    const favorites = toggle(get().favorites, quote);
    set({ favorites });
    await save({ ...get(), favorites });
  },
}));

// Everything that shows a star goes through this: it subscribes to the live
// set and makes sure something has read the disk first.
export const useFavorites = (): {
  favorites: Favorites;
  toggleFavorite: (quote: string) => Promise<void>;
} => {
  const favorites = useAdviceStore((s) => s.favorites);
  const toggleFavorite = useAdviceStore((s) => s.toggleFavorite);
  const hydrate = useAdviceStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { favorites, toggleFavorite };
};
