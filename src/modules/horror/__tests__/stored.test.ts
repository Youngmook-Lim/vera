import { EMPTY_STORED, parse, serialize } from '../stored';

describe('the horror room blob', () => {
  it('round-trips what is kept and how it is read', () => {
    const stored = { favorites: new Set(['a\nb', 'c\nd']), hidden: false };
    const back = parse(serialize(stored));
    expect([...back.favorites].sort()).toEqual(['a\nb', 'c\nd']);
    expect(back.hidden).toBe(false);
  });

  it('opens hidden on a device that has never been here', () => {
    expect(EMPTY_STORED.hidden).toBe(true);
    expect(parse(null).hidden).toBe(true);
    expect(parse(null).favorites.size).toBe(0);
  });

  // The default is ON, so a blob written before the field existed has to read
  // as hidden. `blob.hidden === true` would silently unhide those rooms.
  it('reads a blob written before the preference existed as hidden', () => {
    expect(parse(JSON.stringify({ favorites: ['a\nb'] })).hidden).toBe(true);
  });

  it('keeps an explicit false, which is the only way to be unhidden', () => {
    expect(parse(JSON.stringify({ favorites: [], hidden: false })).hidden).toBe(false);
  });

  it('costs the field and not the room when the blob is damaged', () => {
    expect(parse('{not json').favorites.size).toBe(0);
    expect(parse('{not json').hidden).toBe(true);
    expect(parse(JSON.stringify({ favorites: 'nope', hidden: 'yes' })).favorites.size).toBe(0);
    expect(parse(JSON.stringify({ favorites: [1, 'a\nb', null] })).favorites.size).toBe(1);
  });
});
