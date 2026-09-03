import { displayOrder, parse, serialize, toggle } from '../favorites';

const set = (...quotes: string[]) => new Set(quotes);

describe('favorites', () => {
  it('marks a quote that was not marked', () => {
    expect(toggle(set(), 'a').has('a')).toBe(true);
  });

  it('unmarks one that was', () => {
    expect(toggle(set('a', 'b'), 'a').has('a')).toBe(false);
  });

  it('leaves the set it was given alone', () => {
    const before = set('a');
    toggle(before, 'b');
    expect([...before]).toEqual(['a']);
  });

  it('reads back what it wrote', () => {
    expect([...parse(serialize(set('a', 'b')))].sort()).toEqual(['a', 'b']);
  });

  it('starts empty on nothing, on junk, and on the wrong shape', () => {
    expect(parse(null).size).toBe(0);
    expect(parse('}{ not json').size).toBe(0);
    expect(parse('{"favorites":"a"}').size).toBe(0);
    expect(parse('{"favorites":[1,2]}').size).toBe(0);
  });
});

describe('the display order', () => {
  const QUOTES = ['zero', 'one', 'two', 'three', 'four'];

  it("is the book's own order while the sort is off", () => {
    expect(displayOrder(QUOTES, set('three', 'one'), false)).toEqual([0, 1, 2, 3, 4]);
  });

  it('lifts the marked ones to the top, each group still in book order', () => {
    expect(displayOrder(QUOTES, set('three', 'one'), true)).toEqual([1, 3, 0, 2, 4]);
  });

  it("is the book's own order when nothing is marked", () => {
    expect(displayOrder(QUOTES, set(), true)).toEqual([0, 1, 2, 3, 4]);
  });
});
