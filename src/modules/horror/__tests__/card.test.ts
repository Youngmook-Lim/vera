import { REDACTION_MAX, REDACTION_MIN, compactScore, redactionFor, storyKey } from '../card';
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

describe('the redaction', () => {
  const lines = (turn: string) => redactionFor(turn).split('\n');

  it('is two lines of blocks and nothing else', () => {
    const [a, b] = lines('x'.repeat(40));
    expect(a).toMatch(/^█+$/);
    expect(b).toMatch(/^█+$/);
  });

  // The card draws two bars at 100% and 58%. The notification is the same
  // gesture, so it has to be the same shape.
  it("runs the card's two bars, in the card's proportion", () => {
    const [a, b] = lines('x'.repeat(60));
    expect(b.length / a.length).toBeCloseTo(0.58, 1);
  });

  it('grows with the sentence it is standing in for', () => {
    const short = redactionFor('x'.repeat(30)).replace('\n', '');
    const long = redactionFor('x'.repeat(70)).replace('\n', '');
    expect(long.length).toBeGreaterThan(short.length);
  });

  // A four-word turn still has to read as a sentence being withheld, and the
  // longest in the corpus must not wrap into a wall on a lock screen.
  it('is clamped at both ends', () => {
    expect(redactionFor('!').replace('\n', '')).toHaveLength(REDACTION_MIN);
    expect(redactionFor('x'.repeat(500)).replace('\n', '')).toHaveLength(REDACTION_MAX);
  });

  it('never gives up either line, however short the turn', () => {
    for (const turn of ['!', 'It was.', 'x'.repeat(500)]) {
      const [a, b] = lines(turn);
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
    }
  });
});
