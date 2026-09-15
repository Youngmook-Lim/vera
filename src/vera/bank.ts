import type { Lang } from '../core/i18n';
import type { EmotionKey } from './emotions';
import { MODES, MODE_ORDER, type Mode } from './modes/registry';
import type { BankTrigger } from './modes/types';

export type { BankLine } from './modes/types';

// How a line is drawn out of the authored bank. The lines themselves belong to
// the mode — they are pure register, and the ones the subject sees most often —
// so what is left here is the drawing and the recognising.

// What she said last, per trigger AND per mode, so a run of taps does not
// repeat one line twice running. Module state rather than store state: nothing
// outside this file needs it, and it is meant to be thrown away when the real
// selection strategy arrives.
const lastSpoken = new Map<string, string>();

export const pick = (
  trigger: BankTrigger,
  lang: Lang,
  mode: Mode,
): { emotion: EmotionKey; line: string } => {
  const pool = MODES[mode].bank[trigger][lang];
  const key = `${trigger}:${lang}:${mode}`;
  const previous = lastSpoken.get(key);

  // Drawing from the lines she did not just say keeps a repeated tap from
  // stuttering. A single-line pool has nothing to choose from and repeats.
  const choices = pool.length > 1 ? pool.filter(([, line]) => line !== previous) : pool;
  const [emotion, line] = choices[Math.floor(Math.random() * choices.length)];

  lastSpoken.set(key, line);
  return { emotion, line };
};

// Every authored line of EVERY mode, in every language, as a set. Built once at
// import from the registry itself, so a line added to any mode is recognised
// here without a second edit.
//
// Deriving this from the ACTIVE mode would stop the hydrate sweep working the
// moment the subject switched register: a line she said as DEFAULT is still an
// authored line after they have moved to SUPPORTIVE, and it is still not a
// thing anybody said to her.
const AUTHORED: ReadonlySet<string> = new Set(
  MODE_ORDER.flatMap((mode) =>
    Object.values(MODES[mode].bank).flatMap((byLang) =>
      Object.values(byLang).flatMap((lines) => lines.map(([, line]) => line)))),
);

// Whether a line of hers came out of the bank rather than out of a conversation
// (2026-09-11). Her greetings and her answers to a poked optic are not things
// the subject said anything to prompt, and replaying them to the model as
// conversation taught it that half the transcript was her talking to nobody.
// They are shown and then forgotten; this is how the transcript recognises the
// ones it already stored.
//
// Identity of TEXT is the only marker available — a stored turn records what
// she said and not why — so a model reply that happened to be character-
// identical to an authored line would be read as banked. Under thirty words
// and exact, that is a coincidence worth accepting against the alternative of
// versioning every stored turn.
export const isBankLine = (text: string): boolean => AUTHORED.has(text);
