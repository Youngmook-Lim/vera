import { LONG_AFTER, exchanges, longWarning } from '../conversation';

const said = (n: number) => Array.from({ length: n }, () => ({ who: 'you' }));

describe('counting the conversation', () => {
  it('counts what the subject said, and nothing else', () => {
    expect(
      exchanges([
        { who: 'you' },
        { who: 'vera' },
        { who: 'you' },
        { who: 'vera' },
        // The app's own voice is not a turn of anybody's.
        { who: 'system' },
      ]),
    ).toBe(2);
  });

  it('is zero on an empty thread', () => {
    expect(exchanges([])).toBe(0);
  });

  // She answers once per turn, so her half is this number again. Counting both
  // would report a fifty-exchange thread as a hundred and make the threshold
  // mean something other than what it says.
  it('does not count her replies', () => {
    expect(exchanges([{ who: 'vera' }, { who: 'vera' }, { who: 'vera' }])).toBe(0);
  });
});

describe('the warning', () => {
  it('says nothing until the thread is actually long', () => {
    expect(longWarning(said(LONG_AFTER - 1))).toBeNull();
    expect(longWarning([])).toBeNull();
  });

  // At the threshold, not past it: 50 exchanges is what the subject asked to
  // be told about.
  it('arrives exactly on the threshold', () => {
    expect(longWarning(said(LONG_AFTER))).toBe(LONG_AFTER);
  });

  it('keeps climbing afterwards, so it says how far past you are', () => {
    expect(longWarning(said(LONG_AFTER + 7))).toBe(LONG_AFTER + 7);
  });

  // Half of LOG_CAP (200 entries, ~100 exchanges): it has to land while there
  // is still as much room left as has been used, not once turns are already
  // falling off the front of the thread.
  it('leaves as much room as it has spent', () => {
    expect(LONG_AFTER).toBe(50);
  });
});
