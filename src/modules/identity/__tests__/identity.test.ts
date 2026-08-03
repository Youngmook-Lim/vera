import { SEED, addLine, editLine, editTitle, removeLine, stamp } from '../identity';

describe('stamp', () => {
  it('names the month it was written and how often it has been revised', () => {
    expect(stamp({ ...SEED, month: 2, revs: 0 })).toBe('written in march · not yet revised');
    expect(stamp({ ...SEED, month: 2, revs: 1 })).toBe('written in march · revised once');
    expect(stamp({ ...SEED, month: 2, revs: 2 })).toBe('written in march · revised twice');
    expect(stamp({ ...SEED, month: 2, revs: 5 })).toBe('written in march · revised 5 times');
  });
});

describe('editing', () => {
  it('rewrites a line and counts the revision', () => {
    const next = editLine(SEED, 0, 'I do the boring part first.');
    expect(next.lines[0]).toBe('I do the boring part first.');
    expect(next.revs).toBe(SEED.revs + 1);
  });

  it('leaves the count alone when nothing actually changed', () => {
    expect(editLine(SEED, 0, SEED.lines[0]).revs).toBe(SEED.revs);
  });

  it('deletes a line that was emptied', () => {
    const next = editLine(SEED, 1, '   ');
    expect(next.lines).toHaveLength(SEED.lines.length - 1);
    expect(next.lines).not.toContain(SEED.lines[1]);
  });

  // Adding is not revising — an empty line is an intention, not a change.
  it('adds a blank line without counting a revision', () => {
    const next = addLine(SEED);
    expect(next.lines).toHaveLength(SEED.lines.length + 1);
    expect(next.lines[next.lines.length - 1]).toBe('');
    expect(next.revs).toBe(SEED.revs);
  });

  it('removes a line and counts it', () => {
    const next = removeLine(SEED, 0);
    expect(next.lines).toHaveLength(SEED.lines.length - 1);
    expect(next.revs).toBe(SEED.revs + 1);
  });

  it('never mutates what it was given', () => {
    const before = [...SEED.lines];
    removeLine(SEED, 0);
    expect(SEED.lines).toEqual(before);
  });
});

describe('editTitle', () => {
  it('rewrites the title and counts the revision', () => {
    const next = editTitle(SEED, 'who I am becoming instead');
    expect(next.title).toBe('who I am becoming instead');
    expect(next.revs).toBe(SEED.revs + 1);
  });

  it('leaves the count alone — and returns the same object — when nothing actually changed', () => {
    // Siblings (editLine, etc.) use this referential-equality contract to
    // decide whether a caller needs to persist; editTitle must match it.
    const next = editTitle(SEED, SEED.title);
    expect(next).toBe(SEED);
    expect(next.revs).toBe(SEED.revs);
  });

  // Deliberate decision (not an accident): a title has no "removed" state
  // analogous to a line, so clearing it keeps the last title instead of
  // deleting it — same no-op, no-bump treatment as a same-text edit.
  it('keeps the last title instead of deleting it when cleared', () => {
    const next = editTitle(SEED, '   ');
    expect(next).toBe(SEED);
    expect(next.title).toBe(SEED.title);
  });

  it('never mutates what it was given', () => {
    const before = SEED.title;
    editTitle(SEED, 'something else entirely');
    expect(SEED.title).toBe(before);
  });
});
