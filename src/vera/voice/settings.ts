// Every number her voice is made of. Tuned BY EAR in tools/voice-lab.mjs on
// 2026-10-12, against Callirrhoe. Two of the four effects are at zero, and
// they were heard that way, not skipped:
//
//   - ringMix: at 30Hz, ring modulation is a tremolo — it swung her volume by
//     a quarter thirty times a second, and that was heard as her trembling.
//   - gritMix: twelve bits is about 66dB down, under anything audible; at any
//     depth that could be heard it is static, which is what was being removed.
//
// CHAIN_VERSION is part of every cache key. Bump it whenever a number here
// or any algorithm in this folder changes, or the phone keeps replaying audio
// made by the old chain.
//
// No imports outside src/vera/voice/.
import type { ContourSettings } from './contour';

export interface ChainSettings extends ContourSettings {
  ringHz: number;
  ringMix: number;
  combMs: number;
  combFeedback: number;
  combMix: number;
  gritBits: number;
  gritMix: number;
  peak: number;
  maxGain: number;
}

export const SETTINGS: ChainSettings = {
  flatten: 0.85,
  jumpChance: 0.3,
  jumpSemitones: 3,
  ringHz: 30,
  ringMix: 0,
  combMs: 1.8,
  combFeedback: 0.35,
  combMix: 0.25,
  gritBits: 12,
  gritMix: 0,
  peak: 0.89,
  // Every one of Gemini's thirty raw takes needs 1.4x at most; 4x is room for a
  // quiet one and nowhere near the 3000x a near-silent take asked for.
  maxGain: 4,
};

export const CHAIN_VERSION = 3;
