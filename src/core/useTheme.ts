import { useFacilityStore } from './store';
import { PALETTES, type Palette } from './theme';

// Its own file, not `theme.ts`: this imports the store, and `store.ts` imports
// `theme.ts` — putting it there would close the cycle.
//
// For colours that are NOT in a StyleSheet — a placeholder, a border read off
// the register, a room's accent blended with her mood. Anything inside a sheet
// comes from `themed()` instead, which needs no hook at all.
export const usePalette = (): Palette => PALETTES[useFacilityStore((s) => s.theme)];
