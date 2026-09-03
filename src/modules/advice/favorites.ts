// Which cards you kept, and how that reorders the list. Pure — no React, no
// storage. She is told none of it, the same as the specimen's hunger.
export type Favorites = ReadonlySet<string>;

// Keyed by the quote's own words, never by its position. The book's numbering
// is an artefact of one Kindle export; re-exporting renumbers every card, and
// an index-keyed favorite would then quietly point at a different quote.
interface Blob {
  favorites: string[];
}

export const toggle = (favorites: Favorites, quote: string): Set<string> => {
  const next = new Set(favorites);
  if (!next.delete(quote)) next.add(quote);
  return next;
};

export const serialize = (favorites: Favorites): string =>
  JSON.stringify({ favorites: [...favorites] } satisfies Blob);

// Anything that is not a list of strings is nothing kept, not a crash: a blob
// half-written by a dying process must cost you your favorites, not the room.
export const parse = (raw: string | null): Set<string> => {
  if (!raw) return new Set();
  try {
    const blob = JSON.parse(raw) as Partial<Blob>;
    if (!Array.isArray(blob.favorites)) return new Set();
    return new Set(blob.favorites.filter((q): q is string => typeof q === 'string'));
  } catch {
    return new Set();
  }
};

// The list's order, as indices into the book. Stable in both halves: the kept
// cards stay in the order the book puts them, and so does everything else, so
// the numeral on a row is always the book's number and never the row's.
export const displayOrder = (
  quotes: readonly string[],
  favorites: Favorites,
  favoritesFirst: boolean,
): number[] => {
  const order = quotes.map((_, i) => i);
  if (!favoritesFirst) return order;
  return [
    ...order.filter((i) => favorites.has(quotes[i])),
    ...order.filter((i) => !favorites.has(quotes[i])),
  ];
};
