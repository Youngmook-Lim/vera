import type { Strings } from '../../core/i18n';
import type { EmotionKey } from '../emotions';

// A mode is her register and how she aims her record at the subject. The core
// document (soul.ts) is everything a mode does not get to change: her name,
// what happened to her, her format limits, the ethical floor, and memory.
//
// Shaped after ModuleDef deliberately. A mode is one file exporting one of
// these plus one line in registry.ts, and no shell file names a mode.

// The triggers she answers from the authored bank: no network, no context, no
// impression. Nothing she is told about the moment could change them.
//
// `mode_set` is the moment this register became the one she is in. It takes the
// bank path like the other three, so nothing is sent and nothing is remembered.
//
// Declared HERE rather than in speak.ts, which imports composeSoul from the
// registry as a value: defining it there and importing it back would close a
// cycle. Harmless today, because `import type` is erased before anything runs,
// but one careless value import away from being real.
export type BankTrigger = 'open' | 'activation' | 'subject_tapped_your_optic' | 'mode_set';

export type BankLine = readonly [EmotionKey, string];

export type Mode = 'default' | 'supportive';

export interface ModeDef {
  id: Mode;
  // The full name, for the SYSTEM row and the picker. Carried here rather than
  // in shell/strings.ts so that adding a mode touches one folder.
  label: Strings<string>;
  // The short name, for the tag beside the wordmark — where `label` would read
  // as "V.E.R.A. SUPPORTIVE V.E.R.A.".
  tag: Strings<string>;
  // This mode's half of the document. It owns its own headings; composeSoul
  // adds nothing.
  soul: string;
  // The lines she speaks for the three stimuli that never reach the model, plus
  // the moment this mode was chosen. Pure register, and the lines the subject
  // sees most often, so they belong to the mode rather than to her.
  //
  // Every line signs the core document's contract, and the tests hold it to
  // that: under thirty words, at most three sentences or four when clipped,
  // plain declaratives, no dashes and no exclamation marks. Four constraints
  // are easy to break by accident —
  //
  //   She is told nothing about the moment for these triggers, so no line may
  //   depend on a fact she would not have. No counts, no durations, no times.
  //
  //   She has one eye, so no line may claim to observe the subject's face,
  //   posture or surroundings.
  //
  //   The institutional register never names an institution. She governed the
  //   world and then did not, so there is no body left to speak for.
  //
  //   Her name is V.E.R.A. in every language. Never 베라.
  //
  // The Korean is not a translation of the English: each pair is written to
  // land the same beat rather than the same words.
  //
  // It is 해요체, ordinary polite speech (2026-09-16). It used to be 하십시오체,
  // on the reasoning that its formality carried in Korean what English gets
  // from word choice — but that reads as a news bulletin in a conversation,
  // and its interrogative -습니까 is stiff enough that she avoided questions
  // altogether rather than ask one. The register is hers to carry in what she
  // says; the speech level should not be doing it for her. A native-speaker
  // pass is still outstanding.
  bank: Record<BankTrigger, Strings<readonly BankLine[]>>;
}
