import type { Mode } from '../../vera/modes/registry';
import { LONG_AFTER, exchanges, longWarning, registerRules } from '../conversation';

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

// A rule in the thread wherever her register changes. The LOG shows BOTH
// registers at once and always has — `buildMessages` filters a copy on the way
// to the model and never touches the stored log — so until now the screen mixed
// them with nothing to tell them apart.
describe('registerRules', () => {
  const her = (mode: Mode | undefined, t: number) => ({ who: 'vera' as const, text: 'x', t, mode });
  const you = (t: number) => ({ who: 'you' as const, text: 'y', t });
  const sys = (t: number) => ({ who: 'system' as const, text: '', t, code: 'auth' as const });

  it('marks nothing in a thread that never changed register', () => {
    expect(registerRules([you(1), her('default', 2), you(3), her('default', 4)]))
      .toEqual(new Map([[1, 'default']]));
  });

  it('marks each change, at her first line in the new register', () => {
    expect(
      registerRules([
        you(1), her('supportive', 2),
        you(3), her('default', 4),
        you(5), her('supportive', 6),
      ]),
    ).toEqual(new Map([[1, 'supportive'], [3, 'default'], [5, 'supportive']]));
  });

  // Her register is the only thing that carries one, and a turn of the
  // subject's between two of hers must not split the thread.
  it('is not interrupted by the subject or by a notice', () => {
    expect(
      registerRules([
        her('default', 1),
        you(2),
        sys(3),
        her('default', 4),
      ]),
    ).toEqual(new Map([[0, 'default']]));
  });

  // Everything written before the field existed carries no register, and a
  // guessed one would be a confident lie about history.
  it('says nothing about lines written before registers were recorded', () => {
    expect(registerRules([her(undefined, 1), her(undefined, 2)])).toEqual(new Map());
  });

  // A mode-carrying line followed by one without is unreachable in practice —
  // everything written before the field predates everything written after it —
  // but without the guard this sets a rule whose register is `undefined`, and
  // the component would then look it up in MODES and crash.
  it('never raises a rule for an absent register', () => {
    expect(registerRules([her('default', 1), her(undefined, 2), her('default', 3)]))
      .toEqual(new Map([[0, 'default']]));
  });

  it('starts the rules at the first line that does carry one', () => {
    expect(registerRules([her(undefined, 1), her('default', 2)]))
      .toEqual(new Map([[1, 'default']]));
  });

  it('has nothing to say about an empty thread', () => {
    expect(registerRules([])).toEqual(new Map());
  });
});
