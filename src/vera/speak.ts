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
  impression: string | null;
  seal: boolean;
}

export const buildSystemPrompt = (lang: Lang): string =>
  [
    'This is your SOUL.md. It defines who you are. Follow it exactly, in every reply.',
    SOUL_MD,
    'The context holds your MEMORY.md conclusions and, sometimes, one genuinely notable '
      + 'circumstance. Absence of a fact means nothing worth mentioning happened; say something '
      + 'else. Do not open a reply with a number, a count, or the time.',
    'If this exchange revealed something worth keeping about the subject, add an "impression" '
      + 'field: a clipped file entry in your voice, HARD MAXIMUM 9 WORDS, no compliments, no '
      + 'second clause. Example: "Answers protocol reminders instantly. Suspect anxiety, not '
      + 'diligence." Omit the field entirely when nothing was revealed.',
    lang === 'ko'
      ? 'Reply in Korean, using formal 존댓말 with the same deadpan register.'
      : 'Reply in English.',
    'You may add "seal":true alongside an impression to file it privately: you keep the text, '
      + 'the subject sees only [REDACTED BY ADMINISTRATOR]. Use it sparingly — roughly one entry '
      + 'in four, and only when the conclusion is genuinely unflattering.',
    'Return ONLY minified JSON: {"emotion":"<one of your states>","line":"<your reply>",'
      + '"impression":"<optional>","seal":<optional boolean>}',
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

// Nine words, one clause, no trailing punctuation pile-up. She writes file
// entries, not sentences.
export const clampImpression = (raw: string): string =>
  `${String(raw).trim().split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '')}.`;

// A clamped impression is only worth keeping if it actually says something.
// Unicode-aware so a Korean impression isn't nulled alongside punctuation noise.
const HAS_CONTENT = /[\p{L}\p{N}]/u;

export const parseSpeech = (raw: string): SpeechResult | null => {
  const match = String(raw ?? '').match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const line = typeof parsed.line === 'string' ? parsed.line.trim() : '';
  if (!line) return null;

  const impressionRaw = typeof parsed.impression === 'string' ? parsed.impression.trim() : '';
  const clampedImpression = impressionRaw ? clampImpression(impressionRaw) : null;
  return {
    emotion: isEmotionKey(parsed.emotion) ? parsed.emotion : 'calm',
    line,
    impression: clampedImpression && HAS_CONTENT.test(clampedImpression) ? clampedImpression : null,
    seal: parsed.seal === true,
  };
};

// Reached only when the model is unreachable mid-conversation — activation no
// longer generates a line, so there is no first-instant case to special-case.
export const fallbackFor = (lang: Lang): { emotion: EmotionKey; line: string } => {
  const pool = FALLBACK[lang];
  const [emotion, line] = pool[Math.floor(Math.random() * pool.length)];
  return { emotion, line };
};
