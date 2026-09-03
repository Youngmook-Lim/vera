import { advice } from './advice';
import { organism } from './organism';
import type { RegistryEntry } from './types';

// Four slots (spec §3): 01 organism, 02 advice, 03 and 04 empty. This array
// is the only place either of them is named — the cabinet builds its tiles
// from it and ScreenRouter builds its module screens from it, so a third
// module is one folder exporting a ModuleDef plus one line here.
export const registry: RegistryEntry[] = [organism, advice, { slot: '03' }, { slot: '04' }];
