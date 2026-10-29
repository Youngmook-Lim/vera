import { advice } from './advice';
import { affirmations } from './affirmations';
import { horror } from './horror';
import { notes } from './notes';
import type { RegistryEntry } from './types';

// Six slots, three to a row: 01 advice, 02 horror, 03 notes, 04 affirmations,
// 05 and 06 empty. This array is the only place a module is named — the cabinet builds its tiles
// from it and ScreenRouter builds its module screens from it, so a new room is
// one folder exporting a ModuleDef plus one line here.
//
// Specimen-03 is off the registry, not deleted (2026-09-07): the folder, its
// store, its hunger tests and palette.organism all stay where they are, and
// reviving it is this import plus its entry. Two things it needs first — its
// tile is still shaped as the full-width feature row the drawer no longer has,
// so it wants an 86px cell like every other; and it parks on slot 06, which is
// where it would land unless it is given a free slot nearer the top.
export const registry: RegistryEntry[] = [
  advice,
  horror,
  notes,
  affirmations,
  { slot: '05' },
  { slot: '06' },
];
