import { MODES, type Mode } from './modes/registry';
import type { TransmissionSlot } from './modes/types';

// When she sends, and what she has to send. Pure — no expo, no React, no
// store. The impure half is transmissionsNotify.ts.
//
// She is purely reactive everywhere else: every other line she says answers
// something the subject did. A transmission answers a clock, which is new
// (2026-09-21). Nothing in SOUL.md asks for it — the line that looks as though
// it does describes how little authority she has left, not a capability she
// may use, and it was written on a day this app had no notification code in it
// at all. Nothing forbids it either, and nothing about it reaches her: no
// prompt names it, nothing it says enters the transcript or the record, and
// the app is not running when it fires.

// Fourteen, against the rooms' ninety. Their corpora never change, so a long
// horizon costs them only a subject who stops opening the app. Hers is
// rewritten every time the register changes, and the horizon is what that
// costs: twenty-eight pending notifications to cancel and replace rather than
// a hundred and eighty, on a control meant to be reached for mid-conversation.
export const TRANSMISSION_DAYS = 14;

// NOT `vera`. That id was created by v1's transmissions at importance DEFAULT
// with vibration off, and Android restores a deleted channel's old settings
// when the id is recreated — so reusing it would resurrect a silent,
// non-peeking channel with every test still passing. notify.ts sweeps `vera`
// at import and must go on doing so.
export const CHANNEL = 'vera.v2';

// Her wordmark, and the only notification in this app that carries her name.
// The rooms send in the voice of whatever they hold; this one is her.
export const TITLE = 'V.E.R.A.';

export const SLOTS: readonly { slot: TransmissionSlot; hour: number }[] = [
  { slot: 'midday', hour: 11 },
  { slot: 'afternoon', hour: 16 },
];

export const linesFor = (mode: Mode, slot: TransmissionSlot): readonly string[] =>
  MODES[mode].transmissions[slot];
