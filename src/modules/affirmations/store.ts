import { useEffect } from 'react';
import { create } from 'zustand';
import type { Lang } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { dueForSync } from '../daily';
import { type Deck, newDeck } from '../deck';
import { type Favorites, toggle } from '../favorites';
import { LINES } from './lines';
import { requestDaily, syncDaily } from './notify';
import { type Stored, parse, serialize } from './stored';

// The cards you kept, owned by the room that shows them. She is not told this
// exists. The advice room's store, line for line, because the bargain is the
// same: a failed write costs this session's marks and never reaches a void
// call site as an unhandled rejection.
const save = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.affirmations, serialize(stored));
  } catch {
    // an unwritable disk — the card is kept for this session only
  }
};

interface AffirmationsState extends Stored {
  hydrated: boolean;
  // The pass. Here rather than in the screen so walking out and back in does
  // not reshuffle; NOT in `Stored`, so a restart does.
  deck: Deck;
  setDeck: (next: (deck: Deck) => Deck) => void;
  hydrate: () => Promise<void>;
  toggleFavorite: (line: string) => Promise<void>;
  setDaily: (on: boolean, lang: Lang) => Promise<boolean>;
  syncIfDue: (lang: Lang, now?: Date) => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useAffirmationsStore = create<AffirmationsState>((set, get) => ({
  hydrated: false,
  deck: newDeck(LINES.length),
  setDeck: (next) => set((s) => ({ deck: next(s.deck) })),
  favorites: new Set<string>(),
  daily: false,
  syncedOn: null,

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.affirmations);
      } catch {
        // unreadable disk — the room opens with nothing kept
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  toggleFavorite: async (line: string): Promise<void> => {
    await get().hydrate();
    const favorites = toggle(get().favorites, line);
    set({ favorites });
    await save({ ...get(), favorites });
  },

  // Returns whether it is on afterwards, which is NOT what was asked for when
  // the permission is refused: Android never re-prompts.
  setDaily: async (on: boolean, lang: Lang): Promise<boolean> => {
    // SYSTEM can reach this before the room has mounted; without the hydrate,
    // `save` would write an empty set over every kept card.
    await get().hydrate();
    if (on && !(await requestDaily())) {
      return false;
    }
    const now = new Date();
    // Two facts: `daily` is what was asked for, `syncedOn` is whether Android
    // took it. The stamp lands only on success.
    set({ daily: on });
    const ok = await syncDaily(on, lang, now);
    const syncedOn = on && ok ? now.toDateString() : null;
    set({ syncedOn });
    await save({ ...get(), daily: on, syncedOn });
    return on;
  },

  syncIfDue: async (lang: Lang, now: Date = new Date()): Promise<void> => {
    const { daily, syncedOn } = get();
    if (!daily) return;
    if (!dueForSync(syncedOn, now)) return;
    if (!(await syncDaily(true, lang, now))) return;

    const stamp = now.toDateString();
    set({ syncedOn: stamp });
    await save({ ...get(), syncedOn: stamp });
  },
}));

// Everything that shows a star goes through this: it subscribes to the live
// set and makes sure something has read the disk first.
export const useFavorites = (): {
  favorites: Favorites;
  toggleFavorite: (line: string) => Promise<void>;
} => {
  const favorites = useAffirmationsStore((s) => s.favorites);
  const toggleFavorite = useAffirmationsStore((s) => s.toggleFavorite);
  const hydrate = useAffirmationsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { favorites, toggleFavorite };
};
