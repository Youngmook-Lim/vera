// Which face the launcher wears. Pure, so the rotation is testable without a
// device — the native side only ever receives the answer.
//
// Android has no API for changing an app icon. The only mechanism is a set of
// <activity-alias> entries, one per face, exactly one enabled at a time. The
// plugin declares them; `plugins/withRotatingIcons.js` is the other half of
// this file.

// One list, read from here and from the config plugin, so the rotation and the
// launcher aliases cannot drift apart. A face named here with no alias behind
// it would be a day the icon silently refuses to change.
//
// Order is the design set's, and it is deliberate: no two dim states adjacent,
// and the two greys sit either side of the loudest face, so a dull week never
// happens. Reordering it changes which face a given day wears.
import faces from './faces.json';
import type { Theme } from './theme';

export type Face = string;

export const FACES: readonly Face[] = faces.order;

// Dormant is not in the cycle. It is the override for a subject with no
// credential — she is not awake, so the optic is dead grey and stays there.
export const DORMANT: Face = faces.dormant;

const DAY_MS = 86_400_000;

// Epoch days, not day-of-year: 365 is 5 mod 8, so a day-of-year rotation would
// skip three faces every New Year.
//
// UTC days, because that is what dividing the epoch gives. The face therefore
// turns over at midnight UTC rather than local midnight — for a subject in
// Seoul that is 09:00. Deliberate: local midnight would need the timezone at
// rotation time, and a subject who travels would see the face jump backwards.
export const faceFor = (now: number, hasKey: boolean): Face => {
  if (!hasKey) return DORMANT;
  const day = Math.floor(now / DAY_MS);
  // Negative epochs floor toward -Infinity, so JS's % can return negative here.
  const index = ((day % FACES.length) + FACES.length) % FACES.length;
  return FACES[index];
};

// Which alias carries a face on a given ground (2026-10-08). The light set is
// the same nine faces drawn in 1f's finish, so the DAY decides the face and the
// THEME decides only which drawing of it — the two never disagree about what
// day it is. The prefix lives in faces.json because the config plugin builds
// the alias names from it.
export const LIGHT_PREFIX: string = faces.lightPrefix;

export const aliasFor = (face: Face, theme: Theme): string =>
  theme === 'light' ? `${LIGHT_PREFIX}${face}` : face;
