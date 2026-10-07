import { useEffect } from 'react';
import { create } from 'zustand';
import type { Lang } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { dueForSync } from '../daily';
import { type Deck, newDeck } from '../deck';
import { type Favorites, toggle } from '../favorites';
import { requestNightly, syncNightly } from './notify';
import { STORIES } from './stories';
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
  // The pass through the shelf. It lives here rather than in the screen's own
  // useState (2026-09-22) so that walking out of the room and back in does not
  // reshuffle — a half-finished pass is worth keeping, and starting over meant
  // seeing a story again long before the other 6,860 had been dealt.
  //
  // NOT in `Stored`, deliberately, so it is never written to disk: `serialize`
  // picks its fields by name, and a 6,861-entry order has no business in a
  // blob. The deck dies with the process, and an app restart is the one
  // boundary that still resets the shuffle.
  deck: Deck;
  // An updater rather than a value, so every call site reads exactly as it did
  // when this was useState.
  setDeck: (next: (deck: Deck) => Deck) => void;
  hydrate: () => Promise<void>;
  toggleFavorite: (key: string) => Promise<void>;
  setHidden: (hidden: boolean) => Promise<void>;
  setNightly: (on: boolean, lang: Lang) => Promise<boolean>;
  syncIfDue: (lang: Lang, now?: Date) => Promise<void>;
}

// Both halves of the room mount asking for the same hydration. The flag alone
// would let two callers past the guard before either finished, so the second
// waits on the first's promise instead of reading the disk twice.
let inFlight: Promise<void> | null = null;

export const useHorrorStore = create<HorrorState>((set, get) => ({
  hydrated: false,
  // Shuffled once, when this module is first imported — which is app start.
  deck: newDeck(STORIES.length),
  setDeck: (next) => set((st) => ({ deck: next(st.deck) })),
  favorites: new Set<string>(),
  hidden: true,
  nightly: false,
  syncedOn: null,

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

  // Returns whether it is on afterwards, which is NOT what was asked for when
  // the permission is refused. Android never re-prompts, so a refusal has to
  // leave the store off or the row would read ON over a phone that will never
  // show a story.
  setNightly: async (on: boolean, lang: Lang): Promise<boolean> => {
    // SYSTEM can reach this before the room itself has ever mounted, so
    // nothing has hydrated the store yet — and `save` spreads whatever `get()`
    // holds. Skipping this would rewrite the disk record with `favorites`
    // still the empty initial Set and erase every kept story.
    await get().hydrate();
    if (on && !(await requestNightly())) {
      return false;
    }
    const now = new Date();
    // The stamp lands only once Android has actually taken the horizon. Two
    // separate facts: `nightly` is what the subject asked for, `syncedOn` is
    // whether it took. Stamped before the work, a refusal read as a finished
    // day — and `dueForSync` compares the stamp to today, so it cost a full
    // day of silence under a row still reading ON.
    set({ nightly: on });
    const ok = await syncNightly(on, lang, now);
    const syncedOn = on && ok ? now.toDateString() : null;
    set({ syncedOn });
    await save({ ...get(), nightly: on, syncedOn });
    return on;
  },

  // The boot path's entry point. A sync rewrites this room's whole horizon, so
  // this does nothing at all on the second launch of a day.
  syncIfDue: async (lang: Lang, now: Date = new Date()): Promise<void> => {
    const { nightly, syncedOn } = get();
    if (!nightly) return;
    if (!dueForSync(syncedOn, now)) return;

    // Stamped on the way out, not the way in. The re-entrancy this used to
    // guard against is `sync`'s own business now (`serialise` in notify.ts), so
    // the stamp is free to mean what it says: today's horizon is in the queue.
    if (!(await syncNightly(true, lang, now))) return;

    const stamp = now.toDateString();
    set({ syncedOn: stamp });
    await save({ ...get(), syncedOn: stamp });
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
