// src/core/speech.ts
import type { Lang } from './i18n';
import type { SpeakContext } from '../vera/context';
import type { EmotionKey } from '../vera/emotions';
import { AuthError, QuotaError } from '../vera/llm';
import type { Turn } from '../vera/messages';
import type { SystemCode } from './store';
import type { Mode } from '../vera/modes/registry';
import { buildSystemPrompt, buildUserPrompt, fallbackFor, parseSpeech } from '../vera/speak';

export interface SpeechDeps {
  key: string;
  said: string;
  turns: Turn[];
  lang: Lang;
  mode: Mode;
  context: SpeakContext;
  memoryMd: string;
  call: (system: string, turns: Turn[]) => Promise<string>;
}

// Exactly what went out and exactly what came back, kept so the subject can
// read the real payload rather than a description of it. The credential is
// never in here: buildRequest puts it in the headers, never in the prompt.
//
// `turns` is the whole array as sent, not the composed last turn alone — the
// session travels as alternating turns now, and every one of them went to the
// provider. `raw` is null when the call threw before answering.
export interface SpeechDebug {
  system: string | null;
  turns: Turn[] | null;
  raw: string | null;
  // Why the call threw, in the provider's own words. Null when nothing threw.
  // Without it `raw: null` was the whole story, and a 400 for an empty credit
  // balance was indistinguishable from a dead socket or a 25-second timeout.
  failure: string | null;
}

export interface SpeechOutcome {
  emotion: EmotionKey;
  line: string;
  // The app speaking in its own voice instead of hers, or null. Both codes are
  // configuration problems only the subject can fix — a refused credential and
  // an account with nothing behind it — which is the whole test for taking the
  // reply out of her mouth.
  notice: SystemCode | null;
  // Whether the line is hers or authored. The caller cannot infer this: a
  // fallback and a real reply are the same shape, which is the point of the
  // fallback. Reported rather than deduced.
  source: 'model' | 'fallback';
  debug: SpeechDebug;
}

// The whole reply cycle with the network injected, so the store stays thin and
// this stays testable. She never shows an error in place of a line. Reached
// only by `subject_spoke` — the other three stimuli are answered from the
// bank and never come through here.
export const runSpeech = async (deps: SpeechDeps): Promise<SpeechOutcome> => {
  const system = buildSystemPrompt(deps.lang, deps.memoryMd, deps.mode);
  const user = buildUserPrompt(deps.said, deps.context);
  // The current input is already the last turn when the subject spoke; the user
  // prompt carries only the situational CONTEXT alongside it. When it is not —
  // an empty `said` leaves her own line last — append rather than replace, so a
  // line she actually said is never swallowed.
  const last = deps.turns[deps.turns.length - 1];
  const current = last?.role === 'user';
  const body = current ? deps.turns.slice(0, -1) : deps.turns;
  // That last user turn can be a merge of several of their lines — a system
  // entry between two messages merges them, since the array must alternate —
  // of which only the final one is `said`. Keep the earlier lines; only the
  // current message carries CONTEXT.
  const prefix = current && deps.said && last.text !== deps.said && last.text.endsWith(deps.said)
    ? last.text.slice(0, last.text.length - deps.said.length)
    : '';
  const turns = [...body, { role: 'user' as const, text: prefix + user }];
  // Held outside the try so a reply that arrived but would not parse is still
  // reported — that failure and a dead network look identical on screen, and
  // this is the only thing that tells them apart.
  let raw: string | null = null;
  // Held alongside `raw` for the same reason: the two together are what tell a
  // reply that arrived and would not parse apart from one that never came.
  let failure: string | null = null;
  let notice: SystemCode | null = null;

  try {
    raw = await deps.call(system, turns);
    const parsed = parseSpeech(raw);
    if (parsed) {
      return {
        ...parsed, notice: null, source: 'model', debug: { system, turns, raw, failure },
      };
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    if (error instanceof AuthError) notice = 'auth';
    else if (error instanceof QuotaError) notice = 'quota';
  }

  const spoken = fallbackFor(deps.lang);
  return { ...spoken, notice, source: 'fallback', debug: { system, turns, raw, failure } };
};
