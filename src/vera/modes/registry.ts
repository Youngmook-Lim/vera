import { CORE_SOUL_MD } from '../soul';
import { DEFAULT_MODE } from './default';
import { SUPPORTIVE_MODE } from './supportive';
import type { Mode, ModeDef } from './types';

export type { Mode, ModeDef };
export type { BankLine, BankTrigger } from './types';

// Every mode she has. Both consumers — the stage pill and the SYSTEM row —
// read this, and neither names a mode.
export const MODES: Record<Mode, ModeDef> = {
  default: DEFAULT_MODE,
  supportive: SUPPORTIVE_MODE,
};

// The order the picker offers them in. DEFAULT first, because it is what she
// is before anybody chooses.
export const MODE_ORDER: readonly Mode[] = ['default', 'supportive'];

export const isMode = (v: unknown): v is Mode =>
  typeof v === 'string' && v in MODES;

// What the mode's half of the document is called on screen — and it is the
// real name: `SUPPORTIVE_SOUL_MD` is an actual export of supportive.ts, not a
// filename invented for the file list. There are no .md files in this repo and
// never have been, so a screen showing one was describing something that does
// not exist; this names the constant the subject would have to open to change
// it. CORE_SOUL_MD is its other half and is shown the same way.
//
// Derived from the id, so a mode added to the registry is named here without a
// second edit, and not translated, because an identifier is not copy.
// modes.test.ts holds this to the actual exports.
export const soulConstName = (mode: Mode): string => `${mode.toUpperCase()}_SOUL_MD`;

// Core, then the mode, and nothing of the app's own in between. One blank line
// is the join because the core ends with a newline and markdown needs the gap.
export const composeSoul = (mode: Mode): string =>
  `${CORE_SOUL_MD}\n${MODES[mode].soul}`;
