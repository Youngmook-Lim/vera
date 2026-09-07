import type { ComponentType } from 'react';

// Six slots, three to a row. A room's route id IS its slot: the two numbers
// were allowed to differ once and drifted immediately — the advice room wore
// 02 on a tile sitting first — so they now come out of one vocabulary and
// cannot disagree again.
export type Slot = '01' | '02' | '03' | '04' | '05' | '06';
export type ModuleId = `mod${Slot}`;

// The doorway rule (spec §4): the shell owns the tile, the full-bleed, one exit
// at a fixed position in the module's own ink, and her dot. Everything inside
// the threshold belongs to the module.
export interface ModuleDef {
  id: ModuleId;
  slot: Slot;
  Tile: ComponentType<{ onPress: () => void }>;
  Screen: ComponentType;
  // A row this room contributes to the SYSTEM screen's PREFERENCES section.
  // Optional: most rooms have no preference to offer. It exists so the shell
  // can carry a module's setting without naming the module — the same reason
  // Cabinet and ScreenRouter read the registry instead of a list.
  Settings?: ComponentType;
  // Work this room does when the app launches: schedule what it sends, take a
  // tap Android held while the app was dead, subscribe to taps arriving now.
  // Returns its own teardown. Optional — most rooms have nothing to do.
  //
  // It exists so App.tsx can boot the rooms without naming one, the same
  // reason `Settings` exists and the same reason Cabinet and ScreenRouter read
  // the registry. It is called AFTER the facility store has hydrated, so the
  // language a notification is scheduled in is the one that was settled on.
  onBoot?: () => Promise<(() => void) | void> | (() => void) | void;
}

export interface EmptySlot {
  slot: Slot;
}

export type RegistryEntry = ModuleDef | EmptySlot;
export const isEmpty = (e: RegistryEntry): e is EmptySlot => !('id' in e);
export const isModule = (e: RegistryEntry): e is ModuleDef => 'id' in e;
