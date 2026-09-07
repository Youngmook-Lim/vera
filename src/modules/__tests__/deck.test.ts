import { advance, current, goTo, newDeck } from '../deck';

// A deterministic stand-in for Math.random: hands back the given values in
// order and then repeats them, so a shuffle can be reasoned about exactly.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('the deck', () => {
  it('is a permutation of every card', () => {
    const deck = newDeck(10, seq(0.1, 0.7, 0.3, 0.9, 0.5));
    expect([...deck.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('deals every card exactly once before it runs out', () => {
    const rand = seq(0.1, 0.7, 0.3, 0.9, 0.5);
    let deck = newDeck(232, rand);
    const seen = [current(deck)];
    for (let i = 1; i < 232; i++) {
      deck = advance(deck, rand);
      seen.push(current(deck));
    }
    expect(new Set(seen).size).toBe(232);
  });

  it('reshuffles once the last card is dealt', () => {
    const rand = seq(0.1, 0.7, 0.3, 0.9, 0.5);
    let deck = newDeck(6, rand);
    for (let i = 0; i < 6; i++) deck = advance(deck, rand);
    expect(deck.at).toBe(0);
    expect([...deck.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  // The seam is the one place a repeat can happen: the last card of a pass
  // and the first of the next are drawn from different shuffles, so nothing
  // in the shuffle itself keeps them apart.
  it('never opens a new pass on the card that closed the old one', () => {
    // The first 0.9 deals [0, 1]; the 0.1 reshuffles it to [1, 0], which
    // would put card 1 up twice in a row.
    const rand = seq(0.9, 0.1);
    let deck = newDeck(2, rand);
    expect(current(deck)).toBe(0);
    deck = advance(deck, rand);
    expect(current(deck)).toBe(1);
    deck = advance(deck, rand);
    expect(current(deck)).toBe(0);
  });

  // Picking a card out of the list has to leave the counter truthful, so it
  // moves the position within this pass rather than starting a new one.
  it('moves to a named card without disturbing the pass', () => {
    const deck = newDeck(10, seq(0.1, 0.7, 0.3, 0.9, 0.5));
    const moved = goTo(deck, 7);
    expect(current(moved)).toBe(7);
    expect(moved.order).toEqual(deck.order);
  });

  it('stays put when there is only one card to deal', () => {
    const rand = seq(0.5);
    const deck = advance(newDeck(1, rand), rand);
    expect(current(deck)).toBe(0);
  });
});
