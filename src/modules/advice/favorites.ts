// Which cards you kept, and how that reorders the list. Pure — no React, no
// storage. She is told none of it, the same as the specimen's hunger.
export type Favorites = ReadonlySet<string>;

export const toggle = (favorites: Favorites, quote: string): Set<string> => {
  const next = new Set(favorites);
  if (!next.delete(quote)) next.add(quote);
  return next;
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
