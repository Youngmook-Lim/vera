import type { Favorites } from './favorites';

// The whole of what module 02 keeps on disk, in one place. This used to live in
// favorites.ts, which was right while favorites were the only thing kept; the
// blob now holds three unrelated things and the file that owns it should not be
// named after one of them.
export interface Stored {
  // Keyed by the quote's own words, never by its position. The book's
  // numbering is an artefact of one Kindle export; re-exporting renumbers
  // every card, and an index-keyed favorite would then quietly point at a
  // different quote.
  favorites: Favorites;
  daily: boolean;
  syncedOn: string | null;
}

export const EMPTY_STORED: Stored = {
  favorites: new Set<string>(),
  daily: false,
  syncedOn: null,
};

interface Blob {
  favorites: string[];
  daily: boolean;
  syncedOn: string | null;
}

export const serialize = (s: Stored): string =>
  JSON.stringify({
    favorites: [...s.favorites],
    daily: s.daily,
    syncedOn: s.syncedOn,
  } satisfies Blob);

// Anything that is not the shape expected is that field absent, never a throw.
// A blob half-written by a dying process, or one written before a field
// existed, must cost the field and not the room.
export const parse = (raw: string | null): Stored => {
  if (!raw) return { ...EMPTY_STORED, favorites: new Set<string>() };
  try {
    const blob = JSON.parse(raw) as Partial<Blob>;
    return {
      favorites: new Set(
        Array.isArray(blob.favorites)
          ? blob.favorites.filter((q): q is string => typeof q === 'string')
          : [],
      ),
      daily: blob.daily === true,
      syncedOn: typeof blob.syncedOn === 'string' ? blob.syncedOn : null,
    };
  } catch {
    return { ...EMPTY_STORED, favorites: new Set<string>() };
  }
};
