// Which cards you kept, and how that reorders the list. Pure — no React, no
// storage. She is told none of it, the same as the specimen's hunger.
//
// Shared by every room that keeps cards out of a fixed corpus (2026-09-07).
// A card is identified by a KEY the room chooses: the advice room uses the
// quote's own words, the horror room the two sentences joined. Never a
// position — a corpus regenerated at a different size renumbers everything,
// and an index-keyed favorite would then point at a different card.
export type Favorites = ReadonlySet<string>;

export const toggle = (favorites: Favorites, key: string): Set<string> => {
  const next = new Set(favorites);
  if (!next.delete(key)) next.add(key);
  return next;
};

// The list's order, as indices into the corpus. Stable in both halves: the
// kept cards stay in the corpus's own order and so does everything else, so
// the numeral on a row is always the card's number and never the row's.
export const displayOrder = (
  keys: readonly string[],
  favorites: Favorites,
  favoritesFirst: boolean,
): number[] => {
  const order = keys.map((_, i) => i);
  if (!favoritesFirst) return order;
  return [
    ...order.filter((i) => favorites.has(keys[i])),
    ...order.filter((i) => !favorites.has(keys[i])),
  ];
};
