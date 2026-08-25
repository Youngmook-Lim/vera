export interface Identity {
  title: string;
  lines: string[];
  revs: number;
  month: number;
}

// Your declaration of who you intend to be. Her record is her account of who
// you have been. Neither can edit the other, and she is not told about this one.
export const SEED: Identity = {
  title: 'who I am trying to be',
  lines: [
    'I finish the boring part before I let myself start the interesting part.',
    'I say the awkward thing on the same day I notice it.',
    'I am kind to people who cannot help me.',
    'I do not perform exhaustion to prove the work mattered.',
  ],
  revs: 0,
  month: new Date().getMonth(),
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export const stamp = (identity: Identity): string => {
  const times = identity.revs === 0 ? 'not yet revised'
    : identity.revs === 1 ? 'revised once'
      : identity.revs === 2 ? 'revised twice'
        : `revised ${identity.revs} times`;
  return `written in ${MONTHS[identity.month]} · ${times}`;
};

const bump = (identity: Identity, lines: string[]): Identity =>
  ({ ...identity, lines, revs: identity.revs + 1 });

export const editLine = (identity: Identity, index: number, text: string): Identity => {
  const next = text.trim();
  if (next === identity.lines[index]) return identity;
  const lines = [...identity.lines];
  if (next) lines[index] = next;
  else lines.splice(index, 1);
  return bump(identity, lines);
};

export const addLine = (identity: Identity): Identity =>
  ({ ...identity, lines: [...identity.lines, ''] });

export const removeLine = (identity: Identity, index: number): Identity => {
  const lines = [...identity.lines];
  lines.splice(index, 1);
  return bump(identity, lines);
};

// A title has no state analogous to a line being "removed" — clearing it is a
// deliberate no-op, not a delete-and-bump. A page with no title at all is
// worse than one that keeps its last, so an empty edit is treated the same as
// a same-text edit: no change, no revision.
export const editTitle = (identity: Identity, text: string): Identity => {
  const next = text.trim();
  if (!next || next === identity.title) return identity;
  return { ...identity, title: next, revs: identity.revs + 1 };
};
