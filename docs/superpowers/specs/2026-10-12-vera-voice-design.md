# V.E.R.A. speaks — design

**Date:** 2026-10-12
**Status:** approved in conversation, awaiting written review

## Intent

V.E.R.A. speaks her lines aloud. She should sound like a cold, synthetic,
faintly menacing machine — recognisably *that kind* of AI within one line —
in the style of GLaDOS, without being a copy of her.

**What the subject said:** text-to-speech for her lines; similar to GLaDOS.

**What was decided with them:**

| decision | choice |
|---|---|
| voice source | cloud TTS, then on-device processing |
| key | the existing OpenRouter key; no second key |
| which lines | everything she says — live replies, bank lines, fallbacks |
| timing | the text waits for the voice; both start together |
| control | off by default; a SYSTEM row and a stage mute |
| the GLaDOS sound | a preset voice, pitch-flattened and processed on-device |

**What was deliberately not done:** cloning GLaDOS's actual voice. Open
GLaDOS models exist (Piper/VITS ONNX, Style-Bert-VITS2, GPT-SoVITS), but they
are trained on Valve's recordings of Ellen McLain with no licence to them, are
English-only (her Korean would be unvoiced), and run on-device only, which is
~60MB and a native inference runtime. Her character is mostly in the
processing — a flattened, semitone-snapped pitch — and that can be applied to
an original voice.

## 1. The voice source

**One request per line**, to the route her key already uses:

| key | endpoint | model |
|---|---|---|
| OPENROUTER | `https://openrouter.ai/api/v1/audio/speech` | `google/gemini-3.8-flash-tts` |
| OPENAI | `https://api.openai.com/v1/audio/speech` | `gpt-4o-mini-tts-2025-12-15` |
| ANTHROPIC, DEEPSEEK, GOOGLE | none | none |

Body: `{ model, input, voice, instructions, response_format: 'pcm' }`. The
response is a raw audio byte stream, not JSON; a non-200 carries a JSON error
body, which is read and recorded the way `callLlm` records its failures.

**The model id is a live dependency**, exactly as the chat models are (see
CLAUDE.md, 2026-08-28): a retired TTS model 404s, and she would go silent while
looking fine. A test pins the id.

**Revised 2026-10-12, during the lab:** OpenRouter had delisted
`openai/gpt-4o-mini-tts-2025-12-15` (`400: Model … does not exist`), so her
OpenRouter route speaks through Gemini 3.8 Flash TTS. The body is unchanged:
OpenRouter forwards `instructions` to Gemini as its speech style, and `pcm` is
24kHz mono.

**The preset voice** (`voice`) is one of the route's model's own presets —
Gemini's 30 on OpenRouter, gpt-4o-mini-tts's 13 on OpenAI — so each route
carries its own list and its own cast. It is chosen **once, by ear, in the
voice lab**, and committed as a constant. It is a casting decision, not a
subject setting.

**Delivery direction** (`instructions`) lives on the register. `ModeDef` gains
`voiceDirection: string`, beside the rest of what each register says about how
she sounds — `speak.ts` may not describe her voice (CLAUDE.md, 2026-09-16), and
neither may the TTS module:

- DEFAULT: flat, clinical, precise, faintly contemptuous; even pacing, no
  warmth, no rising inflection on questions.
- SUPPORTIVE: warm and unhurried, but still unmistakably a machine.

Both are drafts until heard in the lab. The processing chain is the same in
both registers: she is one machine in two moods.

**Korean:** the same voice and direction. Both models are multilingual, and
the request needs no language field. (Callirrhoe has not yet been heard in
Korean.)

**Keys with no TTS** (Anthropic, DeepSeek, Google): no voice. Her SYSTEM row
says `NOT ON THIS KEY` rather than offering a switch that would do nothing.

## 2. The GLaDOS chain

`src/vera/voice/`, pure TypeScript, **no runtime imports** — the same
constraint `src/shell/opticArt.ts` keeps, and for the same reason: plain Node
strips the types and runs it, so the voice lab and the app process audio with
one implementation.

| module | job |
|---|---|
| `pcm.ts` | s16le PCM ↔ Float32; WAV encode/decode |
| `pitch.ts` | per-frame fundamental frequency (YIN), with voiced/unvoiced |
| `contour.ts` | the target pitch: GLaDOS's intonation |
| `psola.ts` | TD-PSOLA resynthesis from the detected pitch to the target |
| `fx.ts` | ring modulation, a short metallic comb resonance, light grit, normalise |
| `chain.ts` | `process(pcm, rate, text, settings) → Float32Array`, composing the above |
| `settings.ts` | every tunable number, and `CHAIN_VERSION` |

**The contour is the character.** Per voiced frame:
1. Pull the detected pitch most of the way toward the line's median
   (near-monotone).
2. Snap the result to the nearest semitone (the quantised, autotuned edge).
3. Add a small number of deliberate step jumps at stressed points. The jumps
   are chosen by a PRNG **seeded from a hash of the line's text**, so the same
   line always sounds identical — which is what keeps the cache honest and
   the tests exact.

Unvoiced frames pass through untouched, since consonants carry no pitch.

**`CHAIN_VERSION`** increments whenever any setting or algorithm changes. It is
part of the cache key, so a retuned chain never replays stale audio.

**Revised 2026-10-12, by ear in the lab.** Her first lines trembled, and three
causes were stacked, which is why removing any one of them changed nothing:

1. **The tracker dropped vowels that bend fast.** NOT falls eight semitones in
   150ms; YIN had the pitch right but not under its threshold, so those frames
   went through unshifted and one word flipped between her held note and her
   own pitch. `track` now grows each voiced run into a bordering frame when
   YIN's best guess is under `loose`, within two semitones of its neighbour,
   and at least 70% as loud.
2. **PSOLA marked each cycle at its loudest sample**, which jumps between two
   near-equal peaks; grains cut half a pulse apart cancelled into static. A
   run's later marks now go where the cycle best matches the last one.
3. **Ring modulation at 30Hz is a tremolo.** `ringMix` and `gritMix` are 0 —
   grit at twelve bits was inaudible, and audible grit is the static being
   removed. The contour's settings did not change.

## 3. The voice lab

`tools/voice-lab.mjs`, run on the Mac:

```sh
OPENROUTER_API_KEY=… node tools/voice-lab.mjs --all "Do not do that again."
OPENROUTER_API_KEY=… node tools/voice-lab.mjs --voice coral --mode supportive "…"
```

It writes `raw-<voice>.wav` and `vera-<voice>.wav` into a directory, for every
preset (`--all`) or one. It imports the chain, the mode directions and the
settings straight from `src/`, so what is heard in the lab is what the phone
plays. It also prints the response's byte count and the sample rate it assumed,
which settles the one fact OpenRouter's docs do not state: the PCM sample rate
(OpenAI's own is 24kHz, s16le, mono).

**The lab is built first and gates the rest.** The preset, both directions and
every chain setting are chosen by ear here before any app wiring, because a
result in the lab can change the chain's parameters.

The key is read from the environment, never from a file in the repo, and is
never written anywhere.

## 4. In the app

**`src/vera/voice/tts.ts`** builds the request and fetches it (the network is
injected, as `speech.ts` does it, so tests make no network request).
**`src/core/voice.ts`** is the effectful half: cache lookup, fetch, process,
write, play, stop. `expo-audio` plays a WAV file, and `expo-file-system` holds
the cache. Both are new native dependencies, so this needs a new dev build.
Their APIs are read from the v57 docs before any code is written (AGENTS.md).

**Timing — the text waits for the voice.** In `speak()`, once `line` is
decided and before the typewriter starts:

1. With voice on and a supporting key, ask `voice.prepare(line, mode)`.
   - **Live path:** `thinking` stays true, so the dots keep running while the
     audio is made (~1s).
   - **Bank path:** this path never set `thinking`, and on a cache miss it now
     does, for the length of the synthesis. A cache hit is immediate.
2. On success: start playback and the typewriter together, with the per-
   character interval set to `duration / line.length`, clamped to 16–90ms, so
   the last character lands as she finishes. TRANSMITTING therefore lasts
   exactly as long as she is speaking.
3. On failure, or past the **8s** timeout: the line appears exactly as it does
   today, at 16ms a character, silently.

**Revised 2026-10-13, on the phone:** the text is no longer paced to her. Both
still start together, but the typewriter keeps its own 16ms, because a line
stretched to the length of her speech was too slow to read along with.

With voice off, `speak()` behaves exactly as it does now.

**The cache:** processed WAVs in the cache directory, named by an FNV-1a hash
(pure TS, no `expo-crypto`) of `text · voice · direction · CHAIN_VERSION ·
model`. It is capped at 200 files, evicting the oldest. Bank lines repeat, so
after their first playing they are instant and free. Live replies are unique
and mostly age out.

**Control:**
- `voice: boolean` in the store and the soul blob, beside `theme`, **default
  `false`**, with a `setVoice` action that mirrors `setTheme`.
- **A VOICE row under PREFERENCES**, shell-owned like `TransmissionRow`:
  ON / OFF, or `NOT ON THIS KEY`.
- **A speaker glyph in the stage header**, left of the theme slider, offered
  on the same terms as the slider (she is awake). It flips the same setting;
  turning it off mid-line stops playback at once while the text finishes
  drawing. It is built from Views in the header's own ink, with no icon
  library and no raster.
- **She is told nothing.** Like the theme and the language, switching her
  voice is the subject rearranging their furniture: no stimulus, no transcript
  entry, no `systemNotice`.

**Interruptions:**
- A new line always stops the one playing — the same rule as the typewriter.
- Backgrounding the app stops playback, and a line whose audio is ready only
  after the subject has left is not played.
- **Changing view does not.** The LOG screen has its own input box, so she
  can be answering while the subject is off the stage, and a view change that
  cut her off would silence exactly that reply.
- Turning voice **on** mid-line does not start the line already drawing; she
  speaks from her next one.

## 5. Failure and debugging

**Failure is silent to the subject.** Her window never shows an error for a
voice, because the voice is decoration on a line that already arrived.

**It is recorded for the PROMPT screen.** `PromptRecord` gains
`voice?: { took: number } | { cached: true } | { failure: string }`, printed as
one line under the reply. As with the rest of that screen, only live calls
are recorded.

## 6. Cost

~$0.015 per minute of audio. Her lines are under thirty words, so roughly
$0.002 per spoken reply. Bank lines become free after their first play.

## 7. Testing

- **Chain, on synthetic signals:**
  - a 220Hz sine detects at 220Hz, ±1%;
  - silence and noise detect as unvoiced;
  - a PSOLA shift from 200Hz to 150Hz re-detects at 150Hz;
  - the contour lands every voiced frame on a semitone;
  - the same text always produces byte-identical output, and different text
    different jumps;
  - WAV encode/decode round-trips;
  - the output never clips.
- **Request:** the endpoint, model id, voice, direction and format per key
  kind; no route for the three unsupported kinds; an error body becomes the
  recorded failure. No network.
- **Store:**
  - voice off leaves every existing test passing unchanged;
  - voice on holds the typewriter until `prepare` resolves;
  - failure and timeout fall back to the 16ms silent typewriter;
  - mute mid-line stops playback;
  - a new line stops the old one;
  - the setting persists and defaults off;
  - she is told nothing.
- **Mutation-checked**, as this repo does.
- **Mocked globally in `jest.setup.ts`:** `expo-audio` and `expo-file-system`.
- **Not testable, and checked by ear:** whether she sounds right. That is the
  voice lab and the phone, never `npm test`.

## 8. Out of scope

- **Varying delivery by emotion** (alarmed faster, bored slower). It is a
  natural follow-up, but each emotion multiplies the cache and the tuning.
- **Notifications.** Her transmissions stay silent text on the lock screen.
- **Streaming playback.** Lines are under thirty words, so a whole-line fetch
  is simpler, and it is what lets the typewriter be paced to a known
  duration.
- **A subject-chosen voice.** Casting is fixed in code.
