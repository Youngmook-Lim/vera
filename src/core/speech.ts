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

export interface SpeechOutcome {
  emotion: EmotionKey;
  line: string;
  impression: string | null;
  seal: boolean;
  authFailed: boolean;
}

// The whole reply cycle with the network injected, so the store stays thin and
// this stays testable. She never shows an error in place of a line. Reached
// only by `subject_spoke` — the other three stimuli are answered from the
// bank and never come through here.
export const runSpeech = async (deps: SpeechDeps): Promise<SpeechOutcome> => {
  const system = buildSystemPrompt(deps.lang);
  const user = buildUserPrompt(deps.said, deps.context);

  try {
    const parsed = parseSpeech(await deps.call(system, user));
    if (parsed) return { ...parsed, authFailed: false };
  } catch (error) {
    if (error instanceof AuthError) {
      const spoken = fallbackFor(deps.lang);
      return { ...spoken, impression: null, seal: false, authFailed: true };
    }
  }

  const spoken = fallbackFor(deps.lang);
  return { ...spoken, impression: null, seal: false, authFailed: false };
};
