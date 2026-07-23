# Support Organism — module design

*Decided 2026-07-23. Phase 4, module 3 of 5 (results ✅ → incinerator ✅ → organism → field → hazard). This is sub-project B, built on the Skia + dev-build enablement (sub-project A, merged 2026-07-23). Concept: `design/the-facility.md` · Design spec: `design/README.md` + `design/The Facility.dc.html` · Screenshot: `design/screenshots/13-organism.png`.*

## Summary

Replace the `organism` placeholder with the real Support Organism module: Specimen-03, a morphing creature in a containment tank that you keep alive by **feeding it**. It has a persisted hunger that drifts up over time (a true tamagotchi — neglect it and it's hungry again next visit). V.E.R.A. supervises with resentful attachment.

This is the first module with a **Skia** centerpiece (the blob), enabled by the dev build from sub-project A.

## Key pivot from the prototype: tap-to-feed, not steps

The prototype (and `docs/architecture.md`) fed the organism with **device steps** ("OFFER STEPS — 1,204 AVAILABLE"). This is abandoned. Reason, established during brainstorming and verified against the SDK 57 docs:

- `Pedometer.getStepCountAsync()` is **iOS-only**. On Android (this app's primary target) there is no OS API for historical daily steps — `expo-sensors` offers only live foreground `watchStepCount`, and the docs point to Health Connect (a separate system app + third-party lib) for history. This is an Android/OS reality, not an Expo limitation.
- Rather than take on Health Connect or reduce the mechanic to "pace your apartment live," the feed mechanic is changed to **tapping the blob directly**. This removes all sensor/permission/Health-Connect complexity and makes the creature a more direct pet.

The steps-specific UI is removed: the `OFFER STEPS` button and the `PEDESTRIAN ACTIVITY` intake bar. Everything else from the mock is preserved.

## Behavior model — feed by tapping, persisted drift

### Hunger (pure, persisted)

Two storage keys: `organismHunger` (0–100, as string) and `organismLastFed` (ISO timestamp | absent).

Constants (in `hunger.ts`, tuneable):
- `START_HUNGER = 82` (the prototype's starting value)
- `FEED_PER_TAP = 10` (each tap lowers hunger by 10, floored at 0 → ~8 taps from starving to full)
- `DRIFT_PER_HOUR = 2.5` (hunger climbs ~2.5/hr → gets hungry again over ~a day; tune to taste)
- `HUNGRY_THRESHOLD = 50` (≥ 50 → hungry; < 50 → fed)

- **On open:** `hunger = clamp(0, 100, storedHunger + hoursSince(lastFed) × DRIFT_PER_HOUR)`. First-ever visit (no stored value) → `START_HUNGER`. No daily reset — continuous drift is the whole model.
- **Tap the blob:** `hunger = max(0, hunger − FEED_PER_TAP)`; persist the new hunger and `now` as `lastFed`.
- Optional polish: a slow interval (e.g. every ~30s) that recomputes displayed hunger from the timestamp so it visibly creeps while the screen is open. Pure-function recompute, no extra state. Cleaned up on unmount. Not required for a complete module.

### Derived display (pure functions of hunger)

- **Status pill:** `● HUNGRY` (hunger ≥ 50) / `● FED. GRUDGINGLY.` (< 50) — `oStatusHungry`/`oStatusFed`.
- **Mood line:** `MOOD · RESENTFUL BUT ATTACHED` / `MOOD · TEMPORARILY PACIFIED` — `oMoodHungry`/`oMoodFed`.
- **V.E.R.A. line:** `oVeraHungry` / `oVeraFed`. The fed line's "steps" wording is adjusted to be tap-appropriate (English), flagged for the Phase 5 Korean pass.
- **Hunger vital:** the live hunger %, bar colored orange (hungry) / green (fed).
- **Feed hint** (where the steps button/intake bar were): `TAP TO FEED` when hungry, a satiated line (e.g. the mood/fed cue) when full.

### Static flavor (kept verbatim, not computed)

- Vitals grid: `TEMP 36.1°` (`oBattery` sub) and `NAUSEA LOW` (`oNoVehicles` sub) — authored, like the incinerator's fixed bits.
- `DAY 13 IN CARE` (`oDay`), `SPECIMEN-03` header tag.
- Mutation log: the 3 authored rows (`oMutD1..3`, `oMut1..3`).

## The blob (rich Skia showcase — `Blob.tsx`)

Self-contained, independently testable (like `Chamber`). Props: the current `hunger` (drives mood) and a tap trigger; the parent owns hunger state.

- **Morphing body:** a Skia `<Path>` whose control-point radii are driven by layered sine waves in a Reanimated worklet (continuously gooey, not a two-keyframe loop). Radial-gradient fill `#a9ecc4 → #4fd08a (52%) → #2c8a5c (92%)`.
- **Glow halo:** a soft blurred aura behind the body (Skia `BlurMask` / blurred layer), amber-green.
- **Face:** two eyes that blink (`forgblink`-style, ~every 5s), a small mouth. Gentle vertical bob (`fbob`, ~4.6s).
- **Mood-reactive:** hungry → dimmer, faster/jitterier morph; fed → brighter, slow/calm. A `mood` value derived from hunger maps to morph speed/amplitude + brightness.
- **Tap-reactive:** each tap fires a quick squish (scaleY dip/recover) + a brighten pulse + a small gulp/pellet cue. Driven by a shared value bumped on tap.
- Contained in a tank: concentric-circle background (radial gradient, dashed inner ring, inset glow) matching the mock. Drifting amber pellets (the mock's `fdrift` motes) may be kept as ambient decoration or dropped — decorative, not load-bearing.
- All animations cancelled on unmount.

The blob is the tap target (a `Pressable`/tap gesture wrapping the canvas), reporting taps to the parent.

## Architecture & files

Follows the module contract (`src/modules/types.ts`). The `organism` registry entry + square tile already exist and stay unchanged.

| File | Change |
|---|---|
| `src/modules/organism/index.tsx` | Replace placeholder with the real scrolling Screen: header (back, title, `SPECIMEN-03`), status pill + `DAY 13 IN CARE`, tank + tappable `Blob`, mood line, vitals grid (hunger live + temp/nausea static), feed hint, mutation log, `VeraPanel`. Reuses the shared `VeraPanel` (the mock's organism VERA card has the pulsing LIVE dot). Keep the tile export unchanged. |
| `src/modules/organism/strings.ts` | New. Port `STR.en`/`STR.ko` organism keys verbatim (status/mood/vera/vitals/mutation-log/day). Adjust the English fed-VERA "steps" wording to tap-appropriate; Korean ported as-is (Phase 5). |
| `src/modules/organism/hunger.ts` | New. Pure: `hungerForNow(stored, lastFed, now)`, `feed(hunger)`, `isHungry(hunger)`, constants. No React, no Skia. |
| `src/modules/organism/Blob.tsx` | New. The rich Skia blob; props `{ hunger, tapNonce/onTap, ... }`; owns animations + cleanup. |
| `src/core/storage.ts` | Add keys: `organismHunger: 'facility.organismHunger.v1'`, `organismLastFed: 'facility.organismLastFed.v1'`. |
| `src/modules/organism/__tests__/` | Tests for `hunger.ts`, `Blob` (renders + cleanup, Skia mocked), and the Screen (feed, persistence, threshold flips, drift-on-open, back-nav). |

Hex/type/font conventions as elsewhere: `ms()`, `font(role, weight, lang)`, palette + prototype hexes verbatim.

## Data flow

```
mount
  → read organismHunger + organismLastFed (storage)
  → hunger = hungerForNow(stored ?? START_HUNGER, lastFed, now)   // drift-on-open
tap blob
  → hunger = feed(hunger)               // −FEED_PER_TAP, floor 0
  → persist organismHunger = hunger, organismLastFed = now
  → blob plays squish/brighten/gulp
unmount / step change
  → cancel animations, clear any drift interval
```

Status/mood/VERA/hint are pure derivations of `hunger`.

## Error handling

- Storage read/write wrapped like existing callers; failure falls back to in-memory `START_HUNGER` rather than crashing — consistent with results/incinerator/hydrate.
- Hunger clamped to [0, 100] on every path.
- Animation + interval cleanup on unmount (the project's standing risk area).

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`); `globalThis` not `global`; Skia mocked to no-op Proxy in `jest.setup.ts` (already in place from sub-project A).

- **`hunger.ts`:** `hungerForNow` drift math (climbs with elapsed time, clamps at 100, first-visit default); `feed` decrements by `FEED_PER_TAP` and floors at 0; `isHungry` threshold at 50 (both sides).
- **`Blob`:** renders in hungry and fed states without throwing; unmounts cleanly (Skia mocked).
- **Screen:** tapping the blob lowers the hunger vital and persists both keys; status/mood/VERA flip when hunger crosses the threshold; drift-on-open computes from stored state (e.g. stored 20 + long elapsed → higher, shown); back arrow returns to facility; timers/animations cleaned up on unmount.

## Out of scope

- Device steps / Pedometer / Health Connect (abandoned; the feed seam is tap-based and could be extended later).
- Any daily-reset logic (continuous drift replaces it).
- Real temp/nausea vitals (authored constants).
- Korean native-speaker comedy pass (Phase 5).
