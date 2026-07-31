import type { ComponentType } from 'react';

export type ModuleId = 'mod01' | 'mod02';

// The doorway rule (spec §4): the shell owns the tile, the full-bleed, one exit
// at a fixed position in the module's own ink, and her dot. Everything inside
// the threshold belongs to the module.
export interface ModuleDef {
  id: ModuleId;
  slot: '01' | '02';
  Tile: ComponentType<{ onPress: () => void }>;
  Screen: ComponentType;
}

export interface EmptySlot {
  slot: '03' | '04';
}

export type RegistryEntry = ModuleDef | EmptySlot;
export const isEmpty = (e: RegistryEntry): e is EmptySlot => !('id' in e);
