import type { LogEntry } from '../core/store';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

// The whole of this session as real alternating turns, so she has actually
// spoken rather than read a report of someone who talks like her
// (continuity §2).
//
// The transcript does not alternate on its own: three of her four stimuli
// produce an assistant line with no user line before it. Anthropic rejects a
// non-alternating array and the others degrade unpredictably, so same-role
// runs are merged and leading assistant turns are dropped.
//
// System entries are the app speaking, not her, and never reach the model.
export const buildMessages = (log: LogEntry[], sessionStartedAt: number): Turn[] => {
  const turns: Turn[] = [];

  for (const entry of log) {
    if (entry.t < sessionStartedAt) continue;
    if (entry.who === 'system') continue;
    const role = entry.who === 'you' ? 'user' : 'assistant';
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text = `${last.text}\n${entry.text}`;
    else turns.push({ role, text: entry.text });
  }

  while (turns.length > 0 && turns[0].role === 'assistant') turns.shift();

  return turns;
};
