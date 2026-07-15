import { field } from './field';
import { hazard } from './hazard';
import { incinerator } from './incinerator';
import { organism } from './organism';
import { results } from './results';
import type { LockedSlot, RegistryEntry } from './types';

// Home-grid order from the mock: field, organism, hazard, results,
// incinerator (wide row), then two dashed "budget pending" vitrines.
export const registry: RegistryEntry[] = [
  field,
  organism,
  hazard,
  results,
  incinerator,
  { id: 'slot-6', locked: true, opacity: 0.85 },
  { id: 'slot-7', locked: true, opacity: 0.65 },
];

export const isLocked = (e: RegistryEntry): e is LockedSlot => 'locked' in e;
