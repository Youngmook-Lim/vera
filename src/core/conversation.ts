// How long the thread has got, when that is worth saying out loud, and where
// her register changed. Pure — no React, no store, no theme — so each rule
// lives in one place and both the stage and the LOG screen read the same
// answer.

import type { Mode } from '../vera/modes/registry';

// An EXCHANGE is one thing the subject said. Her replies are not counted and
// neither are the app's own notices: she answers exactly once per turn, so the
// subject's turns are the length of the conversation, and counting both halves
// would just be this number doubled with system lines mixed in.
//
// Nothing she says unprompted reaches the log at all any more (2026-09-11), so
// there is no longer any way for a tap on her eye to inflate this.
type Countable = readonly { who: string }[];

export const exchanges = (log: Countable): number =>
  log.reduce((n, entry) => (entry.who === 'you' ? n + 1 : n), 0);

// Half of LOG_CAP's 200 entries, which is about a hundred exchanges — so this
// lands with as much room left as has been used, rather than at the point
// where turns are already falling off the start of the thread unnoticed.
export const LONG_AFTER = 50;

// The number to show, or null when there is nothing to say yet. One call, one
// render decision: a component that asked "is it long" and then "how long"
// would be two passes with two chances to disagree.
export const longWarning = (log: Countable): number | null => {
  const n = exchanges(log);
  return n >= LONG_AFTER ? n : null;
};

// Where her register changes, and which one starts there.
//
// The LOG screen shows BOTH registers at once and always has: `buildMessages`
// filters a COPY on the way to the model, and the stored log is never
// truncated by a switch — "her turns in the old register are still on the LOG
// screen and are still hers." Which left the screen mixing two voices with
// nothing to tell them apart, and this is that.
//
// It reads only HER lines, because they are the only entries that carry a
// register: a turn of the subject's between two of hers in the same register
// must not split the thread. The rule therefore lands on her first line in the
// new register rather than on the words that prompted it — which is also when
// the switch actually took effect, since nothing of hers is said in between.
//
// An entry written before the field existed carries no register at all, and
// gets none: a guessed `default` would be a confident lie about history.
type Registered = readonly { who: string; mode?: Mode }[];

export const registerRules = (log: Registered): Map<number, Mode> => {
  const rules = new Map<number, Mode>();
  let current: Mode | undefined;
  log.forEach((entry, i) => {
    if (entry.who !== 'vera' || !entry.mode) return;
    if (entry.mode !== current) {
      rules.set(i, entry.mode);
      current = entry.mode;
    }
  });
  return rules;
};
