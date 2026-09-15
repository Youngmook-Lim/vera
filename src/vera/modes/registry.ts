import { CORE_SOUL_MD } from '../soul';
import { DEFAULT_MODE } from './default';
import { SUPPORTIVE_MODE } from './supportive';
import type { Mode, ModeDef } from './types';

export type { Mode, ModeDef };

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

// Core, then the mode, and nothing of the app's own in between. One blank line
// is the join because the core ends with a newline and markdown needs the gap.
export const composeSoul = (mode: Mode): string =>
  `${CORE_SOUL_MD}\n${MODES[mode].soul}`;
