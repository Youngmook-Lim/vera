import { EMPTY_STORED, parse, serialize } from '../stored';

describe('what the affirmations room keeps', () => {
  it('round-trips everything it holds', () => {
    const stored = { favorites: new Set(['I am allowed to begin again.']), daily: true, syncedOn: 'Thu Oct 29 2026' };
    const back = parse(serialize(stored));
    expect([...back.favorites]).toEqual(['I am allowed to begin again.']);
    expect(back.daily).toBe(true);
    expect(back.syncedOn).toBe('Thu Oct 29 2026');
  });

  it('reads nothing, or garbage, as nothing kept', () => {
    for (const raw of [null, '', '{', '[]']) {
      const s = parse(raw);
      expect(s.favorites.size).toBe(0);
      expect(s.daily).toBe(EMPTY_STORED.daily);
      expect(s.syncedOn).toBeNull();
    }
  });

  // A half-written blob costs the field, never the room.
  it('drops a malformed field and keeps the rest', () => {
    const s = parse(JSON.stringify({ favorites: ['a', 3, null], daily: 'yes', syncedOn: 7 }));
    expect([...s.favorites]).toEqual(['a']);
    expect(s.daily).toBe(false);
    expect(s.syncedOn).toBeNull();
  });
});
