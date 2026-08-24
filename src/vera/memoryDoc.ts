import type { Selection } from './select';

// MEMORY.md as she receives it: the selection from §5, composed at request
// time and never written to disk as text. Document content, so never
// translated — the same rule SOUL.md follows (continuity §6).
export const composeMemoryMd = (selection: Selection): string => {
  const { facts, verdicts, threads } = selection;

  if (facts.length === 0 && verdicts.length === 0 && threads.length === 0) {
    return '# MEMORY.md\n\nYou have never met this subject before.';
  }

  const parts: string[] = ['# MEMORY.md'];

  if (facts.length > 0) {
    parts.push('', '## What you know about them', ...facts.map((f) => `- ${f.text}`));
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
