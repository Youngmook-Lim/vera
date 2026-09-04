import { EMPTY_STORED, parse, serialize } from '../stored';

describe('the module 02 record', () => {
  it('reads back everything it wrote', () => {
    const written = serialize({
      favorites: new Set(['a', 'b']),
      daily: true,
      syncedOn: 'Fri Sep 04 2026',
    });
    const read = parse(written);
    expect([...read.favorites].sort()).toEqual(['a', 'b']);
    expect(read.daily).toBe(true);
    expect(read.syncedOn).toBe('Fri Sep 04 2026');
  });

  it('starts empty on nothing, on junk, and on the wrong shape', () => {
    expect(parse(null)).toEqual(EMPTY_STORED);
    expect(parse('}{ not json')).toEqual(EMPTY_STORED);
    expect(parse('{"favorites":"a"}')).toEqual(EMPTY_STORED);
    expect(parse('{"favorites":[1,2]}').favorites.size).toBe(0);
  });

  // A record written before the daily card existed. It must open as a record
  // with the feature off, not as no record at all.
  it('opens a record from before the daily card', () => {
    const old = parse('{"favorites":["Finish the small thing before starting the next one."]}');
    expect([...old.favorites]).toEqual(['Finish the small thing before starting the next one.']);
    expect(old.daily).toBe(false);
    expect(old.syncedOn).toBeNull();
  });

  it('treats a non-boolean daily and a non-string stamp as absent', () => {
    const odd = parse('{"favorites":[],"daily":"yes","syncedOn":7}');
    expect(odd.daily).toBe(false);
    expect(odd.syncedOn).toBeNull();
  });
});
