// Pure hunger math for Specimen-03. No React, no Skia. The organism is a
// tamagotchi: hunger drifts UP over time and DOWN when you tap to feed it.
// See docs/superpowers/specs/2026-07-23-organism-module-design.md.

export const START_HUNGER = 82; // prototype's starting value
export const FEED_PER_TAP = 10; // each tap lowers hunger by this (~8 taps to full)
export const DRIFT_PER_HOUR = 2.5; // hunger climbs this much per hour since last fed
export const HUNGRY_THRESHOLD = 50; // >= this reads as HUNGRY

const clamp = (n: number) => Math.max(0, Math.min(100, n));

// Hunger right now: stored value plus drift since it was last fed.
export const hungerForNow = (
  storedHunger: number | null,
  lastFedISO: string | null,
  now: Date,
): number => {
  if (storedHunger == null || lastFedISO == null) return START_HUNGER;
  const elapsedMs = now.getTime() - new Date(lastFedISO).getTime();
  const hours = Math.max(0, elapsedMs / 3_600_000);
  return clamp(storedHunger + hours * DRIFT_PER_HOUR);
};

export const feed = (hunger: number): number => clamp(hunger - FEED_PER_TAP);

export const isHungry = (hunger: number): boolean => hunger >= HUNGRY_THRESHOLD;
