// The metal around the voice. Secondary to the contour: these make her sound
// built rather than born. No imports outside src/vera/voice/.
export const ringMod = (x: Float32Array, rate: number, hz: number, mix: number): Float32Array =>
  x.map((v, i) => v * (1 - mix + mix * Math.cos((2 * Math.PI * hz * i) / rate)));

// A short feedback comb: one fixed resonance a few milliseconds long, which is
// what a voice through a speaker grille in a hard room sounds like.
export const comb = (x: Float32Array, rate: number, ms: number, feedback: number, mix: number): Float32Array => {
  const d = Math.max(1, Math.round((ms * rate) / 1000));
  const wet = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) wet[i] = x[i] + (i >= d ? feedback * wet[i - d] : 0);
  return x.map((v, i) => (1 - mix) * v + mix * wet[i]);
};

export const grit = (x: Float32Array, bits: number, mix: number): Float32Array => {
  const levels = 2 ** (bits - 1);
  return x.map((v) => (1 - mix) * v + (mix * Math.round(v * levels)) / levels);
};

export const normalize = (x: Float32Array, peak: number): Float32Array => {
  let max = 0;
  for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i]));
  if (max === 0 || !Number.isFinite(max)) return x.map((v) => (Number.isFinite(v) ? v : 0));
  const scale = peak / max;
  return x.map((v) => v * scale);
};
