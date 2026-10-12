// Every number her voice is made of. Tuned BY EAR in tools/voice-lab.mjs
// (Task 8) — the values below are the starting point, not the result.
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
}

export const SETTINGS: ChainSettings = {
  flatten: 0.85,
  jumpChance: 0.3,
  jumpSemitones: 3,
  ringHz: 30,
  ringMix: 0.12,
  combMs: 1.8,
  combFeedback: 0.35,
  combMix: 0.25,
  gritBits: 12,
  gritMix: 0.15,
  peak: 0.89,
};

export const CHAIN_VERSION = 1;
