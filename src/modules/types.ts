import type { ComponentType } from 'react';
import type { Lang } from '../core/i18n';
import type { TagScheme } from '../core/theme';

export type ModuleId = 'results' | 'incinerator' | 'field' | 'organism' | 'hazard';

export interface TileData {
  title: string;
  sub: string;
  tag: string;
  tagScheme: TagScheme;
}

// The contract from docs/architecture.md: a new toy = a new folder in
// modules/ exporting one of these + one registry line. Nothing else changes.
export interface ModuleDef {
  id: ModuleId;
  layout: 'square' | 'wide'; // wide spans both home-grid columns
  Icon: ComponentType; // rendered inside the 32×32 dark icon box
  tile: (lang: Lang) => TileData;
  Screen: ComponentType;
}

// "Budget pending" vitrines on the home grid are registry entries too.
export interface LockedSlot {
  id: string;
  locked: true;
  opacity: number;
}

export type RegistryEntry = ModuleDef | LockedSlot;
