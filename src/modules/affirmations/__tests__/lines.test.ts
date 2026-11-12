import { CORPUS, LINES, SOURCE } from '../lines';

// Under Jest the room always shows the committed sample (jest/no-local-corpus.js),
// so these are the invariants the poster, the deck and the list assume, checked
// on the deck every machine has.
describe('the affirmations', () => {
  it('shows the committed sample under test', () => {
    expect(CORPUS).toBe('sample');
    expect(LINES).toHaveLength(24);
  });

  it('carries no empty or untrimmed line', () => {
    for (const line of LINES) expect(line.trim()).toBe(line);
    expect(LINES.every((l) => l.length > 0)).toBe(true);
  });

  it('carries no exact duplicate', () => {
    expect(new Set(LINES).size).toBe(LINES.length);
  });

  // A card's numeral is where it lives in the file. A reorder would renumber
  // every card under the subject's thumb.
  it('keeps its own order', () => {
    expect(LINES[0]).toBe('I am allowed to begin again.');
    expect(LINES[1]).toBe('Today is enough, and so am I.');
  });

  it('names where it came from', () => {
    expect(SOURCE.author.length).toBeGreaterThan(0);
  });
});

// The real deck is generated from two web pages, so nothing else can catch it
// going wrong. Runs only where tools/build-affirmations.mjs has been run.
const local = (() => {
  try {
    return require('../lines.local') as { LINES: readonly string[]; SOURCE: { author: string; urls: readonly string[] } };
  } catch {
    return null;
  }
})();

(local ? describe : describe.skip)('the local corpus', () => {
  it('holds every line the reviewed run produced, with no empty line or duplicate', () => {
    const lines = local!.LINES;
    expect(lines).toHaveLength(155);
    for (const line of lines) expect(line.trim()).toBe(line);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('names her and both pages', () => {
    expect(local!.SOURCE.author).toBe('Louise Hay');
    expect(local!.SOURCE.urls).toEqual([
      'https://www.louisehay.com/101-best-louise-hay-positive-affirmations/',
      'https://www.louisehay.com/affirmations/',
    ]);
  });
});
