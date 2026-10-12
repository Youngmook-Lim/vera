// Her intonation — and the character. GLaDOS is not a filter on a voice; she
// is a voice whose pitch has been pulled almost flat and snapped to fixed
// steps, so it lands a little wrong in a way no person's does. Three moves,
// per voiced frame:
//
//   1. Pull the pitch most of the way to the line's median (near-monotone).
//   2. Snap to the nearest semitone of that median (the quantised edge).
//   3. Now and then, step a whole voiced run up or down by a fixed interval
//      — the odd emphasis on a word that no speaker would choose.
//
// The jumps are drawn from a PRNG seeded by the LINE'S OWN TEXT, so the same
// line always sounds identical: the cache stays honest and the tests exact.
//
// No imports outside src/vera/voice/.
import type { PitchFrame } from './pitch';

export interface ContourSettings {
  flatten: number; // 0 leaves the pitch alone, 1 is a single note
  jumpChance: number; // per voiced run
  jumpSemitones: number;
}

// FNV-1a over UTF-16 code units. Hangul is one unit per syllable, so Korean
// hashes as stably as English.
export const hashText = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// mulberry32.
export const prng = (seed: number): (() => number) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const snap = (hz: number, ref: number): number =>
  ref * 2 ** (Math.round(12 * Math.log2(hz / ref)) / 12);

export const contourFor = (
  frames: readonly PitchFrame[],
  text: string,
  s: ContourSettings,
): (number | null)[] => {
  const voiced = frames.map((f) => f.f0).filter((f): f is number => f !== null);
  if (voiced.length === 0) return frames.map(() => null);
  const ref = median(voiced);
  const rand = prng(hashText(text));
  let shift = 0;
  let inRun = false;
  return frames.map(({ f0 }) => {
    if (f0 === null) {
      inRun = false;
      return null;
    }
    if (!inRun) {
      inRun = true;
      shift = rand() < s.jumpChance ? (rand() < 0.5 ? -1 : 1) * s.jumpSemitones : 0;
    }
    const flat = ref * (f0 / ref) ** (1 - s.flatten);
    return snap(flat * 2 ** (shift / 12), ref);
  });
};
