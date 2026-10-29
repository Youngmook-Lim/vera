import type { Favorites } from '../favorites';

// The whole of what module 04 keeps on disk. The deck is not here, for the
// advice room's reason: a pass dies with the process.
export interface Stored {
  // Keyed by the line's own words, never its position. A re-run of the script
  // that moved a line must not move a favourite with it.
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
