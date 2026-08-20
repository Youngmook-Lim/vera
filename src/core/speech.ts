// src/core/speech.ts
import type { Lang } from './i18n';
import type { SpeakContext } from '../vera/context';
import type { EmotionKey } from '../vera/emotions';
import { AuthError } from '../vera/llm';
import { buildSystemPrompt, buildUserPrompt, fallbackFor, parseSpeech } from '../vera/speak';

export interface SpeechDeps {
  key: string;
  said: string;
  lang: Lang;
  context: SpeakContext;
  call: (system: string, user: string) => Promise<string>;
}

// Exactly what went out and exactly what came back, kept so the subject can
// read the real payload rather than a description of it. The credential is
// never in here: buildRequest puts it in the headers, never in the prompt.
// `raw` is null when the call threw before answering.
export interface SpeechDebug {
  system: string | null;
  user: string | null;
  raw: string | null;
}

export interface SpeechOutcome {
  emotion: EmotionKey;
  line: string;
  impression: string | null;
  authFailed: boolean;
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
  const system = buildSystemPrompt(deps.lang);
  const user = buildUserPrompt(deps.said, deps.context);
  // Held outside the try so a reply that arrived but would not parse is still
  // reported — that failure and a dead network look identical on screen, and
  // this is the only thing that tells them apart.
  let raw: string | null = null;

  try {
    raw = await deps.call(system, user);
    const parsed = parseSpeech(raw);
    if (parsed) {
      return { ...parsed, authFailed: false, source: 'model', debug: { system, user, raw } };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      const spoken = fallbackFor(deps.lang);
      return {
        ...spoken, impression: null, authFailed: true,
        source: 'fallback', debug: { system, user, raw },
      };
    }
  }

  const spoken = fallbackFor(deps.lang);
  return {
    ...spoken, impression: null, authFailed: false,
    source: 'fallback', debug: { system, user, raw },
  };
};
