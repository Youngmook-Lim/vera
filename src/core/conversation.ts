// How long the thread has got, and when that is worth saying out loud. Pure —
// no React, no store, no theme — so the rule lives in one place and both the
// stage and the LOG screen read the same answer.

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
