import type { Favorites } from '../favorites';

// The whole of what this room keeps on disk, in one place — the same shape the
// advice room's `stored.ts` has, for the same reason.
export interface Stored {
  // Keyed by both sentences (see card.ts), never by position.
  favorites: Favorites;
  // Whether the second sentence is withheld until the card is tapped. Kept,
  // unlike the advice room's `favoritesFirst`: a sort is a way of looking at
  // one session, but how much you want to be spoiled is a standing preference
  // and having to set it again every time you walk in would be a nuisance.
  hidden: boolean;
  // The nightly story at ten. Off by default: a room that starts sending
  // notifications nobody asked for is a room that gets its permission revoked.
  nightly: boolean;
  syncedOn: string | null;
}

// Hidden by default: the room's whole point is the turn, and a first visit
// that spends every card at once is a worse introduction than one that asks.
export const EMPTY_STORED: Stored = {
  favorites: new Set<string>(),
  hidden: true,
  nightly: false,
  syncedOn: null,
};

interface Blob {
  favorites: string[];
  hidden: boolean;
  nightly: boolean;
  syncedOn: string | null;
}

export const serialize = (s: Stored): string =>
  JSON.stringify({
    favorites: [...s.favorites],
    hidden: s.hidden,
    nightly: s.nightly,
    syncedOn: s.syncedOn,
  } satisfies Blob);

// Anything that is not the shape expected is that field's default, never a
// throw. A blob half-written by a dying process, or one written before a field
// existed, must cost the field and not the room.
export const parse = (raw: string | null): Stored => {
  if (!raw) return { ...EMPTY_STORED, favorites: new Set<string>() };
  try {
    const blob = JSON.parse(raw) as Partial<Blob>;
    return {
      favorites: new Set(
        Array.isArray(blob.favorites)
          ? blob.favorites.filter((k): k is string => typeof k === 'string')
          : [],
      ),
      // Explicitly `!== false` rather than `=== true`: the default is ON, so a
      // blob written before this field existed must read as hidden, not as a
      // room that quietly stopped withholding anything.
      hidden: blob.hidden !== false,
      // The opposite default to `hidden`, and written the opposite way for the
      // same reason: off unless the blob explicitly says otherwise.
      nightly: blob.nightly === true,
      syncedOn: typeof blob.syncedOn === 'string' ? blob.syncedOn : null,
    };
  } catch {
    return { ...EMPTY_STORED, favorites: new Set<string>() };
  }
};
