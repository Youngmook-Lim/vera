import type { Selection } from './select';

// The one place this section is named. speak.ts introduces it by description
// rather than by name, and SOUL.md names no document at all, so changing this
// changes it everywhere.
export const MEMORY_HEADING = '# WHAT YOU KNOW ABOUT THIS SUBJECT';

// What she is given about the subject: the selection from §5, composed at
// request time and never written to disk as text. Document content, so never
// translated — the same rule SOUL.md follows (continuity §6).
//
// It is deliberately not called MEMORY.md, and names no file. Nothing on disk
// holds this text: it is assembled per reply out of the record, and a name
// ending in `.md` invited her to treat it as a document she could cite or be
// asked to produce. SOUL.md is a real fixed document; this is a view.
// `YYYY-MM-DD HH:MM`, in the device's own timezone rather than UTC — she is
// talking to someone about their morning, not filing a report.
//
// Every entry in the record has always carried a timestamp; none of them used
// to reach her. She was given "reached 2 times" with no when, and SOUL.md tells
// her to cite her records because "a conclusion you have written down is a
// finding" — so, ordered to cite and handed nothing to cite, she invented the
// when. Observed 2026-08-31: given only that this was return number five today,
// she said "You asked that this morning too" about a morning that never
// happened. A date she can read is what makes that sentence checkable.
const stamp = (at: number): string => {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const composeMemoryMd = (selection: Selection, now: number): string => {
  const { facts, verdicts, threads } = selection;

  if (facts.length === 0 && verdicts.length === 0 && threads.length === 0) {
    return `${MEMORY_HEADING}\n\nYou have never met this subject before.`;
  }

  // The dates below are absolute, so they are only worth anything against a
  // present she also knows. CONTEXT gives her a time of day and no date at all.
  const parts: string[] = [
    MEMORY_HEADING,
    '',
    `It is now ${stamp(now)}. Each date below is when you wrote that entry down.`,
  ];

  if (facts.length > 0) {
    // Not "what you know about them" — that echoes the heading above it and
    // leaves it unclear whether her conclusions sit inside this section.
    parts.push('', '## About them', ...facts.map((f) => `- ${f.text} (${stamp(f.at)})`));
  }

  if (verdicts.length > 0) {
    // A hardened conclusion gets both ends of its life: when she first reached
    // it and when she last did. Reaching the same verdict twice in a day and
    // twice a month apart are not the same finding.
    parts.push('', '## What you have concluded', ...verdicts.map((v) =>
      v.count > 1
        ? `- ${v.text} (reached ${v.count} times, first ${stamp(v.firstAt)}, last ${stamp(v.at)})`
        : `- ${v.text} (${stamp(v.at)})`));
  }

  // The two directions mean opposite things — one is a debt she is owed, the
  // other one she is dodging (SOUL.md: "They will keep asking. That is what
  // they are for."). Filed under a single heading she read every thread as the
  // first kind and chased it. Hers come first, because those are the ones she
  // is entitled to raise.
  if (threads.length > 0) {
    // The split is TOTAL, not two equality tests: a thread whose direction is
    // missing or unreadable must land somewhere rather than vanish from her
    // record entirely. Everything that is not hers is theirs, which is the same
    // conservative default `asAskedBy` applies on load.
    const hers = threads.filter((t) => t.askedBy === 'you');
    const theirs = threads.filter((t) => t.askedBy !== 'you');
    parts.push('', '## Unanswered');
    if (hers.length > 0) {
      parts.push('You asked them, and did not get an answer:',
        ...hers.map((t) => `- ${t.text} (asked ${stamp(t.at)})`));
    }
    if (theirs.length > 0) {
      parts.push('They asked you, and you did not answer:',
        ...theirs.map((t) => `- ${t.text} (asked ${stamp(t.at)})`));
    }
  }

  return parts.join('\n');
};
