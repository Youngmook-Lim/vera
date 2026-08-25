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
export const composeMemoryMd = (selection: Selection): string => {
  const { facts, verdicts, threads } = selection;

  if (facts.length === 0 && verdicts.length === 0 && threads.length === 0) {
    return `${MEMORY_HEADING}\n\nYou have never met this subject before.`;
  }

  const parts: string[] = [MEMORY_HEADING];

  if (facts.length > 0) {
    // Not "what you know about them" — that echoes the heading above it and
    // leaves it unclear whether her conclusions sit inside this section.
    parts.push('', '## About them', ...facts.map((f) => `- ${f.text}`));
  }

  if (verdicts.length > 0) {
    parts.push('', '## What you have concluded', ...verdicts.map((v) =>
      v.count > 1 ? `- ${v.text} (reached ${v.count} times)` : `- ${v.text}`));
  }

  if (threads.length > 0) {
    parts.push('', '## Unanswered', ...threads.map((t) => `- ${t.text}`));
  }

  return parts.join('\n');
};
