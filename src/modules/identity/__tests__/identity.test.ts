import { SEED, addLine, editLine, removeLine, stamp } from '../identity';

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
