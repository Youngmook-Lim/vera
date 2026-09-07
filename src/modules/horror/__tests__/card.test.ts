import { compactScore, storyKey } from '../card';
import { STORIES } from '../stories';

describe('the favorite key', () => {
  it('is both sentences, never the position', () => {
    const key = storyKey({ setup: 'He heard it.', turn: 'So did it.' });
    expect(key).toContain('He heard it.');
    expect(key).toContain('So did it.');
  });

  // Three setups collide across the corpus, so a key made of the first
  // sentence alone would let one kept card light up another.
  it('separates two stories that open the same way', () => {
    const a = storyKey({ setup: 'She smiled.', turn: 'It was not her face.' });
    const b = storyKey({ setup: 'She smiled.', turn: 'The mirror did not.' });
    expect(a).not.toBe(b);
  });

  it('is unique across the whole corpus', () => {
    expect(new Set(STORIES.map(storyKey)).size).toBe(STORIES.length);
  });
});

describe('the score', () => {
  it('reads whole under a thousand', () => {
    expect(compactScore(0)).toBe('0');
    expect(compactScore(999)).toBe('999');
  });

  it('turns thousands into one decimal place', () => {
    expect(compactScore(1000)).toBe('1.0k');
    expect(compactScore(1049)).toBe('1.0k');
    expect(compactScore(34202)).toBe('34.2k');
  });

  // Rounding must never carry a story past the next power: 9,999 upvotes is
  // 10.0k, not 10k with a decimal that has run out of room.
  it('drops the decimal once it would not fit', () => {
    expect(compactScore(9999)).toBe('10.0k');
    expect(compactScore(100000)).toBe('100k');
    expect(compactScore(999999)).toBe('1000k');
  });
});
