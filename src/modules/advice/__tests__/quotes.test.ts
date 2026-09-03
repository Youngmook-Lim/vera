import { QUOTES, SOURCE } from '../quotes';

// quotes.ts is generated from a Kindle export that is not in this repo, so
// nothing else can catch it going wrong. These are the invariants the screen
// and the deck both assume.
describe('the quotes', () => {
  it('holds every highlight from the export', () => {
    expect(QUOTES).toHaveLength(232);
  });

  it('carries no empty card', () => {
    for (const quote of QUOTES) expect(quote.trim()).toBe(quote);
    expect(QUOTES.every((q) => q.length > 0)).toBe(true);
  });

  it('carries no duplicate', () => {
    expect(new Set(QUOTES).size).toBe(QUOTES.length);
  });

  it('names the book it came from', () => {
    expect(SOURCE.author).toBe('Kevin Kelly');
    expect(SOURCE.title).toBe("Excellent Advice for Living: Wisdom I Wish I'd Known Earlier");
    // The subtitle is too long to sit under a card; the attribution uses this.
    expect(SOURCE.shortTitle).toBe('Excellent Advice for Living');
  });
});
