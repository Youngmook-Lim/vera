// How fast her words draw. With a voice, the last character lands as she
// finishes speaking. Clamped so a long take never crawls and a short one never
// flashes. With no voice it is the 16ms the typewriter has always used.
// No imports outside src/vera/voice/.
export const SILENT_PACE_MS = 16;
const SLOWEST_MS = 90;

export const typewriterPace = (chars: number, durationMs: number | null): number => {
  if (durationMs === null || chars <= 0) return SILENT_PACE_MS;
  return Math.min(SLOWEST_MS, Math.max(SILENT_PACE_MS, Math.round(durationMs / chars)));
};
