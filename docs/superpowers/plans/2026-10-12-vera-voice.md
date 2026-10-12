# V.E.R.A. Speaks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V.E.R.A. speaks every line she says aloud, in an original preset voice processed on-device into a GLaDOS-style delivery.

**Architecture:** A pure-TypeScript audio chain lives in `src/vera/voice/`
(PCM, YIN pitch tracking, a seeded flatten-and-snap contour, TD-PSOLA, light
effects). It has no runtime imports outside that folder, so a Mac voice lab
runs the identical code under Node. `src/core/voice.ts` is the effectful half:
- it fetches speech from OpenRouter's `/api/v1/audio/speech` on her existing
  key;
- it processes the audio and caches the WAV with `expo-file-system`;
- it plays it with `expo-audio`.

`speak()` holds her text until the audio is ready, then starts playback and a
duration-paced typewriter together.

**Tech Stack:**
- React Native + Expo SDK 57, TypeScript.
- Jest 29 with RTL v14 (fully async).
- `expo-audio` and `expo-file-system` (new, native).
- Node 24 for the lab: it strips types natively, plus a small resolve hook.

**Spec:** `docs/superpowers/specs/2026-10-12-vera-voice-design.md`

## Global Constraints

- **Repo style:** single quotes. No editor reformatting to double quotes.
- **Copy:** all copy verbatim from `T` in `src/shell/strings.ts`. New strings
  go there, en and ko.
- **Colours:** every hex from the palette or the theme's tokens. The voice
  glyph uses `p.hairlineDim` off and her raw iris on, an object like the
  slider's ring.
- **No test may make a real network request.** Every fetch is injected and
  stubbed.
- **Expo docs:** read the exact versioned docs before writing Expo code
  (AGENTS.md):
  - https://docs.expo.dev/versions/v57.0.0/sdk/audio/
  - https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/
- **Native installs:** `npx expo install <pkg>`, never a bare `npm i`. Keep
  `.npmrc`'s `legacy-peer-deps=false`.
- **Commits:** no Co-Authored-By, no Claude-Session, nothing naming the model.
  The user's CLAUDE.md overrides the system reminder.
- **Verification:** every task ends with `npx tsc --noEmit` and the task's
  tests green. The final task runs the full `npm test`.
- **`src/vera/voice/*.ts` must not import anything outside
  `src/vera/voice/`.** Only `import type` across that boundary. The voice lab
  depends on it.
- **TTS model:**
  - OpenRouter: `openai/gpt-4o-mini-tts-2025-12-15`
  - OpenAI: `gpt-4o-mini-tts-2025-12-15`
- **PCM:** assumed 24kHz, s16le, mono until Task 7 confirms it.
- **Voice off by default.** She is told nothing when it changes.
- **Hold timeout:** `VOICE_TIMEOUT_MS = 8000`.
- **Cache:** `CACHE_CAP = 200` files.
- **Typewriter pace:** clamped 16–90ms per character. Silent fallback is 16ms.

## Review Focus

1. **A line too short or too quiet to have a pitch** (`No.`, `…`). The chain
   must return finite audio of the same length and never throw. Pinned in
   Task 5.
2. **A 200 that isn't audio** (a JSON error body with a 200 status, or an
   empty body). This must be a failure. It must not become a 0ms WAV that
   paces the typewriter to nothing. Pinned in Task 6.
3. **Korean lines.** The hash is stable for Hangul, and the request carries
   the Korean verbatim. Pinned in Tasks 4 and 10.
4. **A poke while she is still speaking.** The old playback stops before the
   new line plays. Pinned in Task 10.
5. **Voice switched off while a line is being synthesised.** Nothing plays
   when the synthesis lands. Pinned in Task 10.

---

## File Structure

| file | status | responsibility |
|---|---|---|
| `src/vera/voice/pcm.ts` | create | s16le ↔ Float32, WAV encode/decode |
| `src/vera/voice/pitch.ts` | create | YIN on one window; per-10ms track |
| `src/vera/voice/contour.ts` | create | text hash, PRNG, median, semitone snap, the GLaDOS contour |
| `src/vera/voice/psola.ts` | create | TD-PSOLA resynthesis to a target contour |
| `src/vera/voice/fx.ts` | create | ring mod, comb resonance, grit, normalise |
| `src/vera/voice/settings.ts` | create | every tunable number + `CHAIN_VERSION` |
| `src/vera/voice/chain.ts` | create | `processVoice` — composes the above |
| `src/vera/voice/pace.ts` | create | `typewriterPace` |
| `src/vera/voice/tts.ts` | create | routes, request, `fetchSpeech` (network injected) |
| `src/vera/modes/types.ts` + `default.ts` + `supportive.ts` | modify | `voiceDirection` |
| `tools/ts-resolve-hooks.mjs` | create | lets Node resolve the repo's extensionless TS imports |
| `tools/voice-lab.mjs` | create | the Mac listening tool |
| `src/core/voice.ts` | create | cache, prepare, play, stop |
| `jest.setup.ts` | modify | global `expo-audio` / `expo-file-system` mocks |
| `src/core/store.ts` | modify | `voice` setting, `setVoice`, `speak()` hold + pace, `PromptRecord.voice` |
| `src/shell/FileScreen.tsx` | modify | `voice:` line on the PROMPT screen |
| `src/shell/strings.ts` | modify | `voice`, `notOnKey` |
| `src/shell/VoiceRow.tsx` | create | the PREFERENCES row |
| `src/shell/VoiceToggle.tsx` | create | the stage-header glyph |
| `src/shell/SystemScreen.tsx` + `Stage.tsx` | modify | mount them |
| `App.tsx` | modify | stop playback on background |
| `.gitignore` | modify | `voice-lab-out/` |
| `CLAUDE.md` | modify | the feature's section |

---

### Task 1: PCM and WAV

**Files:**
- Create: `src/vera/voice/pcm.ts`
- Test: `src/vera/voice/__tests__/pcm.test.ts`

**Interfaces:**
- Produces:
  - `PCM_RATE = 24000`
  - `fromS16LE(bytes: Uint8Array): Float32Array`
  - `toS16LE(samples: Float32Array): Uint8Array`
  - `encodeWav(samples: Float32Array, rate: number): Uint8Array`
  - `decodeWav(bytes: Uint8Array): { samples: Float32Array; rate: number }`

- [ ] **Step 0: Branch**

```bash
git checkout -b vera-voice
```

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/pcm.test.ts
import { decodeWav, encodeWav, fromS16LE, toS16LE } from '../pcm';

describe('pcm', () => {
  it('round-trips samples through s16le to within one step', () => {
    const x = Float32Array.from([0, 0.5, -0.5, 0.999, -1]);
    const y = fromS16LE(toS16LE(x));
    x.forEach((v, i) => expect(Math.abs(y[i] - v)).toBeLessThan(1 / 32767 + 1e-6));
  });

  it('clamps past full scale rather than wrapping', () => {
    const y = fromS16LE(toS16LE(Float32Array.from([1.5, -1.5])));
    expect(y[0]).toBeCloseTo(32767 / 32768, 5);
    expect(y[1]).toBe(-1);
  });

  it('reads little-endian 16-bit', () => {
    expect(fromS16LE(Uint8Array.from([0x00, 0x40]))[0]).toBe(0.5);
  });

  it('ignores a trailing odd byte', () => {
    expect(fromS16LE(Uint8Array.from([0, 0, 7]))).toHaveLength(1);
  });

  it('writes a WAV that reads back with its rate and samples', () => {
    const x = Float32Array.from([0, 0.25, -0.25]);
    const wav = encodeWav(x, 24000);
    expect(wav).toHaveLength(44 + 6);
    const { samples, rate } = decodeWav(wav);
    expect(rate).toBe(24000);
    expect(Array.from(samples)).toEqual(Array.from(fromS16LE(toS16LE(x))));
  });

  it('refuses something that is not a WAV', () => {
    expect(() => decodeWav(new Uint8Array(44))).toThrow('not a wav');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/pcm.test.ts`
Expected: FAIL — `Cannot find module '../pcm'`

- [ ] **Step 3: Implement**

```ts
// src/vera/voice/pcm.ts
// Raw speech in, a playable file out. OpenAI-shaped speech endpoints return
// `pcm` as bare 16-bit little-endian mono samples with no header; a phone's
// player wants a WAV. Everything in this folder works in Float32 between the
// two.
//
// No imports outside src/vera/voice/: tools/voice-lab.mjs runs this exact file
// under Node.
export const PCM_RATE = 24_000;

export const fromS16LE = (bytes: Uint8Array): Float32Array => {
  const n = bytes.length >> 1;
  const out = new Float32Array(n);
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  for (let i = 0; i < n; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
};

export const toS16LE = (samples: Float32Array): Uint8Array => {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, Math.round(v < 0 ? v * 32768 : v * 32767), true);
  }
  return out;
};

const ascii = (view: DataView, at: number, s: string): void => {
  for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
};

export const encodeWav = (samples: Float32Array, rate: number): Uint8Array => {
  const data = toS16LE(samples);
  const out = new Uint8Array(44 + data.length);
  const v = new DataView(out.buffer);
  ascii(v, 0, 'RIFF');
  v.setUint32(4, 36 + data.length, true);
  ascii(v, 8, 'WAVE');
  ascii(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(v, 36, 'data');
  v.setUint32(40, data.length, true);
  out.set(data, 44);
  return out;
};

export const decodeWav = (bytes: Uint8Array): { samples: Float32Array; rate: number } => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a wav');
  let at = 12;
  let rate = 0;
  while (at + 8 <= bytes.length) {
    const id = tag(at);
    const size = v.getUint32(at + 4, true);
    if (id === 'fmt ') rate = v.getUint32(at + 12, true);
    if (id === 'data') return { samples: fromS16LE(bytes.subarray(at + 8, at + 8 + size)), rate };
    at += 8 + size + (size & 1);
  }
  throw new Error('wav has no data chunk');
};
```

- [ ] **Step 4: Run it**

Run: `npx jest src/vera/voice/__tests__/pcm.test.ts && npx tsc --noEmit`
Expected: 6 passed, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/vera/voice/pcm.ts src/vera/voice/__tests__/pcm.test.ts
git commit -m "feat(voice): raw speech in, WAV out"
```

---

### Task 2: Pitch tracking (YIN)

**Files:**
- Create: `src/vera/voice/pitch.ts`
- Test: `src/vera/voice/__tests__/pitch.test.ts`

**Interfaces:**
- Produces:
  - `interface PitchFrame { at: number; f0: number | null }` — `at` is a
    sample index at the frame's centre.
  - `PITCH` constants.
  - `yin(x: Float32Array, start: number, size: number, rate: number): number | null`
  - `track(x: Float32Array, rate: number): { frames: PitchFrame[]; hop: number }`
    — one frame per 10ms hop, `frames[i].at === i * hop`.

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/pitch.test.ts
import { track, yin } from '../pitch';

const RATE = 24000;
const sine = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / RATE));
// A fundamental and two harmonics, so the detector is shown something
// voice-shaped and not only a pure tone.
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });

describe('yin', () => {
  it.each([110, 220, 330])('finds %iHz in a pure tone to within 1%', (hz) => {
    const f = yin(sine(hz, 0.1), 0, 960, RATE);
    expect(f).not.toBeNull();
    expect(Math.abs(f! - hz) / hz).toBeLessThan(0.01);
  });

  it('finds the fundamental, not a harmonic', () => {
    const f = yin(voiced(150, 0.1), 0, 960, RATE);
    expect(Math.abs(f! - 150) / 150).toBeLessThan(0.01);
  });

  it('calls silence unvoiced', () => {
    expect(yin(new Float32Array(960), 0, 960, RATE)).toBeNull();
  });

  it('calls noise unvoiced', () => {
    let s = 1;
    const noise = Float32Array.from({ length: 960 }, () => {
      s = (s * 16807) % 2147483647;
      return (s / 2147483647 - 0.5) * 0.8;
    });
    expect(yin(noise, 0, 960, RATE)).toBeNull();
  });

  it('refuses a window that runs off the signal', () => {
    expect(yin(sine(220, 0.01), 0, 960, RATE)).toBeNull();
  });
});

describe('track', () => {
  it('reports one frame per 10ms hop, each at its own sample', () => {
    const { frames, hop } = track(sine(220, 0.5), RATE);
    expect(hop).toBe(240);
    expect(frames).toHaveLength(Math.ceil(12000 / 240));
    expect(frames[3].at).toBe(720);
  });

  it('tracks a steady voice across its middle', () => {
    const { frames } = track(voiced(200, 0.5), RATE);
    const middle = frames.slice(5, -5).map((f) => f.f0);
    expect(middle.every((f) => f !== null && Math.abs(f - 200) / 200 < 0.02)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/pitch.test.ts`
Expected: FAIL — `Cannot find module '../pitch'`

- [ ] **Step 3: Implement**

```ts
// src/vera/voice/pitch.ts
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
};

export const yin = (x: Float32Array, start: number, size: number, rate: number): number | null => {
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

  let tau = minTau;
  while (tau < maxTau && cmnd[tau] >= PITCH.threshold) tau++;
  if (tau >= maxTau) return null;
  while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;

  const a = cmnd[tau - 1];
  const b = cmnd[tau];
  const c = cmnd[tau + 1];
  const denom = a - 2 * b + c;
  const better = denom !== 0 ? tau + (a - c) / (2 * denom) : tau;
  return rate / better;
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
  return { frames, hop };
};
```

- [ ] **Step 4: Run it**

Run: `npx jest src/vera/voice/__tests__/pitch.test.ts && npx tsc --noEmit`
Expected: 9 passed, tsc clean. If the noise case fails, the LCG happened to
dip under the threshold. Do not loosen `PITCH.threshold` for it. Change the
seed `s = 1` to `s = 3` and record why in a comment.

- [ ] **Step 5: Commit**

```bash
git add src/vera/voice/pitch.ts src/vera/voice/__tests__/pitch.test.ts
git commit -m "feat(voice): find her pitch, frame by frame"
```

---

### Task 3: TD-PSOLA

**Files:**
- Create: `src/vera/voice/psola.ts`
- Test: `src/vera/voice/__tests__/psola.test.ts`

**Interfaces:**
- Consumes: `PitchFrame`, `track` from Task 2.
- Produces:
  `psola(x: Float32Array, rate: number, frames: readonly PitchFrame[], target: readonly (number | null)[], hop: number): Float32Array`
  - The output has the same length as `x`.
  - `target[i] === null` leaves frame `i`'s pitch alone.

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/psola.test.ts
import { track } from '../pitch';
import { psola } from '../psola';

const RATE = 24000;
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};
const pitchOf = (x: Float32Array) =>
  median(track(x, RATE).frames.slice(5, -5).map((f) => f.f0).filter((f): f is number => f !== null));

describe('psola', () => {
  it('leaves the pitch alone when the target is the source', () => {
    const x = voiced(200, 0.5);
    const { frames, hop } = track(x, RATE);
    const y = psola(x, RATE, frames, frames.map((f) => f.f0), hop);
    expect(Math.abs(pitchOf(y) - 200) / 200).toBeLessThan(0.02);
  });

  it.each([[200, 150], [200, 260]])('moves %iHz to %iHz', (from, to) => {
    const x = voiced(from, 0.5);
    const { frames, hop } = track(x, RATE);
    const y = psola(x, RATE, frames, frames.map((f) => (f.f0 === null ? null : to)), hop);
    expect(Math.abs(pitchOf(y) - to) / to).toBeLessThan(0.03);
  });

  it('keeps the duration exactly', () => {
    const x = voiced(180, 0.37);
    const { frames, hop } = track(x, RATE);
    expect(psola(x, RATE, frames, frames.map(() => 140), hop)).toHaveLength(x.length);
  });

  it('passes unvoiced sound through untouched', () => {
    const x = Float32Array.from({ length: 4800 }, (_, i) => 0.004 * Math.sin(i * 1.7));
    const { frames, hop } = track(x, RATE);
    expect(frames.every((f) => f.f0 === null)).toBe(true);
    const y = psola(x, RATE, frames, frames.map(() => null), hop);
    for (let i = 600; i < 4200; i++) expect(Math.abs(y[i] - x[i])).toBeLessThan(1e-4);
  });

  it('survives an empty or a tiny input without a single NaN', () => {
    expect(psola(new Float32Array(0), RATE, [], [], 240)).toHaveLength(0);
    const tiny = Float32Array.from([0.1, -0.1, 0.2]);
    const { frames, hop } = track(tiny, RATE);
    expect(Array.from(psola(tiny, RATE, frames, frames.map((f) => f.f0), hop)).every(Number.isFinite)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/psola.test.ts`
Expected: FAIL — `Cannot find module '../psola'`

- [ ] **Step 3: Implement**

```ts
// src/vera/voice/psola.ts
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
```

- [ ] **Step 4: Run it**

Run: `npx jest src/vera/voice/__tests__/psola.test.ts && npx tsc --noEmit`
Expected: 6 passed, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/vera/voice/psola.ts src/vera/voice/__tests__/psola.test.ts
git commit -m "feat(voice): move her pitch without moving her timing"
```

---

### Task 4: The contour — her intonation

**Files:**
- Create: `src/vera/voice/contour.ts`
- Test: `src/vera/voice/__tests__/contour.test.ts`

**Interfaces:**
- Consumes: `PitchFrame` (type only).
- Produces:
  - `interface ContourSettings { flatten: number; jumpChance: number; jumpSemitones: number }`
  - `hashText(s: string): number` — FNV-1a, unsigned 32-bit.
  - `prng(seed: number): () => number` — mulberry32, in [0,1).
  - `median(xs: readonly number[]): number`
  - `snap(hz: number, ref: number): number`
  - `contourFor(frames: readonly PitchFrame[], text: string, s: ContourSettings): (number | null)[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/contour.test.ts
import { contourFor, hashText, median, prng, snap } from '../contour';
import type { PitchFrame } from '../pitch';

const S = { flatten: 0.85, jumpChance: 0.3, jumpSemitones: 3 };
const frames = (f0s: (number | null)[]): PitchFrame[] => f0s.map((f0, i) => ({ at: i * 240, f0 }));
const semis = (hz: number, ref: number) => 12 * Math.log2(hz / ref);

describe('the seed', () => {
  it('hashes the same text the same way, Korean included', () => {
    expect(hashText('Noted.')).toBe(hashText('Noted.'));
    expect(hashText('Noted.')).not.toBe(hashText('Noted!'));
    expect(hashText('기록했어요.')).toBe(hashText('기록했어요.'));
    expect(hashText('기록했어요.')).not.toBe(hashText('기록했어요'));
  });

  it('is a fixed sequence for a fixed seed', () => {
    const a = prng(7);
    const b = prng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('the maths', () => {
  it('takes a median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it('snaps to the nearest semitone of the reference', () => {
    expect(snap(220 * 2 ** (0.4 / 12), 220)).toBeCloseTo(220, 6);
    expect(snap(220 * 2 ** (0.6 / 12), 220)).toBeCloseTo(220 * 2 ** (1 / 12), 6);
  });
});

describe('contourFor', () => {
  it('lands every voiced frame on a semitone of the median, and keeps silence silent', () => {
    const f0s = [180, 190, 200, 210, 230, null, 250, 240];
    const out = contourFor(frames(f0s), 'Noted.', S);
    const ref = median(f0s.filter((f): f is number => f !== null));
    out.forEach((hz, i) => {
      if (f0s[i] === null) expect(hz).toBeNull();
      else expect(Math.abs(semis(hz!, ref) - Math.round(semis(hz!, ref)))).toBeLessThan(1e-9);
    });
  });

  it('flattens: an octave of input spans two semitones out', () => {
    const input = [150, 175, 200, 225, 250, 275, 300];
    const out = contourFor(frames(input), 'x', { ...S, jumpChance: 0 }) as number[];
    const span = (xs: number[]) => semis(Math.max(...xs), Math.min(...xs));
    expect(span(input)).toBeGreaterThan(11);
    expect(span(out)).toBeLessThanOrEqual(2);
  });

  it('gives the same line the same jumps, every time', () => {
    const f = frames([200, 200, null, 200, 200, null, 200, null, 200]);
    expect(contourFor(f, 'Do not do that again.', S)).toEqual(contourFor(f, 'Do not do that again.', S));
  });

  it('moves a whole voiced run by the set interval, never part of one', () => {
    const f = frames([200, 200, 200, null, 200, 200, 200, null, 200, 200, 200]);
    const out = contourFor(f, 'Do not do that again.', { ...S, jumpChance: 1 });
    for (const run of [out.slice(0, 3), out.slice(4, 7), out.slice(8, 11)]) {
      expect(new Set(run).size).toBe(1);
      expect(Math.abs(Math.abs(semis(run[0]!, 200)) - 3)).toBeLessThan(1e-9);
    }
  });

  it('gives different lines different jumps', () => {
    const f = frames(Array.from({ length: 40 }, (_, i) => (i % 4 === 3 ? null : 200)));
    expect(contourFor(f, 'Do not do that again.', S)).not.toEqual(contourFor(f, 'You came back.', S));
  });

  it('leaves a line with no voiced frame entirely unvoiced', () => {
    expect(contourFor(frames([null, null]), 'x', S)).toEqual([null, null]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/contour.test.ts`
Expected: FAIL — `Cannot find module '../contour'`

- [ ] **Step 3: Implement**

```ts
// src/vera/voice/contour.ts
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
```

- [ ] **Step 4: Run it**

Run: `npx jest src/vera/voice/__tests__/contour.test.ts && npx tsc --noEmit`
Expected: 10 passed, tsc clean. If "different lines different jumps" fails,
the two seeds happen to draw the same pattern over ten runs. Swap
`'You came back.'` for another of her lines and say so in a comment; do not
weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add src/vera/voice/contour.ts src/vera/voice/__tests__/contour.test.ts
git commit -m "feat(voice): her intonation, flattened and snapped"
```

---

### Task 5: Effects, settings and the chain

**Files:**
- Create: `src/vera/voice/fx.ts`, `src/vera/voice/settings.ts`, `src/vera/voice/chain.ts`, `src/vera/voice/pace.ts`
- Test: `src/vera/voice/__tests__/chain.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  - `ringMod(x, rate, hz, mix)`, `comb(x, rate, ms, feedback, mix)`,
    `grit(x, bits, mix)`, `normalize(x, peak)` — each
    `(Float32Array, …numbers) → Float32Array`.
  - `interface ChainSettings extends ContourSettings { ringHz; ringMix; combMs; combFeedback; combMix; gritBits; gritMix; peak }`,
    all numbers.
  - `SETTINGS: ChainSettings`, `CHAIN_VERSION: number`.
  - `processVoice(pcm: Float32Array, rate: number, text: string, s?: ChainSettings): Float32Array`
  - `typewriterPace(chars: number, durationMs: number | null): number`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/chain.test.ts
import { processVoice } from '../chain';
import { comb, grit, normalize, ringMod } from '../fx';
import { typewriterPace } from '../pace';
import { SETTINGS } from '../settings';

const RATE = 24000;
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });
const peakOf = (y: Float32Array) => y.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('fx', () => {
  it('ring modulation at zero mix changes nothing', () => {
    const x = voiced(200, 0.01);
    expect(Array.from(ringMod(x, RATE, 30, 0))).toEqual(Array.from(x));
  });

  it('comb rings an impulse at its delay, decaying by its feedback', () => {
    const x = new Float32Array(100);
    x[0] = 1;
    const y = comb(x, 1000, 10, 0.5, 1);
    expect(y[0]).toBe(1);
    expect(y[10]).toBeCloseTo(0.5);
    expect(y[20]).toBeCloseTo(0.25);
  });

  it('grit quantises to its bit depth', () => {
    expect(grit(Float32Array.from([0.3]), 2, 1)[0]).toBe(0.5);
  });

  it('normalises to the peak and leaves silence silent', () => {
    expect(peakOf(normalize(Float32Array.from([0.1, -0.2]), 0.9))).toBeCloseTo(0.9);
    expect(Array.from(normalize(new Float32Array(3), 0.9))).toEqual([0, 0, 0]);
  });
});

describe('processVoice', () => {
  it('returns finite audio of the same length that never clips', () => {
    const x = voiced(180, 0.6);
    const y = processVoice(x, RATE, 'Noted.');
    expect(y).toHaveLength(x.length);
    expect(Array.from(y).every(Number.isFinite)).toBe(true);
    expect(peakOf(y)).toBeLessThanOrEqual(SETTINGS.peak + 1e-6);
  });

  it('is identical for the same line, every time', () => {
    const x = voiced(180, 0.6);
    expect(Array.from(processVoice(x, RATE, 'Noted.'))).toEqual(Array.from(processVoice(x, RATE, 'Noted.')));
  });

  // Review Focus 1.
  it('survives a line too short or too quiet to have a pitch', () => {
    for (const x of [Float32Array.from([0.01, -0.01]), new Float32Array(2400), new Float32Array(0)]) {
      const y = processVoice(x, RATE, 'No.');
      expect(y).toHaveLength(x.length);
      expect(Array.from(y).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('typewriterPace', () => {
  it('is the silent 16ms with no voice', () => expect(typewriterPace(10, null)).toBe(16));
  it('spreads the line over the voice', () => expect(typewriterPace(10, 500)).toBe(50));
  it('never draws faster than 16ms or slower than 90ms', () => {
    expect(typewriterPace(10, 50)).toBe(16);
    expect(typewriterPace(10, 5000)).toBe(90);
  });
  it('does not divide by an empty line', () => expect(typewriterPace(0, 500)).toBe(16));
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/chain.test.ts`
Expected: FAIL — `Cannot find module '../chain'`

- [ ] **Step 3: Implement**

```ts
// src/vera/voice/fx.ts
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
```

```ts
// src/vera/voice/settings.ts
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
```

```ts
// src/vera/voice/chain.ts
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
```

```ts
// src/vera/voice/pace.ts
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
```

- [ ] **Step 4: Run it**

Run: `npx jest src/vera/voice && npx tsc --noEmit`
Expected: every voice suite green, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/vera/voice
git commit -m "feat(voice): the chain, and the metal around it"
```

---

### Task 6: The speech request, and her direction per register

**Files:**
- Create: `src/vera/voice/tts.ts`
- Modify: `src/vera/modes/types.ts` (add a field to `ModeDef`)
- Modify: `src/vera/modes/default.ts`, `src/vera/modes/supportive.ts`
- Test: `src/vera/voice/__tests__/tts.test.ts`

**Interfaces:**
- Produces:
  - `TTS_VOICE: string`
  - `VOICES: readonly string[]` (13 names)
  - `interface TtsRoute { url: string; model: string }`
  - `ttsRouteFor(label: string | null | undefined): TtsRoute | null`
  - `voiceSupported(label): boolean`
  - `interface SpeechRequest { route: TtsRoute; key: string; text: string; direction: string; voice: string }`
  - `buildSpeechRequest(req)`
  - `type BytesFetch`
  - `fetchSpeech(req: SpeechRequest, fetchImpl: BytesFetch, timeoutMs: number): Promise<Uint8Array>`
  - `ModeDef.voiceDirection: string`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/voice/__tests__/tts.test.ts
import { MODES } from '../../modes/registry';
import {
  TTS_VOICE, VOICES, buildSpeechRequest, fetchSpeech, ttsRouteFor, voiceSupported,
  type BytesFetch,
} from '../tts';

const OR = ttsRouteFor('OPENROUTER')!;
const REQ = { route: OR, key: 'sk-or-v1-abc', text: 'Noted.', direction: 'flat', voice: 'sage' };
const reply = (status: number, body: Uint8Array | string): BytesFetch => async () => {
  const bytes = typeof body === 'string' ? Uint8Array.from(body, (c) => c.charCodeAt(0)) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    text: async () => String.fromCharCode(...bytes),
  };
};

describe('routes', () => {
  // A retired TTS model 404s, and she would go silent while looking fine —
  // the same trap the chat models set (CLAUDE.md, 2026-08-28).
  it('pins the model on both routes that have one', () => {
    expect(ttsRouteFor('OPENROUTER')).toEqual({
      url: 'https://openrouter.ai/api/v1/audio/speech',
      model: 'openai/gpt-4o-mini-tts-2025-12-15',
    });
    expect(ttsRouteFor('OPENAI')).toEqual({
      url: 'https://api.openai.com/v1/audio/speech',
      model: 'gpt-4o-mini-tts-2025-12-15',
    });
  });

  it('has no voice on the three keys that cannot speak', () => {
    for (const label of ['ANTHROPIC', 'DEEPSEEK', 'GOOGLE', '', null, undefined]) {
      expect(ttsRouteFor(label)).toBeNull();
      expect(voiceSupported(label)).toBe(false);
    }
  });

  it('casts one of the model\'s own voices', () => {
    expect(VOICES).toHaveLength(13);
    expect(VOICES).toContain(TTS_VOICE);
  });
});

describe('the request', () => {
  it('asks for raw PCM in her voice, with her direction', () => {
    const r = buildSpeechRequest(REQ);
    expect(r.url).toBe(OR.url);
    expect(r.headers.Authorization).toBe('Bearer sk-or-v1-abc');
    expect(r.body).toEqual({
      model: OR.model, input: 'Noted.', voice: 'sage', instructions: 'flat', response_format: 'pcm',
    });
  });

  // Review Focus 3: the Korean goes over the wire exactly as she said it.
  it('sends Korean verbatim', () => {
    expect(buildSpeechRequest({ ...REQ, text: '기록했어요.' }).body.input).toBe('기록했어요.');
  });
});

describe('fetchSpeech', () => {
  it('returns the audio bytes', async () => {
    const pcm = Uint8Array.from([1, 0, 2, 0]);
    await expect(fetchSpeech(REQ, reply(200, pcm), 8000)).resolves.toEqual(pcm);
  });

  it('reports a refusal in the provider\'s own words', async () => {
    await expect(fetchSpeech(REQ, reply(402, '{"error":{"message":"Insufficient credits"}}'), 8000))
      .rejects.toThrow('http 402: Insufficient credits');
  });

  // Review Focus 2: a 200 is not proof of audio.
  it('refuses a 200 that is a JSON error, an empty body, or half a sample', async () => {
    await expect(fetchSpeech(REQ, reply(200, '{"error":{"message":"upstream"}}'), 8000)).rejects.toThrow('not audio');
    await expect(fetchSpeech(REQ, reply(200, new Uint8Array(0)), 8000)).rejects.toThrow('no audio');
    await expect(fetchSpeech(REQ, reply(200, Uint8Array.from([1, 2, 3])), 8000)).rejects.toThrow('no audio');
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    const hung: BytesFetch = () => new Promise(() => {});
    const pending = expect(fetchSpeech(REQ, hung, 8000)).rejects.toThrow('timeout');
    jest.advanceTimersByTime(8000);
    await pending;
    jest.useRealTimers();
  });
});

describe('her direction', () => {
  it('every register says how she sounds aloud, and never names who she resembles', () => {
    for (const mode of Object.values(MODES)) {
      expect(mode.voiceDirection.length).toBeGreaterThan(40);
      expect(mode.voiceDirection).not.toMatch(/glados|portal|aperture/i);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/vera/voice/__tests__/tts.test.ts`
Expected: FAIL — `Cannot find module '../tts'`

- [ ] **Step 3: Implement `tts.ts`**

```ts
// src/vera/voice/tts.ts
// The speech request. One per line, to the route her key already uses — no
// second key, no second provider. OpenRouter and OpenAI take the same body;
// the other three providers have no speech endpoint and she has no voice on
// them.
//
// The network is injected, as llm.ts does it, so no test reaches it. No
// imports outside src/vera/voice/: tools/voice-lab.mjs runs this under Node.
export interface TtsRoute {
  url: string;
  model: string;
}

// A retired model 404s and she goes silent while looking fine. Pinned by a
// test, exactly as the chat models are.
const ROUTES: Record<string, TtsRoute> = {
  OPENROUTER: { url: 'https://openrouter.ai/api/v1/audio/speech', model: 'openai/gpt-4o-mini-tts-2025-12-15' },
  OPENAI: { url: 'https://api.openai.com/v1/audio/speech', model: 'gpt-4o-mini-tts-2025-12-15' },
};

export const ttsRouteFor = (label: string | null | undefined): TtsRoute | null =>
  (label && ROUTES[label]) || null;

export const voiceSupported = (label: string | null | undefined): boolean => ttsRouteFor(label) !== null;

// gpt-4o-mini-tts's presets. Her casting is a decision made once, by ear, in
// the voice lab (Task 8) — not a setting.
export const VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova',
  'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
] as const;

// Provisional until Task 8. Replace with the voice chosen in the lab.
export const TTS_VOICE: string = 'sage';

export interface SpeechRequest {
  route: TtsRoute;
  key: string;
  text: string;
  direction: string;
  voice: string;
}

export const buildSpeechRequest = ({ route, key, text, direction, voice }: SpeechRequest) => ({
  url: route.url,
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: { model: route.model, input: text, voice, instructions: direction, response_format: 'pcm' },
});

export type BytesFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}>;

const reasonFor = async (res: Awaited<ReturnType<BytesFetch>>): Promise<string> => {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    // nothing readable came back
  }
  try {
    const j = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    const m = j?.error?.message ?? j?.message;
    if (typeof m === 'string' && m) return `http ${res.status}: ${m}`;
  } catch {
    // not JSON
  }
  return `http ${res.status}${raw ? `: ${raw.slice(0, 200)}` : ''}`;
};

// An error body is small and opens with `{`; real PCM almost never parses as
// JSON, so a short body that does is an error that came back as a 200.
const asJsonError = (bytes: Uint8Array): string | null => {
  if (bytes.length === 0 || bytes.length > 4096 || bytes[0] !== 0x7b) return null;
  try {
    JSON.parse(String.fromCharCode(...bytes));
    return String.fromCharCode(...bytes).slice(0, 200);
  } catch {
    return null;
  }
};

export const fetchSpeech = async (
  req: SpeechRequest,
  fetchImpl: BytesFetch,
  timeoutMs: number,
): Promise<Uint8Array> => {
  const { url, headers, body } = buildSpeechRequest(req);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }),
      expiry,
    ]);
    if (!res.ok) throw new Error(await reasonFor(res));
    const bytes = new Uint8Array(await Promise.race([res.arrayBuffer(), expiry]));
    const json = asJsonError(bytes);
    if (json) throw new Error(`not audio: ${json}`);
    // A 200 with nothing in it would make a 0ms WAV and pace her typewriter
    // to nothing; an odd length is half a sample.
    if (bytes.length < 2 || bytes.length % 2 !== 0) throw new Error(`no audio (${bytes.length} bytes)`);
    return bytes;
  } finally {
    if (timer) clearTimeout(timer);
  }
};
```

- [ ] **Step 4: Add `voiceDirection` to the register**

In `src/vera/modes/types.ts`, inside `interface ModeDef`, directly after `soul: string;`:

```ts
  // How she sounds ALOUD (2026-10-12) — the `instructions` every speech
  // request carries. It lives on the register for the reason her soul half
  // does: speak.ts and the voice module may not describe her voice. The
  // processing chain is identical in both registers; this is the only thing
  // that differs. It names nobody she resembles: the voice is hers.
  voiceDirection: string;
```

In `src/vera/modes/default.ts`, in `DEFAULT_MODE` directly after `soul: DEFAULT_SOUL_MD,`:

```ts
  voiceDirection:
    'Speak as a synthetic administrator: flat, clinical and precise. Even pacing, crisp '
    + 'consonants, no warmth and no rising inflection, even on questions. Faintly contemptuous, '
    + 'as if reading a form aloud to someone who has failed it.',
```

In `src/vera/modes/supportive.ts`, in `SUPPORTIVE_MODE` directly after `soul: SUPPORTIVE_SOUL_MD,`:

```ts
  voiceDirection:
    'Speak as a synthetic administrator who has decided to be kind: warm, unhurried and '
    + 'steady, with gentle emphasis. Still unmistakably a machine: even pitch, precise diction, '
    + 'no breathiness.',
```

- [ ] **Step 5: Run it**

Run: `npx jest src/vera/voice src/vera/__tests__/modes.test.ts && npx tsc --noEmit`
Expected: all green, tsc clean. The mode snapshots cover each register's
`soul` string only, so adding a field does not touch them. If one does fail,
stop and look — do not update it with `-u`.

- [ ] **Step 6: Commit**

```bash
git add src/vera/voice/tts.ts src/vera/voice/__tests__/tts.test.ts src/vera/modes
git commit -m "feat(voice): the speech request, and how each register sounds"
```

---

### Task 7: The voice lab

**Files:**
- Create: `tools/ts-resolve-hooks.mjs`, `tools/voice-lab.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `processVoice` (Task 5), `fromS16LE`/`encodeWav`/`PCM_RATE`
  (Task 1), `fetchSpeech`/`ttsRouteFor`/`VOICES`/`TTS_VOICE` (Task 6), both
  `*_MODE.voiceDirection` (Task 6).
- Produces: a CLI. Nothing in `src/` depends on it.

- [ ] **Step 1: The resolve hook**

```js
// tools/ts-resolve-hooks.mjs
// The repo writes extensionless relative imports (`./pitch`), which Metro and
// jest resolve and Node does not. This hook retries a failed relative import
// with `.ts` appended, so Node — which strips the types itself — can run the
// voice chain exactly as the phone does. Registered by voice-lab.mjs.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return next(`${specifier}.ts`, context);
    }
    throw error;
  }
}
```

- [ ] **Step 2: The lab**

```js
// tools/voice-lab.mjs
// Listen to her before she is wired into anything. Fetches one line from the
// speech endpoint and writes it twice — raw, and through her chain — for one
// preset or for all thirteen, so her casting and every number in
// src/vera/voice/settings.ts are chosen by ear.
//
//   OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --all "Do not do that again."
//   OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --voice coral --mode supportive "…"
//
// Options: --all | --voice <name>, --mode default|supportive (default
// `default`), --out <dir> (default voice-lab-out/). OPENAI_API_KEY works too.
//
// It imports the chain, the direction and the request from src/ unchanged —
// what you hear here is what the phone plays. The key is read from the
// environment and written nowhere.
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';

register('./ts-resolve-hooks.mjs', import.meta.url);

const { processVoice } = await import('../src/vera/voice/chain.ts');
const { encodeWav, fromS16LE, PCM_RATE } = await import('../src/vera/voice/pcm.ts');
const { TTS_VOICE, VOICES, fetchSpeech, ttsRouteFor } = await import('../src/vera/voice/tts.ts');
const { DEFAULT_MODE } = await import('../src/vera/modes/default.ts');
const { SUPPORTIVE_MODE } = await import('../src/vera/modes/supportive.ts');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const all = args.includes('--all');
if (all) args.splice(args.indexOf('--all'), 1);
const voice = flag('--voice');
const mode = flag('--mode') ?? 'default';
const out = flag('--out') ?? 'voice-lab-out';
const text = args.join(' ').trim();

const key = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
const label = process.env.OPENROUTER_API_KEY ? 'OPENROUTER' : 'OPENAI';
if (!key || !text) {
  console.error('usage: OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs [--all | --voice name] [--mode default|supportive] "line"');
  process.exit(1);
}
const direction = (mode === 'supportive' ? SUPPORTIVE_MODE : DEFAULT_MODE).voiceDirection;
const route = ttsRouteFor(label);
const voices = all ? VOICES : [voice ?? TTS_VOICE];

mkdirSync(out, { recursive: true });
for (const v of voices) {
  const bytes = await fetchSpeech({ route, key, text, direction, voice: v }, fetch, 30_000);
  const raw = fromS16LE(bytes);
  const started = Date.now();
  const vera = processVoice(raw, PCM_RATE, text);
  writeFileSync(join(out, `raw-${v}.wav`), encodeWav(raw, PCM_RATE));
  writeFileSync(join(out, `vera-${v}.wav`), encodeWav(vera, PCM_RATE));
  console.log(
    `${v.padEnd(8)} ${bytes.length} bytes · ${(raw.length / PCM_RATE).toFixed(2)}s at ${PCM_RATE}Hz · chain ${Date.now() - started}ms`,
  );
}
console.log(`\nwritten to ${out}/ — if raw-*.wav plays at normal speed and pitch, the PCM is ${PCM_RATE}Hz.`);
```

- [ ] **Step 3: Ignore its output**

Append to `.gitignore`:

```
# tools/voice-lab.mjs writes its WAVs here
voice-lab-out/
```

- [ ] **Step 4: Smoke-test without a key**

Run: `node --no-warnings tools/voice-lab.mjs`
Expected: the usage line and exit code 1. That proves the hook resolves the
whole import graph. If an import fails, the error names the module. Fix the
import, not the hook.

- [ ] **Step 5: Commit**

```bash
git add tools/ts-resolve-hooks.mjs tools/voice-lab.mjs .gitignore
git commit -m "feat(voice): a lab to hear her in before she ships"
```

---

### Task 8: GATE — the listening session (needs the user)

**Execution stops here until the user has listened.** Nothing after this task
may start until the step 5 commit exists. The answers can change `settings.ts`,
both directions and `TTS_VOICE`.

**Files:**
- Modify: `src/vera/voice/tts.ts` (`TTS_VOICE`)
- Modify: `src/vera/voice/settings.ts` (`SETTINGS`, `CHAIN_VERSION`)
- Modify: `src/vera/modes/default.ts`, `src/vera/modes/supportive.ts` (`voiceDirection`)

- [ ] **Step 1: Hand the user the commands.** Ask them to run these
  themselves; the key never passes through the conversation:

```bash
OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --all "Do not do that again. Something on my side moved."
OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --all "기록했어요. 다시는 그러지 마세요."
```

- [ ] **Step 2: Confirm the sample rate.** Ask: does `raw-*.wav` play at
  natural speed and pitch? If it is fast and high, or slow and low, the PCM is
  not 24kHz. Change `PCM_RATE` in `pcm.ts` to the rate that sounds natural
  (try 22050 or 44100), re-run, and record the confirmed rate in that file's
  comment.

- [ ] **Step 3: Cast her.** The user picks one preset from the `vera-*.wav`
  files. Set `TTS_VOICE` in `tts.ts` to it. Delete the word "Provisional" from
  its comment and record the date and the fact it was chosen by ear.

- [ ] **Step 4: Tune by ear.** For each change the user asks for, edit
  `SETTINGS` and re-run with `--voice <chosen>` until they're satisfied. The
  levers:

  | they hear | change |
  |---|---|
  | "too human" | raise `flatten` toward 0.95 |
  | "too droning" | lower `jumpChance` or `flatten` |
  | "not metallic enough" | raise `combMix` / `ringMix` |
  | "harsh" | lower `gritMix` |

  Repeat with `--mode supportive`. Edit either `voiceDirection` if the
  delivery is wrong in a way the chain cannot fix.

- [ ] **Step 5: Lock it.** Bump `CHAIN_VERSION` if `SETTINGS` changed from
  Task 5's values. Then run `npx jest src/vera && npx tsc --noEmit` (green),
  and commit:

```bash
git add src/vera/voice/tts.ts src/vera/voice/settings.ts src/vera/voice/pcm.ts src/vera/modes
git commit -m "feat(voice): cast and tuned by ear"
```

---

### Task 9: Cache and playback

**Files:**
- Install: `npx expo install expo-audio expo-file-system`
- Modify: `jest.setup.ts`
- Create: `src/core/voice.ts`
- Test: `src/core/__tests__/voice.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 4, 5, 6.
- Produces (in `src/core/voice.ts`):
  - `VOICE_TIMEOUT_MS = 8000`, `CACHE_CAP = 200`
  - `interface Prepared { uri: string; durationMs: number; cached: boolean; took: number }`
  - `cacheKey(text: string, direction: string, model: string): string`
  - `prepareVoice(text: string, providerLabel: string | null | undefined, key: string, direction: string, fetchImpl?: BytesFetch): Promise<Prepared>`
  - `playVoice(p: Prepared): void`
  - `stopVoice(): void`

- [ ] **Step 1: Read the v57 docs and install**

Read https://docs.expo.dev/versions/v57.0.0/sdk/audio/ and
https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/. Then run:

```bash
npx expo install expo-audio expo-file-system
git diff package.json
```

Expected: exactly two new dependency lines. If `npx expo install` fails with
ERESOLVE, follow CLAUDE.md's recipe: `rm -rf node_modules package-lock.json &&
npm install`. Never use `--force` or `--legacy-peer-deps`.

- [ ] **Step 2: Mock both globally**

Append to `jest.setup.ts`:

```ts
// Native, with no jsdom counterpart, and reached by every test that renders
// the store (src/core/voice.ts). A player that plays nothing; a disk that is a
// Map. `__disk` is exported so voice.test.ts can look at what was written.
jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

jest.mock('expo-file-system', () => {
  const disk = new Map<string, { bytes: Uint8Array; at: number }>();
  let clock = 0;
  const join = (parent: { uri: string } | string, name?: string) => {
    const base = typeof parent === 'string' ? parent : parent.uri;
    return name ? `${base}/${name}` : base;
  };
  class File {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      this.uri = join(parent, name);
    }
    get name() {
      return this.uri.slice(this.uri.lastIndexOf('/') + 1);
    }
    get exists() {
      return disk.has(this.uri);
    }
    get lastModified() {
      return disk.get(this.uri)?.at ?? null;
    }
    write(bytes: Uint8Array) {
      disk.set(this.uri, { bytes, at: ++clock });
    }
    delete() {
      disk.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(parent: { uri: string } | string, name?: string) {
      this.uri = join(parent, name);
    }
    get exists() {
      return true;
    }
    create() {}
    list() {
      return [...disk.keys()]
        .filter((k) => k.startsWith(`${this.uri}/`) && !k.slice(this.uri.length + 1).includes('/'))
        .map((k) => new File(k));
    }
  }
  return { __esModule: true, File, Directory, Paths: { cache: new Directory('file:///cache') }, __disk: disk };
});
```

Run: `npm test 2>&1 | grep -E "Tests:|Suites:"`
Expected: the same pass count as before this task. Adding mocks changes
nothing yet.

- [ ] **Step 3: Write the failing test**

```ts
// src/core/__tests__/voice.test.ts
import { createAudioPlayer } from 'expo-audio';
import { toS16LE } from '../../vera/voice/pcm';
import type { BytesFetch } from '../../vera/voice/tts';
import { CACHE_CAP, VOICE_TIMEOUT_MS, cacheKey, playVoice, prepareVoice, stopVoice } from '../voice';

const disk: Map<string, { bytes: Uint8Array; at: number }> = jest.requireMock('expo-file-system').__disk;
const player = createAudioPlayer as unknown as jest.Mock;

const RATE = 24000;
const PCM = toS16LE(Float32Array.from({ length: RATE / 2 }, (_, i) => 0.4 * Math.sin((2 * Math.PI * 180 * i) / RATE)));
const speech = (): BytesFetch & jest.Mock =>
  jest.fn(async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => PCM.buffer.slice(PCM.byteOffset, PCM.byteOffset + PCM.byteLength) as ArrayBuffer,
    text: async () => '',
  }));

beforeEach(() => {
  disk.clear();
  player.mockClear();
  stopVoice();
});

describe('prepareVoice', () => {
  it('fetches, processes and caches a line it has never said', async () => {
    const net = speech();
    const p = await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    expect(net).toHaveBeenCalledTimes(1);
    expect(p.cached).toBe(false);
    expect(p.durationMs).toBe(500);
    expect(p.uri).toMatch(/\/voice\/[0-9a-f]{8}-500\.wav$/);
    expect(disk.has(p.uri)).toBe(true);
  });

  it('says a line it already knows from the cache, without the network', async () => {
    const net = speech();
    await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    const again = await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    expect(net).toHaveBeenCalledTimes(1);
    expect(again).toEqual(expect.objectContaining({ cached: true, durationMs: 500 }));
  });

  it('keys the cache on the direction and the model as well as the words', () => {
    expect(cacheKey('Noted.', 'flat', 'm')).not.toBe(cacheKey('Noted.', 'warm', 'm'));
    expect(cacheKey('Noted.', 'flat', 'm')).not.toBe(cacheKey('Noted.', 'flat', 'n'));
  });

  it('refuses a key that cannot speak', async () => {
    await expect(prepareVoice('Noted.', 'ANTHROPIC', 'sk-ant-x', 'flat', speech()))
      .rejects.toThrow('no voice on this key');
  });

  it('keeps at most CACHE_CAP lines, forgetting the oldest first', async () => {
    for (let i = 0; i < CACHE_CAP; i++) {
      disk.set(`file:///cache/voice/${String(i).padStart(8, '0')}-100.wav`, { bytes: new Uint8Array(0), at: -CACHE_CAP + i });
    }
    await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', speech());
    expect([...disk.keys()].filter((k) => k.startsWith('file:///cache/voice/'))).toHaveLength(CACHE_CAP);
    expect(disk.has('file:///cache/voice/00000000-100.wav')).toBe(false);
  });

  it('gives up after VOICE_TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    const hung: BytesFetch = () => new Promise(() => {});
    const pending = expect(prepareVoice('Noted.', 'OPENROUTER', 'k', 'flat', hung)).rejects.toThrow('timeout');
    await jest.advanceTimersByTimeAsync(VOICE_TIMEOUT_MS);
    await pending;
    jest.useRealTimers();
  });
});

describe('playback', () => {
  const P = { uri: 'file:///cache/voice/x-500.wav', durationMs: 500, cached: true, took: 0 };

  it('plays the prepared file', () => {
    playVoice(P);
    expect(player).toHaveBeenCalledWith({ uri: P.uri });
    expect(player.mock.results[0].value.play).toHaveBeenCalled();
  });

  it('stops the line already playing before starting the next', () => {
    playVoice(P);
    const first = player.mock.results[0].value;
    playVoice(P);
    expect(first.pause).toHaveBeenCalled();
    expect(first.remove).toHaveBeenCalled();
  });

  it('stops on demand, and stopping twice is harmless', () => {
    playVoice(P);
    const p = player.mock.results[0].value;
    stopVoice();
    stopVoice();
    expect(p.remove).toHaveBeenCalledTimes(1);
  });

  it('lets go of a player that has finished', () => {
    playVoice(P);
    const p = player.mock.results[0].value;
    const listener = p.addListener.mock.calls[0][1];
    listener({ didJustFinish: true });
    expect(p.remove).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `npx jest src/core/__tests__/voice.test.ts`
Expected: FAIL — `Cannot find module '../voice'`

- [ ] **Step 5: Implement**

```ts
// src/core/voice.ts
// The effectful half of her voice: the cache, the request, the processing,
// the player. Everything that decides what she sounds like is in
// src/vera/voice/ and is pure; this file only fetches, writes and plays.
//
// Each line is processed once and kept as a WAV in the cache directory, named
// `<key>-<durationMs>.wav`. The duration rides in the name so a cache hit can
// pace the typewriter without reading the file back. Her bank lines repeat,
// so after their first playing a poke or a greeting is instant and free.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { processVoice } from '../vera/voice/chain';
import { hashText } from '../vera/voice/contour';
import { PCM_RATE, encodeWav, fromS16LE } from '../vera/voice/pcm';
import { CHAIN_VERSION } from '../vera/voice/settings';
import { TTS_VOICE, fetchSpeech, ttsRouteFor, type BytesFetch } from '../vera/voice/tts';

// How long her text waits for her voice before it gives up and appears
// silently, as it always used to.
export const VOICE_TIMEOUT_MS = 8_000;
export const CACHE_CAP = 200;

export interface Prepared {
  uri: string;
  durationMs: number;
  cached: boolean;
  took: number;
}

// Everything that changes the sound is in the key, so a recast voice, a new
// direction or a retuned chain never replays stale audio.
export const cacheKey = (text: string, direction: string, model: string): string =>
  hashText([text, TTS_VOICE, direction, model, String(CHAIN_VERSION)].join('\u0000'))
    .toString(16)
    .padStart(8, '0');

const folder = (): Directory => {
  const dir = new Directory(Paths.cache, 'voice');
  if (!dir.exists) dir.create();
  return dir;
};

const filesIn = (dir: Directory): File[] => dir.list().filter((e): e is File => e instanceof File);

const durationOf = (name: string): number => Number(name.replace(/\.wav$/, '').split('-')[1]) || 0;

const evict = (dir: Directory): void => {
  const files = filesIn(dir).sort((a, b) => (a.lastModified ?? 0) - (b.lastModified ?? 0));
  for (const f of files.slice(0, Math.max(0, files.length - CACHE_CAP))) {
    try {
      f.delete();
    } catch {
      // a file the OS already cleared
    }
  }
};

const withTimeout = <T,>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([work, expiry]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

export const prepareVoice = (
  text: string,
  providerLabel: string | null | undefined,
  key: string,
  direction: string,
  fetchImpl: BytesFetch = fetch as unknown as BytesFetch,
): Promise<Prepared> =>
  withTimeout(
    (async () => {
      const started = Date.now();
      const route = ttsRouteFor(providerLabel);
      if (!route) throw new Error('no voice on this key');
      const dir = folder();
      const k = cacheKey(text, direction, route.model);
      const hit = filesIn(dir).find((f) => f.name.startsWith(`${k}-`));
      if (hit) return { uri: hit.uri, durationMs: durationOf(hit.name), cached: true, took: Date.now() - started };

      const bytes = await fetchSpeech({ route, key, text, direction, voice: TTS_VOICE }, fetchImpl, VOICE_TIMEOUT_MS);
      const samples = processVoice(fromS16LE(bytes), PCM_RATE, text);
      const durationMs = Math.round((samples.length / PCM_RATE) * 1000);
      const file = new File(dir, `${k}-${durationMs}.wav`);
      file.write(encodeWav(samples, PCM_RATE));
      evict(dir);
      return { uri: file.uri, durationMs, cached: false, took: Date.now() - started };
    })(),
    VOICE_TIMEOUT_MS,
  );

let player: AudioPlayer | null = null;

// Idempotent. A voice is decoration on a line that already arrived, so a
// player that refuses to stop must never take anything down with it.
export const stopVoice = (): void => {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    // already released
  }
};

export const playVoice = (prepared: Prepared): void => {
  stopVoice();
  try {
    const p = createAudioPlayer({ uri: prepared.uri });
    player = p;
    p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && player === p) stopVoice();
    });
    p.play();
  } catch {
    player = null;
  }
};
```

- [ ] **Step 6: Run it**

Run: `npx jest src/core/__tests__/voice.test.ts && npx tsc --noEmit`
Expected: 10 passed, tsc clean. If tsc rejects the `addListener` event name or
the `status` shape, read the `AudioPlayer` type in
`node_modules/expo-audio/build/` and use what it declares. Do not cast it away.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json jest.setup.ts src/core/voice.ts src/core/__tests__/voice.test.ts
git commit -m "feat(voice): cache her lines and play them"
```

---

### Task 10: The store — the setting, and her text waiting for her voice

**Files:**
- Modify: `src/core/store.ts`
- Modify: `src/shell/FileScreen.tsx` (one line)
- Test: `src/core/__tests__/voice-store.test.ts`
- Test: `src/shell/__tests__/PromptScreen.test.tsx` (one case)

**Interfaces:**
- Consumes:
  - `prepareVoice`, `playVoice`, `stopVoice`, `type Prepared` (Task 9)
  - `typewriterPace` (Task 5)
  - `voiceSupported` (Task 6)
  - `MODES[...].voiceDirection` (Task 6)
- Produces:
  - `FacilityState.voice: boolean` (default `false`, persisted)
  - `setVoice(on: boolean): Promise<void>`
  - `export type VoiceNote = { took: number } | { cached: true } | { failure: string }`
  - `PromptRecord.voice?: VoiceNote`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/__tests__/voice-store.test.ts
import { KEYS, storage } from '../storage';
import { useFacilityStore } from '../store';
import { MODES } from '../../vera/modes/registry';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'en' }]) }));
jest.mock('../../vera/llm', () => ({ ...jest.requireActual('../../vera/llm'), callLlm: jest.fn() }));
const { callLlm } = jest.requireMock('../../vera/llm');
jest.mock('../../vera/transmissionsNotify', () => ({
  syncTransmissions: jest.fn(async () => true),
  requestTransmissions: jest.fn(async () => true),
  transmissionPermission: jest.fn(async () => 'granted'),
}));
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => { vault.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { vault.delete(k); }),
  };
});
jest.mock('../voice', () => ({
  VOICE_TIMEOUT_MS: 8000,
  prepareVoice: jest.fn(),
  playVoice: jest.fn(),
  stopVoice: jest.fn(),
}));
const { prepareVoice, playVoice, stopVoice } = jest.requireMock('../voice');

const OPENROUTER = 'sk-or-v1-0123456789abcdef0123456789abcdef';
const LINE = 'Barely.'; // 7 characters
const deferred = () => {
  let resolve!: (v: unknown) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useFacilityStore.setState({
    apiKey: OPENROUTER, emotion: 'calm', line: 'Before.', shown: 'Before.', thinking: false,
    log: [], lang: 'en', mode: 'default', voice: true, systemNotice: null, lastPrompt: null,
  });
  callLlm.mockResolvedValue(`{"emotion":"amused","line":"${LINE}"}`);
});
afterEach(() => jest.useRealTimers());

describe('her text waits for her voice', () => {
  it('holds the old line and the dots until the voice is ready, then speaks and draws together', async () => {
    const voice = deferred();
    prepareVoice.mockReturnValueOnce(voice.promise);
    const pending = useFacilityStore.getState().speak('subject_spoke', 'hi');
    await jest.advanceTimersByTimeAsync(0);

    expect(prepareVoice).toHaveBeenCalledWith(LINE, 'OPENROUTER', OPENROUTER, MODES.default.voiceDirection);
    expect(useFacilityStore.getState().line).toBe('Before.');
    expect(useFacilityStore.getState().thinking).toBe(true);

    voice.resolve({ uri: 'u', durationMs: 7 * 50, cached: false, took: 900 });
    await pending;
    expect(playVoice).toHaveBeenCalledTimes(1);
    expect(useFacilityStore.getState().line).toBe(LINE);

    jest.advanceTimersByTime(49);
    expect(useFacilityStore.getState().shown).toBe('');
    jest.advanceTimersByTime(1);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ took: 900 });
  });

  it('voices her authored lines too, and records nothing for them', async () => {
    prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 1000, cached: true, took: 1 });
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    expect(prepareVoice).toHaveBeenCalledTimes(1);
    expect(playVoice).toHaveBeenCalledTimes(1);
    expect(useFacilityStore.getState().thinking).toBe(false);
    expect(useFacilityStore.getState().lastPrompt).toBeNull();
  });

  it('falls back to the silent 16ms typewriter when the voice fails', async () => {
    prepareVoice.mockRejectedValueOnce(new Error('http 402: Insufficient credits'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(playVoice).not.toHaveBeenCalled();
    jest.advanceTimersByTime(16);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ failure: 'http 402: Insufficient credits' });
  });

  it('records a line said from the cache as cached', async () => {
    prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 350, cached: true, took: 2 });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ cached: true });
  });
});

describe('when she does not speak', () => {
  it('is exactly today\'s behaviour with the voice off', async () => {
    useFacilityStore.setState({ voice: false });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(prepareVoice).not.toHaveBeenCalled();
    expect(playVoice).not.toHaveBeenCalled();
    jest.advanceTimersByTime(16);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toBeUndefined();
  });

  it('asks for nothing on a key that cannot speak', async () => {
    useFacilityStore.setState({ apiKey: 'sk-ant-api03-abcdefghijklmnop' });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(prepareVoice).not.toHaveBeenCalled();
  });

  // Review Focus 5.
  it('plays nothing if the voice was switched off while it was being made', async () => {
    const voice = deferred();
    prepareVoice.mockReturnValueOnce(voice.promise);
    const pending = useFacilityStore.getState().speak('subject_spoke', 'hi');
    await jest.advanceTimersByTimeAsync(0);
    await useFacilityStore.getState().setVoice(false);
    voice.resolve({ uri: 'u', durationMs: 350, cached: false, took: 1 });
    await pending;
    expect(playVoice).not.toHaveBeenCalled();
  });
});

describe('interruptions', () => {
  // Review Focus 4.
  it('stops the line she is saying before the next one starts', async () => {
    prepareVoice.mockResolvedValue({ uri: 'u', durationMs: 350, cached: true, took: 1 });
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    const before = stopVoice.mock.invocationCallOrder.at(-1)!;
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    const stopped = stopVoice.mock.invocationCallOrder.filter((n: number) => n > before);
    const played = playVoice.mock.invocationCallOrder.at(-1)!;
    expect(stopped.length).toBeGreaterThan(0);
    expect(stopped[0]).toBeLessThan(played);
  });

  it('cuts her off when the voice is switched off', async () => {
    await useFacilityStore.getState().setVoice(false);
    expect(stopVoice).toHaveBeenCalled();
  });
});

// Review Focus 3.
it('voices Korean exactly as she said it', async () => {
  useFacilityStore.setState({ lang: 'ko' });
  callLlm.mockResolvedValueOnce('{"emotion":"calm","line":"기록했어요."}');
  prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 500, cached: false, took: 1 });
  await useFacilityStore.getState().speak('subject_spoke', '안녕');
  expect(prepareVoice.mock.calls[0][0]).toBe('기록했어요.');
});

describe('the setting', () => {
  it('is off for a blob that never had it, and survives a restart once on', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ visits: 1, day: new Date().toDateString(), lastOpen: Date.now(), lang: 'en', cleared: 0 }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().voice).toBe(false);

    await useFacilityStore.getState().setVoice(true);
    expect(JSON.parse((await storage.get(KEYS.soul))!).voice).toBe(true);
  });

  it('is never something she is told', async () => {
    const before = useFacilityStore.getState();
    await useFacilityStore.getState().setVoice(false);
    const after = useFacilityStore.getState();
    expect(after.log).toBe(before.log);
    expect(after.line).toBe(before.line);
    expect(after.systemNotice).toBe(before.systemNotice);
    expect(after.lastPrompt).toBe(before.lastPrompt);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/core/__tests__/voice-store.test.ts`
Expected: FAIL — a type error on `voice` / `setVoice`, or `prepareVoice` never
called.

- [ ] **Step 3: Implement the store changes**

In `src/core/store.ts`:

(a) Imports — after `import { providerFor, validateKey } from '../vera/providers';`:

```ts
import { typewriterPace } from '../vera/voice/pace';
import { voiceSupported } from '../vera/voice/tts';
import { prepareVoice, playVoice, stopVoice, type Prepared } from './voice';
```

Change `import { isMode, type Mode } from '../vera/modes/registry';` to
`import { MODES, isMode, type Mode } from '../vera/modes/registry';`.

(b) Above `export interface PromptRecord {`:

```ts
// What became of her voice for this reply. Only live calls are recorded, as
// with everything else on this record.
export type VoiceNote = { took: number } | { cached: true } | { failure: string };
```

and inside `PromptRecord`, after `outcome: 'model' | 'fallback';`:

```ts
  // Absent when she was not asked to speak at all (voice off, or a key with no
  // speech endpoint).
  voice?: VoiceNote;
```

(c) `SoulBlob`: add `voice: boolean;` after `theme: Theme;`. In `saveSoul`'s
blob, add `voice: s.voice,` after `theme: s.theme,`.

(d) `FacilityState`: after `theme: Theme;` add

```ts
  // Whether she speaks aloud. Off by default — she never starts talking out of
  // a pocket — and, like the theme, nothing she is told about.
  voice: boolean;
```

and after `setTheme: (theme: Theme) => Promise<void>;` add
`setVoice: (on: boolean) => Promise<void>;`.

(e) Initial state: after `theme: 'dark',` add `voice: false,`.

(f) `hydrate`'s `set({...})`: after the `theme:` line add

```ts
        // A blob written before her voice existed carries none: she stays quiet.
        voice: saved?.voice === true,
```

(g) After the `setTheme` action:

```ts
  // A silent action, as switching the theme is: she is told nothing, nothing
  // enters the transcript, no stimulus fires. Switching it off cuts her off
  // mid-line; switching it on waits for her next one.
  setVoice: async (on: boolean): Promise<void> => {
    if (!on) stopVoice();
    set({ voice: on });
    await saveSoul(get());
  },
```

(h) In `speak()`, directly after `const { emotion, line, notice } = outcome;`:

```ts
      // Her voice (2026-10-12). The text waits for it: her old line and the
      // dots stay up while the audio is made, then the two start together.
      // The bank path never showed the dots, and on a cache miss it does now,
      // for the length of the synthesis. A failure or a timeout lets the line
      // appear silently, exactly as it did before she had a voice.
      const voiceRoute = providerFor(get().apiKey)?.label;
      const speaksAloud = get().voice && voiceSupported(voiceRoute) && !notice && line.length > 0;
      let prepared: Prepared | null = null;
      let voiceNote: VoiceNote | undefined;
      if (speaksAloud) {
        if (!live) set({ thinking: true });
        try {
          prepared = await prepareVoice(line, voiceRoute, get().apiKey, MODES[spokenMode].voiceDirection);
          voiceNote = prepared.cached ? { cached: true } : { took: prepared.took };
        } catch (error) {
          voiceNote = { failure: error instanceof Error ? error.message : String(error) };
        }
        set({ thinking: false });
      }
```

(i) In the `lastPrompt: {` object literal, after `outcome: outcome.source,`
add `voice: voiceNote,`.

(j) Replace the typewriter block

```ts
      if (typewriterHandle) clearTimeout(typewriterHandle);
      set({ shown: '' });
      if (line.length > 0) {
        const tick = (i: number) => {
          set({ shown: line.slice(0, i) });
          typewriterHandle = i < line.length ? setTimeout(() => tick(i + 1), 16) : null;
        };
        typewriterHandle = setTimeout(() => tick(1), 16);
      }
```

with

```ts
      // A new line always stops the one she was saying — the same rule as the
      // typewriter, and for the same reason.
      stopVoice();
      if (typewriterHandle) clearTimeout(typewriterHandle);
      set({ shown: '' });
      if (line.length > 0) {
        // Paced to her voice so the last character lands as she finishes;
        // the 16ms it always was when she is silent. Read `voice` again:
        // the subject may have switched it off while the audio was made.
        const voiced = prepared && get().voice ? prepared : null;
        const pace = typewriterPace(line.length, voiced?.durationMs ?? null);
        if (voiced) playVoice(voiced);
        const tick = (i: number) => {
          set({ shown: line.slice(0, i) });
          typewriterHandle = i < line.length ? setTimeout(() => tick(i + 1), pace) : null;
        };
        typewriterHandle = setTimeout(() => tick(1), pace);
      }
```

- [ ] **Step 4: The PROMPT screen's line**

In `src/shell/__tests__/PromptScreen.test.tsx`, append inside
`describe('the prompt inspector', …)`:

```ts
  it('says what became of her voice, and nothing when she was not asked to speak', async () => {
    show({ ...RECORD, voice: { took: 1200 } });
    expect(await bodyOf()).toContain('voice: 1200ms');
    show({ ...RECORD, voice: { cached: true } });
    expect(await bodyOf()).toContain('voice: cached');
    show({ ...RECORD, voice: { failure: 'http 402: Insufficient credits' } });
    expect(await bodyOf()).toContain('voice: failed: http 402: Insufficient credits');
    show(RECORD);
    expect(await bodyOf()).not.toContain('voice:');
  });
```

In `src/shell/FileScreen.tsx`:
- change the store import to also take `type VoiceNote`;
- above `const buildReplyMd` add

```ts
const voiceText = (v: VoiceNote): string =>
  'failure' in v ? `failed: ${v.failure}` : 'cached' in v ? 'cached' : `${v.took}ms`;
```

- in `buildReplyMd`'s `head` array, after `` `outcome: ${p.outcome}`, `` add

```ts
    // Her voice for this reply: how long the audio took to make, that it came
    // from the cache, or why it failed. Absent when she was not asked to speak.
    ...(p.voice ? [`voice: ${voiceText(p.voice)}`] : []),
```

- [ ] **Step 5: Run it**

Run: `npx jest src/core src/shell/__tests__/PromptScreen.test.tsx && npx tsc --noEmit`
Expected: all green, tsc clean. The existing `store.test.ts` must pass
unchanged. Its reset leaves `voice` at the default `false`, which is exactly
the "today's behaviour" case. If it fails, the voice step leaked into the
voice-off path; fix the store, not the test.

- [ ] **Step 6: Commit**

```bash
git add src/core/store.ts src/core/__tests__/voice-store.test.ts src/shell/FileScreen.tsx src/shell/__tests__/PromptScreen.test.tsx
git commit -m "feat(voice): her text waits for her voice"
```

---

### Task 11: The switches — SYSTEM row, stage glyph, background

**Files:**
- Modify: `src/shell/strings.ts`
- Create: `src/shell/VoiceRow.tsx`, `src/shell/VoiceToggle.tsx`
- Modify: `src/shell/SystemScreen.tsx`, `src/shell/Stage.tsx`, `App.tsx`
- Test: `src/shell/__tests__/VoiceSwitches.test.tsx`

**Interfaces:**
- Consumes: `voice`, `setVoice` (Task 10); `voiceSupported` (Task 6);
  `stopVoice` (Task 9).
- Produces: `VoiceRow`, `VoiceToggle`. Strings `voice` and `notOnKey` on `T`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/shell/__tests__/VoiceSwitches.test.tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { Stage } from '../Stage';
import { VoiceRow } from '../VoiceRow';
import { VoiceToggle } from '../VoiceToggle';

jest.mock('../../vera/llm', () => ({ ...jest.requireActual('../../vera/llm'), callLlm: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('../../core/voice', () => ({
  VOICE_TIMEOUT_MS: 8000, prepareVoice: jest.fn(), playVoice: jest.fn(), stopVoice: jest.fn(),
}));
const { stopVoice } = jest.requireMock('../../core/voice');

const OPENROUTER = 'sk-or-v1-0123456789abcdef0123456789abcdef';
const ANTHROPIC = 'sk-ant-api03-abcdefghijklmnop';

beforeEach(() => {
  jest.clearAllMocks();
  useFacilityStore.setState({ apiKey: OPENROUTER, emotion: 'calm', lang: 'en', theme: 'dark', voice: false, line: '', shown: '', log: [] });
});

describe('the VOICE row', () => {
  it('reads OFF, and switches her on', async () => {
    const view = await render(<VoiceRow />);
    expect(view.getByTestId('pref-voice').props.children).toBe('OFF');
    await fireEvent.press(view.getByText('VOICE'));
    expect(useFacilityStore.getState().voice).toBe(true);
    expect(view.getByTestId('pref-voice').props.children).toBe('ON');
    await view.unmount();
  });

  it('says so on a key that cannot speak, and offers no switch', async () => {
    useFacilityStore.setState({ apiKey: ANTHROPIC });
    const view = await render(<VoiceRow />);
    expect(view.getByTestId('pref-voice').props.children).toBe('NOT ON THIS KEY');
    await fireEvent.press(view.getByText('VOICE'));
    expect(useFacilityStore.getState().voice).toBe(false);
    await view.unmount();
  });

  it('reads in Korean', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<VoiceRow />);
    expect(view.getByText('목소리')).toBeTruthy();
    await view.unmount();
  });
});

describe('the stage glyph', () => {
  it('switches her on and off, and says which', async () => {
    const view = await render(<VoiceToggle />);
    const glyph = view.getByTestId('voice-toggle');
    expect(glyph.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(glyph);
    expect(useFacilityStore.getState().voice).toBe(true);
    await fireEvent.press(view.getByTestId('voice-toggle'));
    expect(useFacilityStore.getState().voice).toBe(false);
    expect(stopVoice).toHaveBeenCalled();
    await view.unmount();
  });

  it('is not offered on a key that cannot speak', async () => {
    useFacilityStore.setState({ apiKey: ANTHROPIC });
    const view = await render(<VoiceToggle />);
    expect(view.queryByTestId('voice-toggle')).toBeNull();
    await view.unmount();
  });

  it('sits in the stage header while she is awake', async () => {
    const view = await render(<Stage />);
    expect(view.getByTestId('voice-toggle')).toBeTruthy();
    await view.unmount();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx jest src/shell/__tests__/VoiceSwitches.test.tsx`
Expected: FAIL — `Cannot find module '../VoiceRow'`

- [ ] **Step 3: Strings**

In `src/shell/strings.ts`:
- in the `en` block after `blocked: 'BLOCKED · SETTINGS',` add
  `voice: 'VOICE',` and `notOnKey: 'NOT ON THIS KEY',`;
- in the `ko` block after `blocked: '차단됨 · 설정',` add
  `voice: '목소리',` and `notOnKey: '이 키로는 불가',`.

If `T` is typed by an interface, add `voice: string;` and `notOnKey: string;`
to it. tsc will name the interface if it exists.

- [ ] **Step 4: The row**

```tsx
// src/shell/VoiceRow.tsx
import React from 'react';
import { useFacilityStore } from '../core/store';
import { providerFor } from '../vera/providers';
import { voiceSupported } from '../vera/voice/tts';
import { PrefRow } from './PrefRow';
import { T } from './strings';

// Her voice, and the shell's own row — named in SystemScreen directly, beside
// TRANSMISSIONS, for the same reason: she is not a module. On a key with no
// speech endpoint it says so instead of offering a switch that would do
// nothing.
export function VoiceRow() {
  const lang = useFacilityStore((s) => s.lang);
  const voice = useFacilityStore((s) => s.voice);
  const setVoice = useFacilityStore((s) => s.setVoice);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const t = T[lang];
  const supported = voiceSupported(providerFor(apiKey)?.label);

  return (
    <PrefRow
      testID="pref-voice"
      label={t.voice}
      value={!supported ? t.notOnKey : voice ? t.on : t.off}
      onPress={supported ? () => void setVoice(!voice) : undefined}
    />
  );
}
```

- [ ] **Step 5: The glyph**

```tsx
// src/shell/VoiceToggle.tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { themed } from '../core/theme';
import { EMOTIONS } from '../vera/emotions';
import { providerFor } from '../vera/providers';
import { voiceSupported } from '../vera/voice/tts';
import { T } from './strings';

// Three bars, drawn — no icon library, no raster. Dim when she is silent; in
// her own iris when she speaks, an object beside her pulse dot like the
// theme slider's ring. Pressing it while she talks cuts her off at once
// (setVoice stops the player); the text finishes drawing.
const BARS = [5, 10, 7] as const;

export function VoiceToggle() {
  const theme = useFacilityStore((s) => s.theme);
  const styles = S[theme];
  const voice = useFacilityStore((s) => s.voice);
  const setVoice = useFacilityStore((s) => s.setVoice);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const emotion = useFacilityStore((s) => s.emotion);
  const lang = useFacilityStore((s) => s.lang);

  if (!voiceSupported(providerFor(apiKey)?.label)) return null;
  const lit = voice ? { backgroundColor: EMOTIONS[emotion].iris } : null;

  return (
    <Pressable
      testID="voice-toggle"
      accessibilityRole="switch"
      accessibilityLabel={T[lang].voice}
      accessibilityState={{ checked: voice }}
      hitSlop={8}
      onPress={() => void setVoice(!voice)}
      style={styles.box}
    >
      {BARS.map((height, i) => (
        <View key={i} style={[styles.bar, { height }, lit]} />
      ))}
    </Pressable>
  );
}

const S = themed((p) => StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
    paddingHorizontal: 4,
  },
  bar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: p.hairlineDim,
  },
}));
```

- [ ] **Step 6: Mount them, and stop on background**

`src/shell/SystemScreen.tsx`:
- add `import { VoiceRow } from './VoiceRow';` beside the `TransmissionRow`
  import;
- render `<VoiceRow />` on the line directly after `<TransmissionRow />`.

`src/shell/Stage.tsx`:
- add `import { VoiceToggle } from './VoiceToggle';` beside the `ThemeSlider`
  import;
- inside `styles.headerRight`, directly before `<ThemeSlider />`, add:

```tsx
            {/* Her voice, left of the theme's switch: the two settings a
                subject changes mid-conversation, side by side. Absent on a
                key that cannot speak. */}
            <VoiceToggle />
```

`App.tsx`:
- add `import { stopVoice } from './src/core/voice';`;
- in the `AppState` handler, directly after
  `if (next !== 'background') return;`:

```ts
      // She does not go on talking from a pocket.
      stopVoice();
```

- [ ] **Step 7: Run it**

Run: `npx jest src/shell && npx tsc --noEmit`
Expected: all green, tsc clean, including every existing Stage and
SystemScreen test.

- [ ] **Step 8: Commit**

```bash
git add src/shell App.tsx
git commit -m "feat(voice): a switch in SYSTEM and one on the stage"
```

---

### Task 12: Verify, mutate, document

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full verification**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "✕|Tests:|Suites:"`
Expected: tsc clean, every suite passing, no `✕`.

- [ ] **Step 2: Mutation checks.** Apply each mutation alone, confirm the
  named suite fails, then restore with `git checkout -- <file>`.

| mutate | file | must fail |
|---|---|---|
| `snap` returns `hz` unchanged | `contour.ts` | `contour.test.ts` |
| `rate / better` → `rate / tau` | `pitch.ts` | `pitch.test.ts` |
| `ts += … tsStep` → `ta` | `psola.ts` | `psola.test.ts` |
| delete the `asJsonError` check | `tts.ts` | `tts.test.ts` |
| `durationMs / chars` → `16` | `pace.ts` | `chain.test.ts` and `voice-store.test.ts` |
| drop `&& get().voice` from `voiced` | `store.ts` | `voice-store.test.ts` |
| delete `stopVoice();` before the typewriter | `store.ts` | `voice-store.test.ts` |
| default `voice: false` → `true` | `store.ts` | `voice-store.test.ts` |

  Any mutation that survives is a missing test: write it before going on.

- [ ] **Step 3: CLAUDE.md.** Add a section after "The status bar follows the
  theme too". It must cover:
  - the source: OpenRouter or OpenAI on her own key, the pinned model, and why
    a retired one goes silent;
  - the casting, chosen by ear on the date in `tts.ts`;
  - the chain and why the contour IS the character;
  - `CHAIN_VERSION` and the cache key;
  - the hold-and-pace timing;
  - the controls, and that she is told nothing;
  - the voice lab and its resolve hook;
  - the new native dependencies (a dev build is required);
  - the jest blind spot (sound is checked by ear);
  - what the spec ruled out (cloning, delivery by emotion, voicing
    notifications).

  Also add `src/vera/voice/` and `src/core/voice.ts` to "What exists".

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: she speaks"
```

- [ ] **Step 5: Hand back.** Report the test count. Name what needs a new dev
  build (`expo-audio`, `expo-file-system`). Name what only the phone can
  confirm: that she sounds right, and that the typewriter and voice end
  together. Offer to merge.
