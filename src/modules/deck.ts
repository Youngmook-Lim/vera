// The shuffle, and nothing else. No React, no storage — the deck lives for as
// long as the room is open and is rebuilt from scratch the next time it is.
//
// Shared by every room that deals from a fixed corpus (2026-09-07). It is pure
// and knows only a count, so it has no theme, no strings and nothing behind a
// doorway — which is why promoting it out of one room does not cross §4.
export interface Deck {
  order: number[];
  at: number;
}

// Injected so a test can reason about a shuffle exactly.
export type Rand = () => number;

const shuffled = (count: number, rand: Rand): number[] => {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

export const newDeck = (count: number, rand: Rand = Math.random): Deck => ({
  order: shuffled(count, rand),
  at: 0,
});

export const current = (deck: Deck): number => deck.order[deck.at];

// One card on, reshuffling when the pass runs out. The seam is the only place
// a repeat can happen — the last card of a pass and the first of the next come
// from different shuffles, so the shuffle itself cannot keep them apart. When
// the new order opens on the card just shown, it trades places with the last,
// which is a swap rather than a re-draw so an unlucky Rand cannot spin here.
export const advance = (deck: Deck, rand: Rand = Math.random): Deck => {
  if (deck.at + 1 < deck.order.length) return { order: deck.order, at: deck.at + 1 };

  const last = current(deck);
  const order = shuffled(deck.order.length, rand);
  if (order.length > 1 && order[0] === last) {
    [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
  }
  return { order, at: 0 };
};

// Picking a card out of the list. It moves the position within this pass
// rather than starting a new one, so the counter under the card keeps telling
// the truth about where you are.
export const goTo = (deck: Deck, card: number): Deck => ({
  order: deck.order,
  at: deck.order.indexOf(card),
});

// One card back, for a room you swipe through (module 04). It never crosses
// the seam: the previous pass's order was thrown away when `advance` dealt a
// new one, so the first card of a pass is where going back stops. It hands
// back the SAME deck there rather than an equal one, which is how a caller
// tells that nothing moved.
export const retreat = (deck: Deck): Deck =>
  deck.at === 0 ? deck : { order: deck.order, at: deck.at - 1 };
