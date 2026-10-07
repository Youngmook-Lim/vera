import { useEffect } from 'react';
import { create } from 'zustand';
import type { Lang } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { dueForSync } from '../daily';
import { type Deck, newDeck } from '../deck';
import { type Favorites, toggle } from '../favorites';
import { requestDaily, syncDaily } from './notify';
import { QUOTES } from './quotes';
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
  // The pass through the book. It lives here rather than in the screen's own
  // useState (2026-09-22) so that walking out of the room and back in does not
  // reshuffle — a half-finished pass is worth keeping, and starting over meant
  // seeing a card again long before the other 231 had been dealt.
  //
  // NOT in `Stored`, deliberately, so it is never written to disk: `serialize`
  // picks its fields by name, and the deck dies with the process. An app
  // restart is the one boundary that still resets the shuffle.
  deck: Deck;
  // An updater rather than a value, so every call site reads exactly as it did
  // when this was useState.
  setDeck: (next: (deck: Deck) => Deck) => void;
  hydrate: () => Promise<void>;
  toggleFavorite: (quote: string) => Promise<void>;
  setDaily: (on: boolean, lang: Lang) => Promise<boolean>;
  syncIfDue: (lang: Lang, now?: Date) => Promise<void>;
}

// Both halves of the room mount asking for the same hydration. The flag alone
// would let two callers past the guard before either finished, so the second
// waits on the first's promise instead of reading the disk twice.
let inFlight: Promise<void> | null = null;

export const useAdviceStore = create<AdviceState>((set, get) => ({
  hydrated: false,
  // Shuffled once, when this module is first imported — which is app start.
  deck: newDeck(QUOTES.length),
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
    await get().hydrate();
    const favorites = toggle(get().favorites, quote);
    set({ favorites });
    await save({ ...get(), favorites });
  },

  // Returns whether it is on afterwards, which is NOT what was asked for when
  // the permission is refused. Android never re-prompts, so a refusal has to
  // leave the store off or the row would read ON over a phone that will never
  // show a card.
  setDaily: async (on: boolean, lang: Lang): Promise<boolean> => {
    // SYSTEM can reach this before the room itself has ever mounted, so
    // nothing has hydrated the store yet — and `save` below spreads whatever
    // `get()` holds. Skipping this would rewrite the disk record with
    // `favorites` still the empty initial Set, erasing every kept quote.
    await get().hydrate();
    if (on && !(await requestDaily())) {
      return false;
    }
    const now = new Date();
    // The stamp lands only once Android has actually taken the horizon. Two
    // separate facts: `daily` is what the subject asked for, `syncedOn` is
    // whether it took. Stamped before the work, a refusal read as a finished
    // day — and `dueForSync` compares the stamp to today, so it cost a full
    // day of silence under a row still reading ON.
    set({ daily: on });
    const ok = await syncDaily(on, lang, now);
    const syncedOn = on && ok ? now.toDateString() : null;
    set({ syncedOn });
    await save({ ...get(), daily: on, syncedOn });
    return on;
  },

  // The boot path's entry point. A sync rewrites the whole horizon, so this
  // does nothing at all on the second launch of a day.
  syncIfDue: async (lang: Lang, now: Date = new Date()): Promise<void> => {
    const { daily, syncedOn } = get();
    if (!daily) return;
    if (!dueForSync(syncedOn, now)) return;

    // Stamped on the way out, not the way in. The re-entrancy this used to
    // guard against is `sync`'s own business now (`serialise` in notify.ts), so
    // the stamp is free to mean what it says: today's horizon is in the queue.
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
