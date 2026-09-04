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
  // A row this room contributes to the SYSTEM screen's PREFERENCES section.
  // Optional: most rooms have no preference to offer. It exists so the shell
  // can carry a module's setting without naming the module — the same reason
  // Cabinet and ScreenRouter read the registry instead of a list.
  Settings?: ComponentType;
}

export interface EmptySlot {
  slot: '03' | '04';
}

export type RegistryEntry = ModuleDef | EmptySlot;
export const isEmpty = (e: RegistryEntry): e is EmptySlot => !('id' in e);
export const isModule = (e: RegistryEntry): e is ModuleDef => 'id' in e;
