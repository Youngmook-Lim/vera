import { EMPTY_STORED, type Note, parse, serialize } from '../stored';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, ...over,
});

describe('a blob of notes', () => {
  it('comes back as it went in', () => {
    const stored = { notes: [note(), note({ id: 'n2', enabled: false })] };
    expect(parse(serialize(stored))).toEqual(stored);
  });

  it('is empty when there is nothing on the disk', () => {
    expect(parse(null)).toEqual(EMPTY_STORED);
  });

  // A blob half-written by a dying process must cost the notes, never the room.
  it('is empty when the disk holds something that is not JSON', () => {
    expect(parse('{ not json')).toEqual(EMPTY_STORED);
  });

  // Dropped rather than loaded half-formed: a note with no hour would be
  // scheduled, and what it would do then is nobody's intention.
  it('drops a note that is missing a field and keeps the rest', () => {
    const raw = JSON.stringify({
      notes: [note(), { id: 'n2', text: 'no hour', days: [1], enabled: true }],
    });
    expect(parse(raw).notes).toEqual([note()]);
  });

  it('drops a note whose days are not days', () => {
    expect(parse(JSON.stringify({ notes: [{ ...note(), days: ['monday'] }] })).notes).toEqual([]);
    expect(parse(JSON.stringify({ notes: [{ ...note(), days: [9] }] })).notes).toEqual([]);
  });

  it('drops a note whose hour is not on the clock', () => {
    expect(parse(JSON.stringify({ notes: [{ ...note(), hour: 24 }] })).notes).toEqual([]);
    expect(parse(JSON.stringify({ notes: [{ ...note(), minute: 60 }] })).notes).toEqual([]);
  });

  it('keeps the order they were made in', () => {
    const stored = { notes: [note({ id: 'a' }), note({ id: 'b' }), note({ id: 'c' })] };
    expect(parse(serialize(stored)).notes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });
});
