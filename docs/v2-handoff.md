# v2 — what's left for a human

The `v2-overhaul` branch is complete: 18 tasks, 38 commits, 28 suites / 292 tests, `tsc` clean. Everything below is work no test can do.

## First: cut a dev build

`expo-secure-store` is a native module, and Instrument Serif / Nanum Myeongjo are new assets. **The dev build installed before 2026-07-30 cannot load this tree.**

```bash
npx eas-cli@latest build -p android --profile development
```

Nothing in the on-device list is reachable until this lands.

## Open decisions

Two are parked deliberately, both because they need Korean copy the design doc does not contain and "copy is verbatim" has been a standing constraint:

1. **MEMORY.md's scaffolding** (`subject:`, `entries:`, `sealed:`, `(none yet. give her material.)`) is hardcoded English. Unlike SOUL.md — whose English is diegetic, since it is sent to the model — this is UI chrome a Korean reader sees in-app.
2. **`T.alloc`** (`ALLOCATED` / `배정됨`) renders nowhere. The design implies the cabinet header wanted a visible `02 / 04 ALLOCATED` distinct from `CLOSE`; the plan's test string collapsed the two.

A third is a design question rather than copy:

3. **The stage does not scale back behind a rising module.** Spec §14 calls for it to drop to 0.965 and dim. Not implemented on any surface — decide whether it is wanted.

Also queued: the whole context/`notable` ruleset (`src/vera/context.ts`) is slated for a dedicated overhaul. Current behaviour is pinned by tests so it can be changed deliberately rather than by accident.

## On-device verification

### Navigation and overlays

1. The drawer handle opens the cabinet by **tap** and by **dragging up more than 22px**. `PanResponder` — jsdom cannot produce the gesture, and this is the only route into the cabinet.
2. Pressing a tile closes the drawer *and* opens the room in one frame, with no flash of empty stage between.
3. **Android hardware back at every depth**, in order: from `mod01`/`mod02`; from `mem`/`soul` (→ SYSTEM, not the stage); from `sys`/`log`; with the drawer open; with the key panel open over SYSTEM; and on the bare stage, where it must **close the app**.
4. Predictive back is disabled in `app.json` — confirm the edge swipe acts as a plain back press with no peek animation.
5. SYSTEM → CHANGE shows **exactly one** modal, over SYSTEM rather than the stage. (Two were mounting before Task 18.)
6. `StatusBar style="light"` against the two pale surfaces — Module 02's bone paper and `FileScreen`. Light icons on pale paper is where "every v2 surface is dark" could visibly fail.

### Her, live, with a real key

7. She greets you on waking, answers what you actually said, in register, at tolerable latency. No test asserts anything about a real model's output.
8. **The typewriter** — 16ms/char, and a second reply mid-type cancels the first cleanly.
9. **Fluid type** — a long reply shrinks to fit and the stage never scrolls, at both ladders, on the real screen height.
10. **The optic** — wake bloom, per-emotion blink intervals and slow blinks, gaze tracking and how far each emotion will follow. Skia is mocked to no-ops in jest; **none of the render is tested.**
11. **The blob** — continuous morph, twitchier and dimmer when hungry, squish-and-brighten on tap.
12. A bad-but-well-shaped key: she falls back to an authored line and stays awake. After two consecutive refusals the ACCESS mask turns red.
13. Airplane mode: a `FALLBACK` line, never an error in her place.
14. A hung connection: she gives up at 25s and still speaks. Before this was fixed, one hang made her deaf for the rest of the session.

### The loop

15. SYSTEM → MEMORY.md holds what she concluded, newest first, sealed entries showing `[REDACTED BY ADMINISTRATOR]` and still counted.
16. Clearing the transcript makes her remark on it, escalating across the first, second and third erasure.
17. Reopening the log shows the words gone and MEMORY.md intact.
18. The language switch changes her face *and* her voice, and survives a cold start.
19. Removing the key sends her dormant mid-sentence and leaves MEMORY.md intact; waking her again is a new first greeting over an old file.
20. **Visit counting** across a real close-and-reopen, and the 120s guard stopping hot reload inflating it.
21. **Module 02 persistence** across a cold start — title, lines, revision count, month.
22. **Specimen hunger drift** across real elapsed time (2.5/hour). Only verifiable by leaving the app shut for hours.
23. **Korean throughout** — Nanum Myeongjo for her voice, Pretendard for UI, no tofu, no clipped ascenders, and the Korean fluid ladder reading correctly at Hangul's larger optical size.

## Thin coverage, worth knowing

- **`KeyPanel` has no test file.** It is the only surface that removes a credential.
- **The drawer gesture is untested** and is the sole route into the cabinet.
- **`App.tsx`'s call site for `greetOnce()` is untested** — the rule is covered in `store.test.ts`, the wiring line is not.
- A dormant subject's words are not recorded to the transcript (`speak` returns before appending). Pre-existing semantics, not a regression.
