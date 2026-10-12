// Where her pitch is, frame by frame — the half of the chain that listens.
// YIN (de Cheveigné & Kawahara, 2002): the cumulative-mean-normalised
// difference function, the first dip under a threshold, and a parabola
// through it for sub-sample accuracy.
//
// No imports outside src/vera/voice/.
export interface PitchFrame {
  at: number; // sample index of the frame's centre, in the input's own rate
  f0: number | null; // Hz, or null where there is no pitch to speak of
}

export const PITCH = {
  minHz: 70,
  maxHz: 500,
  threshold: 0.15,
  gate: 0.01, // RMS under which a window is silence, not speech
  hopS: 0.01,
  sizeS: 0.04,
  // A frame YIN is unsure of still joins a voiced run it borders when its best
  // guess is under `loose`, within `growSemitones` of its neighbour, and at
  // least `growLevel` as loud. Fast bends and breathy vowels land here.
  loose: 0.7,
  growSemitones: 2,
  growLevel: 0.7,
};

// The cumulative-mean-normalised difference over the window, or null where
// there is nothing to measure.
const cmndOf = (x: Float32Array, start: number, size: number, rate: number) => {
  const maxTau = Math.min(Math.floor(rate / PITCH.minHz), Math.floor(size / 2));
  const minTau = Math.max(2, Math.floor(rate / PITCH.maxHz));
  const w = size - maxTau;
  if (w <= 0 || start < 0 || start + size > x.length) return null;

  let energy = 0;
  for (let j = 0; j < size; j++) energy += x[start + j] * x[start + j];
  if (Math.sqrt(energy / size) < PITCH.gate) return null;

  const d = new Float64Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let j = 0; j < w; j++) {
      const diff = x[start + j] - x[start + j + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }

  const cmnd = new Float64Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  return { cmnd, minTau, maxTau };
};

const refine = (cmnd: Float64Array, tau: number, rate: number): number => {
  const a = cmnd[tau - 1];
  const b = cmnd[tau];
  const c = cmnd[tau + 1];
  const denom = a - 2 * b + c;
  return rate / (denom !== 0 ? tau + (a - c) / (2 * denom) : tau);
};

export const yin = (x: Float32Array, start: number, size: number, rate: number): number | null => {
  const m = cmndOf(x, start, size, rate);
  if (!m) return null;
  const { cmnd, minTau, maxTau } = m;
  let tau = minTau;
  while (tau < maxTau && cmnd[tau] >= PITCH.threshold) tau++;
  if (tau >= maxTau) return null;
  while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;
  return refine(cmnd, tau, rate);
};

// YIN's best guess when it is not sure: the deepest dip anywhere, if it is
// under `loose`.
const guess = (x: Float32Array, start: number, size: number, rate: number): number | null => {
  const m = cmndOf(x, start, size, rate);
  if (!m) return null;
  const { cmnd, minTau, maxTau } = m;
  let tau = minTau;
  for (let t = minTau; t < maxTau; t++) if (cmnd[t] < cmnd[tau]) tau = t;
  return cmnd[tau] < PITCH.loose ? refine(cmnd, tau, rate) : null;
};

// Detected on a 2:1 average of the signal. A speaking voice's fundamental sits
// far below the 6kHz that leaves, and it quarters the work — this runs on the
// phone, inside the second the text is already waiting.
export const track = (x: Float32Array, rate: number): { frames: PitchFrame[]; hop: number } => {
  const half = new Float32Array(x.length >> 1);
  for (let i = 0; i < half.length; i++) half[i] = (x[2 * i] + x[2 * i + 1]) / 2;
  const r = rate / 2;
  const hop = Math.round(rate * PITCH.hopS);
  const size = Math.round(r * PITCH.sizeS);
  const frames: PitchFrame[] = [];
  for (let at = 0; at < x.length; at += hop) {
    frames.push({ at, f0: yin(half, Math.round(at / 2 - size / 2), size, r) });
  }

  // Grow each voiced run outward, one frame at a time, forward then back.
  const level = frames.map(({ at }) => {
    let s = 0;
    for (let i = Math.max(0, at - hop); i < Math.min(x.length, at + hop); i++) s += x[i] * x[i];
    return Math.sqrt(s / (2 * hop));
  });
  const guesses = frames.map(({ at, f0 }) => (f0 === null ? guess(half, Math.round(at / 2 - size / 2), size, r) : null));
  const join = (i: number, from: number) => {
    const g = guesses[i];
    const nb = frames[from]?.f0;
    if (frames[i].f0 !== null || g === null || !nb) return;
    if (level[i] < PITCH.growLevel * level[from]) return;
    if (Math.abs(12 * Math.log2(g / nb)) <= PITCH.growSemitones) frames[i] = { at: frames[i].at, f0: g };
  };
  for (let i = 1; i < frames.length; i++) join(i, i - 1);
  for (let i = frames.length - 2; i >= 0; i--) join(i, i + 1);
  return { frames, hop };
};
