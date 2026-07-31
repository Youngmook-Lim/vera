// src/vera/speak.ts
import type { Lang } from '../core/i18n';
import type { SpeakContext } from './context';
import { isEmotionKey, type EmotionKey } from './emotions';
import { ACT, ACT_SYS, FALLBACK } from './fallback';
import { SOUL_MD } from './soul';

export type Trigger =
  | 'open'
  | 'activation'
  | 'subject_spoke'
  | 'subject_erased_the_transcript'
  | 'subject_tapped_your_optic'
  | 'subject_fed_the_specimen'
  | 'language_switched';

export interface SpeechResult {
  emotion: EmotionKey;
  line: string;
  impression: string | null;
  seal: boolean;
}

export const buildSystemPrompt = (trigger: Trigger, lang: Lang): string =>
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
    trigger === 'activation' ? ACT_SYS : '',
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

export const buildUserPrompt = (
  said: string | null,
  trigger: Trigger,
  ctx: SpeakContext,
): string =>
  [
    said ? `THE SUBJECT SAYS: ${said}` : `SITUATION: ${trigger.replace(/_/g, ' ')}`,
    said ? 'Respond to what they said. Engage with the content of it.' : '',
    `CONTEXT: ${JSON.stringify(ctx)}`,
  ]
    .filter(Boolean)
    .join('\n');

// Nine words, one clause, no trailing punctuation pile-up. She writes file
// entries, not sentences.
export const clampImpression = (raw: string): string =>
  `${String(raw).trim().split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '')}.`;

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
    impression: clampedImpression === '.' ? null : clampedImpression,
    seal: parsed.seal === true,
  };
};

export const fallbackFor = (
  trigger: Trigger,
  lang: Lang,
): { emotion: EmotionKey; line: string } => {
  if (trigger === 'activation') {
    const [emotion, line] = ACT[lang];
    return { emotion, line };
  }
  const pool = FALLBACK[lang];
  const [emotion, line] = pool[Math.floor(Math.random() * pool.length)];
  return { emotion, line };
};
