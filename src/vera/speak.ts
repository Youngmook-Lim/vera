// src/vera/speak.ts
import type { Lang } from '../core/i18n';
import type { SpeakContext } from './context';
import { isEmotionKey, type EmotionKey } from './emotions';
import { FALLBACK } from './fallback';
import { SOUL_MD } from './soul';

// The triggers she answers from the authored bank: no network, no context, no
// impression. Nothing she is told about the moment could change them.
export type BankTrigger = 'open' | 'activation' | 'subject_tapped_your_optic';

// …and the one that reaches the model. The subject saying something is the
// only stimulus worth a round trip.
export type Trigger = BankTrigger | 'subject_spoke';

export interface SpeechResult {
  emotion: EmotionKey;
  line: string;
}

export const buildSystemPrompt = (lang: Lang, memoryMd: string): string =>
  [
    'This is your SOUL.md. It defines who you are. Follow it exactly, in every reply.',
    SOUL_MD,
    // After SOUL.md, always: a provider-side prompt cache only helps if the
    // static document is the stable prefix (continuity §2).
    'This is MEMORY.md, your file on this subject. It is what you know and what '
      + 'you have concluded. Use it the way you would use something you remember, '
      + 'not something you are reading aloud.',
    memoryMd,
    'The messages before this are the conversation you are already in. You said '
      + 'the assistant turns. Continue it; do not greet them again.',
    'Anything under CONTEXT describes this moment. Absence of a fact means '
      + 'nothing worth mentioning happened; say something else. Do not open a '
      + 'reply with a number, a count, or the time.',
    lang === 'ko'
      ? 'Reply in Korean, using formal 존댓말 with the same deadpan register.'
      : 'Reply in English.',
    'Return ONLY minified JSON: {"emotion":"<one of your states>","line":"<your reply>"}',
  ]
    .filter(Boolean)
    .join('\n');

// Only `subject_spoke` reaches the model now, so there is always something
// they said and never a bare situation to describe.
export const buildUserPrompt = (said: string, ctx: SpeakContext): string =>
  [
    `THE SUBJECT SAYS: ${said}`,
    'Respond to what they said. Engage with the content of it.',
    `CONTEXT: ${JSON.stringify(ctx)}`,
  ].join('\n');

export const parseSpeech = (raw: string): SpeechResult | null => {
  const text = String(raw ?? '');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    // The greedy span can run from a stray brace ahead of the real object all
    // the way to its close; narrow to the first opening brace that parses.
    for (const open of text.matchAll(/\{/g)) {
      const candidate = text.slice(open.index ?? 0).match(/\{[\s\S]*\}/);
      if (!candidate) continue;
      try {
        parsed = JSON.parse(candidate[0]) as Record<string, unknown>;
        break;
      } catch {
        continue;
      }
    }
  }
  if (!parsed) return null;

  const line = typeof parsed.line === 'string' ? parsed.line.trim() : '';
  if (!line) return null;

  return {
    emotion: isEmotionKey(parsed.emotion) ? parsed.emotion : 'calm',
    line,
  };
};

// Reached only when the model is unreachable mid-conversation — activation no
// longer generates a line, so there is no first-instant case to special-case.
//
// She does not fail in colour. The optic drops back to `dormant`, the dead grey
// it wears before she has ever been woken, so a subject who is not reading the
// words can still tell at a glance that nothing is working. It is the only
// state with `dead: true`, and this is the only place that chooses it besides
// going properly dormant. The next reply that succeeds takes the eye back.
export const fallbackFor = (lang: Lang): { emotion: EmotionKey; line: string } => {
  const pool = FALLBACK[lang];
  return { emotion: 'dormant', line: pool[Math.floor(Math.random() * pool.length)] };
};
