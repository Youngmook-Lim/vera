import type { RegistryEntry } from './types';

// Four slots (spec §3). Modules 01 (Specimen-03) and 02 (My Identity) are
// built in Tasks 16 and 17 and take their places ahead of the empties; until
// then the cabinet holds four unfurnished rooms.
export const registry: RegistryEntry[] = [{ slot: '03' }, { slot: '04' }];
