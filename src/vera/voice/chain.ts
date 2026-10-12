// Speech in, her voice out. The whole chain, in the order it is applied.
// No imports outside src/vera/voice/.
import { contourFor } from './contour';
import { comb, grit, normalize, ringMod } from './fx';
import { track } from './pitch';
import { psola } from './psola';
import { SETTINGS, type ChainSettings } from './settings';

// Named processVoice, not process: the voice lab runs this under Node, where
// `process` is a global.
export const processVoice = (
  pcm: Float32Array,
  rate: number,
  text: string,
  s: ChainSettings = SETTINGS,
): Float32Array => {
  const { frames, hop } = track(pcm, rate);
  let y = psola(pcm, rate, frames, contourFor(frames, text, s), hop);
  y = ringMod(y, rate, s.ringHz, s.ringMix);
  y = comb(y, rate, s.combMs, s.combFeedback, s.combMix);
  y = grit(y, s.gritBits, s.gritMix);
  return normalize(y, s.peak);
};
