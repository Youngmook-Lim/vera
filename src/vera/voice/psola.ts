// Time-domain pitch-synchronous overlap-add: the half of the chain that
// speaks. Cut the voice into two-period grains centred on each glottal pulse,
// then lay them back down at the TARGET period instead of the source one.
// Grain spacing sets the pitch, and grain choice tracks the clock, so the
// duration does not move.
//
// No imports outside src/vera/voice/.
import type { PitchFrame } from './pitch';

// Where there is no pitch (consonants, breath), grains are laid down at the
// spacing they were taken at: Hann windows at half their width sum to one, so
// unvoiced sound passes through unchanged.
const UNVOICED_STEP_S = 0.005;

export const psola = (
  x: Float32Array,
  rate: number,
  frames: readonly PitchFrame[],
  target: readonly (number | null)[],
  hop: number,
): Float32Array => {
  const n = x.length;
  if (n === 0 || frames.length === 0) return x.slice();
  const frameAt = (t: number) => Math.max(0, Math.min(frames.length - 1, Math.round(t / hop)));
  const step = Math.max(1, Math.round(rate * UNVOICED_STEP_S));

  // Analysis marks: one per period in voiced sound, each snapped to the
  // loudest sample within a quarter-period, which is where the pulse is.
  const marks: number[] = [];
  let t = 0;
  while (t < n) {
    const f0 = frames[frameAt(t)].f0;
    if (f0) {
      const period = rate / f0;
      const reach = Math.max(1, Math.round(period / 4));
      let best = t;
      let peak = -1;
      for (let i = Math.max(0, t - reach); i <= Math.min(n - 1, t + reach); i++) {
        const a = Math.abs(x[i]);
        if (a > peak) {
          peak = a;
          best = i;
        }
      }
      const last = marks.length ? marks[marks.length - 1] : -1;
      const mark = best > last ? best : last + 1;
      marks.push(mark);
      t = mark + Math.max(1, Math.round(period));
    } else {
      marks.push(t);
      t += step;
    }
  }

  const out = new Float32Array(n);
  const weight = new Float32Array(n);
  let k = 0;
  let ts = marks[0];
  while (ts < n) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ts) <= Math.abs(marks[k] - ts)) k++;
    const a = marks[k];
    const fi = frameAt(a);
    const src = frames[fi].f0;
    const dst = target[fi];
    const ta = src ? rate / src : step;
    const tsStep = src && dst ? rate / dst : ta;
    const half = Math.max(1, Math.round(ta));
    for (let j = -half; j <= half; j++) {
      const si = a + j;
      const oi = ts + j;
      if (si < 0 || si >= n || oi < 0 || oi >= n) continue;
      const w = 0.5 * (1 + Math.cos((Math.PI * j) / half));
      out[oi] += x[si] * w;
      weight[oi] += w;
    }
    ts += Math.max(1, Math.round(tsStep));
  }
  // Where grains crowd (pitch raised) they would add up louder; where they
  // spread (pitch lowered) the sum dips. Dividing by the window sum evens both.
  // Below a quarter there is too little signal to trust the division.
  for (let i = 0; i < n; i++) if (weight[i] > 0.25) out[i] /= weight[i];
  return out;
};
