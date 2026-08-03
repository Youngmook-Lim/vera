import type { RegistryEntry } from './types';

// Four slots (spec §3): 01 organism, 02 identity, 03 and 04 empty. Modules 01
// and 02 don't have folders yet — Tasks 16 and 17 build them — so this array
// can only describe the two empty ones for now; Cabinet.tsx furnishes 01/02
// itself, hardcoded, rather than reading (nonexistent) Tile/Screen fields off
// a fake entry here.
//
// Once Tasks 16/17 land, add their ModuleDef entries ahead of these two:
//   { id: 'mod01', slot: '01', Tile: OrganismTile, Screen: OrganismScreen },
//   { id: 'mod02', slot: '02', Tile: IdentityTile, Screen: IdentityScreen },
// and Task 18 (which wires Screens from the registry) should also switch
// Cabinet.tsx's hardcoded 01/02 tiles over to reading `registry` like the
// empty slots already do.
export const registry: RegistryEntry[] = [{ slot: '03' }, { slot: '04' }];
