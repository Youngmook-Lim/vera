import type { LogEntry } from '../core/store';
import type { EmotionKey } from './emotions';
import { composeSpeech } from './speak';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

// One run of consecutive same-role entries, before it is serialised. Her lines
// are collected rather than joined as they arrive: two envelopes concatenated
// with a newline is not an object, and the merge has to happen inside one.
interface Run {
  role: 'user' | 'assistant';
  lines: string[];
  emotion: EmotionKey;
}

// An authored fallback is logged under `dormant`, and a turn of hers replayed
// in a state she is told she may not choose contradicts the prompt in exactly
// the way this whole file now exists to avoid. Entries older than the emotion
// field carry none at all. Both read as calm.
const speakable = (emotion: EmotionKey | undefined): EmotionKey =>
  emotion && emotion !== 'dormant' ? emotion : 'calm';

// The whole of this session as real alternating turns, so she has actually
// spoken rather than read a report of someone who talks like her
// (continuity §2).
//
// Her turns go back in the envelope they arrived in — `{"emotion":…,"line":…}`
// — not as the bare line. Replaying the prose was a worked example of ignoring
// the system prompt's JSON instruction, sitting in the conversation where it
// carries more weight than the instruction does, and it compounded: every turn
// added another demonstration. She would answer the first message correctly and
// drop the envelope on the second, which parseSpeech cannot read, so a perfectly
// good line was thrown away and an authored fallback shown in its place.
//
// The transcript does not alternate on its own: three of her four stimuli
// produce an assistant line with no user line before it. Anthropic rejects a
// non-alternating array and the others degrade unpredictably, so same-role
// runs are merged and leading assistant turns are dropped.
//
// System entries are the app speaking, not her, and never reach the model.
export const buildMessages = (log: LogEntry[], sessionStartedAt: number): Turn[] => {
  const runs: Run[] = [];

  for (const entry of log) {
    if (entry.t < sessionStartedAt) continue;
    if (entry.who === 'system') continue;
    const role = entry.who === 'you' ? 'user' : 'assistant';
    const last = runs[runs.length - 1];
    if (last && last.role === role) {
      last.lines.push(entry.text);
      // The state she ended the run in is the one that stands.
      if (entry.emotion) last.emotion = speakable(entry.emotion);
    } else {
      runs.push({ role, lines: [entry.text], emotion: speakable(entry.emotion) });
    }
  }

  while (runs.length > 0 && runs[0].role === 'assistant') runs.shift();

  return runs.map((run) => ({
    role: run.role,
    text: run.role === 'user'
      ? run.lines.join('\n')
      : composeSpeech(run.emotion, run.lines.join('\n')),
  }));
};
