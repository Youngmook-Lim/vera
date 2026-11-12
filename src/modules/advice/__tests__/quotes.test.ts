import { CORPUS, QUOTES, SOURCE } from '../quotes';

// Under Jest the room always deals the committed sample (jest/no-local-corpus.js),
// so these are the invariants the screen and the deck assume, checked on the
// deck every machine has.
describe('the quotes', () => {
  it('deals the committed sample under test', () => {
    expect(CORPUS).toBe('sample');
    expect(QUOTES).toHaveLength(50);
  });

  it('carries no empty card', () => {
    for (const quote of QUOTES) expect(quote.trim()).toBe(quote);
    expect(QUOTES.every((q) => q.length > 0)).toBe(true);
  });

  it('carries no duplicate', () => {
    expect(new Set(QUOTES).size).toBe(QUOTES.length);
  });

  it('names where it came from', () => {
    expect(SOURCE.author.length).toBeGreaterThan(0);
    expect(SOURCE.title.startsWith(SOURCE.shortTitle)).toBe(true);
  });
});

// The real deck is generated from a Kindle export that is not in this repo, so
// nothing else can catch it going wrong. Runs only where it has been built.
const local = (() => {
  try {
    return require('../quotes.local') as { QUOTES: readonly string[]; SOURCE: { author: string; shortTitle: string } };
  } catch {
    return null;
  }
})();

(local ? describe : describe.skip)('the local corpus', () => {
  it('holds every highlight from the export, with no empty card or duplicate', () => {
    const quotes = local!.QUOTES;
    expect(quotes).toHaveLength(232);
    for (const quote of quotes) expect(quote.trim()).toBe(quote);
    expect(new Set(quotes).size).toBe(quotes.length);
  });

  it('names the book it came from', () => {
    expect(local!.SOURCE.author).toBe('Kevin Kelly');
    expect(local!.SOURCE.shortTitle).toBe('Excellent Advice for Living');
  });
});
