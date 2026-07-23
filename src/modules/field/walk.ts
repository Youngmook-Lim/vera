// Pure display helpers for Field Trials. No React. The walk is fake: distance
// ticks down while the button is held (see the spec). Mirrors the prototype's
// derivations in design/The Facility.dc.html.

export const START_DIST = 340;
export const TICK_MS = 220;

// One 220ms step: distance drops by a random 6..12m, floored at 0.
export const walkStep = (dist: number, rand: () => number = Math.random): number =>
  Math.max(0, dist - (6 + Math.floor(rand() * 7)));

// Homing angle (deg): wanders near 34° at the start, converges to 0° on arrival.
export const needleAngle = (dist: number): number => 34 - (START_DIST - dist) * 0.1;

// Bar 1 is always lit; the rest light at < 320, < 240, < 120, <= 0.
export const signalLitCount = (dist: number): number =>
  1 + (dist < 320 ? 1 : 0) + (dist < 240 ? 1 : 0) + (dist < 120 ? 1 : 0) + (dist <= 0 ? 1 : 0);

export const veraKey = (
  dist: number,
  walking: boolean,
  arrived: boolean,
): 'vera' | 'veraWalking' | 'veraNear' | 'veraArrived' => {
  if (arrived) return 'veraArrived';
  if (dist < 100) return 'veraNear';
  if (walking || dist < START_DIST) return 'veraWalking';
  return 'vera';
};
