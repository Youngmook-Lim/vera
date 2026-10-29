import { LINES, SOURCE } from '../lines';

// lines.ts is generated from two web pages, so nothing else can catch it going
// wrong. These are the invariants the poster, the deck and the list assume.
describe('the affirmations', () => {
  it('holds every line the reviewed run produced', () => {
    expect(LINES).toHaveLength(155);
  });

  it('carries no empty or untrimmed line', () => {
    for (const line of LINES) expect(line.trim()).toBe(line);
    expect(LINES.every((l) => l.length > 0)).toBe(true);
  });

  it('carries no exact duplicate', () => {
    expect(new Set(LINES).size).toBe(LINES.length);
  });

  // A card's numeral is where it lives in this file. A re-run that reordered it
  // would renumber every card under the subject's thumb.
  it('keeps the 101-best page first, in its own order', () => {
    expect(LINES[0]).toBe('I am allowed to begin again.');
    expect(LINES[1].startsWith('Today is enough, and so am I.')).toBe(true);
  });

  it('names her and both pages', () => {
    expect(SOURCE.author).toBe('Louise Hay');
    expect(SOURCE.urls).toEqual([
      'https://www.louisehay.com/101-best-louise-hay-positive-affirmations/',
      'https://www.louisehay.com/affirmations/',
    ]);
  });
});
