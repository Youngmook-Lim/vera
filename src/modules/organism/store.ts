import { useEffect } from 'react';
import { create } from 'zustand';
import { KEYS, storage } from '../../core/storage';
import { START_HUNGER, feed as feedHunger, hungerForNow } from './hunger';

// Specimen-03's state, owned by the module that shows it. She is not told it
// exists, so none of this reaches her context and none of it belongs in the
// soul store. The tile in the cabinet and the room itself both read from here,
// which is why this is a store and not local state in the screen: a feed
// inside the room must be true on the tile the moment you walk back out.

interface OrganismBlob {
  hunger: number;
  hungerAt: string | null;
}

// THE HUNGER INVARIANT: `hunger` and `hungerAt` are always a consistent pair —
// the number is the specimen's hunger AT that instant, never a value that has
// drifted since. hydrate re-derives hunger for `now` as stored-plus-drift, so
// persisting the live (already drifted) hunger beside an OLDER timestamp makes
// hydrate apply the same drift a second time; within a few sessions the
// specimen pins at 100 and never stops suffering.
//
// Only feed (a real feed) and hydrate (which measures hunger for now) may set
// either field, and both always set both.
//
// A failed write is the same bargain the soul store strikes: this turn does
// not survive a restart, and nothing else is lost. It must never reach the
// void-call sites as an unhandled rejection.
const save = async (blob: OrganismBlob): Promise<void> => {
  try {
    await storage.set(KEYS.organism, JSON.stringify(blob));
  } catch {
    // an unwritable disk — the specimen is fed for this session only
  }
};

interface OrganismState {
  hydrated: boolean;
  hunger: number;
  hungerAt: string | null;
  hydrate: () => Promise<void>;
  feed: () => Promise<void>;
}

// Both the tile and the room mount asking for the same hydration. The store
// flag alone would let two callers past the guard before either finished, so
// the second waits on the first's promise instead of re-reading and drifting
// the specimen twice.
let inFlight: Promise<void> | null = null;

export const useOrganismStore = create<OrganismState>((set, get) => ({
  hydrated: false,
  hunger: START_HUNGER,
  hungerAt: null,

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let saved: Record<string, unknown> | null = null;
      try {
        const raw = await storage.get(KEYS.organism);
        saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch {
        // unreadable disk or a corrupt record — the specimen starts over
        saved = null;
      }

      // The stored pair, read as a pair (THE HUNGER INVARIANT above). Hunger
      // is not read back as stored — it is stored-plus-drift, so the specimen
      // is hungrier than you left it (spec §12) — and the drifted value is
      // hunger as of NOW, so now is the instant it was measured at. An
      // unanchored specimen (never fed, nothing stored) stays unanchored and
      // reads START_HUNGER.
      const storedAt = typeof saved?.hungerAt === 'string' ? saved.hungerAt : null;
      set({
        hydrated: true,
        hunger: hungerForNow(
          typeof saved?.hunger === 'number' ? saved.hunger : null,
          storedAt,
          new Date(),
        ),
        hungerAt: storedAt == null ? null : new Date().toISOString(),
      });
    })();

    await inFlight;
    inFlight = null;
  },

  // The one place a real feed happens, and one of only two allowed to touch
  // the pair — the new value is measured now.
  feed: async (): Promise<void> => {
    const blob: OrganismBlob = {
      hunger: feedHunger(get().hunger),
      hungerAt: new Date().toISOString(),
    };
    set(blob);
    await save(blob);
  },
}));

// Everything that shows the specimen goes through this: it subscribes to the
// live number and makes sure something has read the disk first.
export const useOrganism = (): { hunger: number; feed: () => Promise<void> } => {
  const hunger = useOrganismStore((s) => s.hunger);
  const feed = useOrganismStore((s) => s.feed);
  const hydrate = useOrganismStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { hunger, feed };
};
