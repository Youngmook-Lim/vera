# The Incinerator — module design

*Decided 2026-07-20. Phase 4, module 2 of 5 (results ✅ → incinerator → organism → field → hazard). Concept: `design/the-facility.md` · Design spec: `design/README.md` + `design/The Facility.dc.html` · Screenshot: `design/screenshots/11-incinerator.png`.*

## Summary

Replace the `incinerator` placeholder with the real module: a grievance-disposal ritual. The user types a grievance, presses INCINERATE, watches a flame surge for 2 seconds as the text burns away to "ASH RETAINED FOR RECORDS," and a personal burned-counter ticks up. V.E.R.A. supervises with deadpan non-comfort.

**No Skia, no dev build.** Despite the architecture doc earmarking the flame as the first Skia centerpiece, the prototype flame is just a radial-gradient rectangle that grows and flickers — fully reproducible with `react-native-svg` (15.15.4) and `react-native-reanimated` (4.5.0), both already installed and Expo Go-compatible. This module stays in Expo Go; the Skia + dev-build decision moves to the organism module (morphing blob), where it is most justified — and may prove to be the only module that truly needs it.

## Behavior model

Three phases (`iPhase`), mirroring the prototype's `incinerate()` state machine:

### compose
- Grievance `TextInput` (multiline) is editable; placeholder "type it. all of it." (`iPlaceholder`).
- Flame idles: 96px tall, slow flicker (~1.6s loop).
- Status line = live word count: `N WORDS · READY FOR DISPOSAL` (`iWordsSuffix`), or `AWAITING GRIEVANCE` (`iAwaiting`) at 0 words.
- V.E.R.A.: `iVeraCompose` — "State it fully. The chamber does not accept summaries."
- Button: "🔥 INCINERATE" (`iBtn`).

### burning (2 seconds)
- Input becomes read-only and **fades out** (opacity → ~0.12). The prototype's `blur(2px)` is intentionally dropped — under opacity 0.12 it reads identically, and RN has no free per-view blur (avoids an `expo-blur` dependency).
- Flame **surges** to 150px with a fast flicker (~0.5s loop).
- Status: `INCINERATING · 1,400°C` (`iStatusBurning`).
- V.E.R.A.: `iVeraBurn` — "Incinerating. This is the only service we provide free of charge."
- Button: "INCINERATING…" (`iBtnBurning`), disabled.

### done
- Input fully hidden (opacity 0); centered overlay `ASH RETAINED FOR RECORDS` (`iAsh`).
- Status: `DISPOSED · IRRECOVERABLE` (`iStatusDone`).
- V.E.R.A.: `iVeraDone` — "Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains."
- Button: "STATE ANOTHER GRIEVANCE" (`iBtnAgain`) → resets to `compose` and clears the text.

### Guards (from prototype + the risk callout in architecture.md "burn timeout")
- Pressing the button while `burning` does nothing.
- Pressing INCINERATE with empty/whitespace-only text does nothing.
- The 2s `setTimeout` is cleared on unmount; all Reanimated loops are cancelled on unmount.

## Burned counter — starts at 0, real and persisted

The prototype seeds `iBurnedCount` at 1,208 fresh each launch. This design instead **starts at 0 and persists** (one storage key), incrementing on every completed burn: `DISPOSAL · N BURNED` (`iBurned` pattern) survives app restarts.

Rationale: unlike the results queue position (pure fiction, so a fabricated base is fair), the burned count is a **real quantity** — how many grievances the user actually disposed of. Bolting a fake 1,208 head-start onto a genuinely real counter is the one dishonest note (the same half-real/half-fake hybrid rejected for the results history). Starting at 0 makes the incinerator the one piece of honest, personal telemetry in an app full of fake mega-numbers — a deliberate tonal contrast. The comedy lives in the copy, not the seed.

The in-progress grievance text is **transient** (local component state) — it is lost on navigating away, which is acceptable for something you are about to destroy anyway.

## Flame rendering (SVG + Reanimated)

A `Chamber` component, isolated and independently testable (like `src/shell/daily/ComplyRing`):

- An `<Svg>` box (250×150, rounded 14, dark gradient background `#241612 → #160d0a`, inset warm shadow) containing:
  - A `<Rect>` anchored to the bottom, filled with a `<RadialGradient>` (`#ffcf4a → #ff6a1a` at 40% → `#a02010` at 72% → `#3a1206` at 100%).
  - A bottom fade strip (`#00000000 → #160d0a`) over the flame.
- Reanimated shared values:
  - **height**: `withTiming` 96 → 150 on burn start; back to 96 on reset.
  - **flicker**: `withRepeat` (yoyo) on opacity/scaleY — ~1.6s loop at idle, ~0.5s loop while burning.
- The `CHAMBER · 1,400°C` label (`iChamber`) sits above the flame (z-ordered).
- All animations cancelled on unmount.

The flame reads its phase via a prop; the parent Screen owns phase state.

## Architecture & files

Follows the existing module contract (`src/modules/types.ts`). The `incinerator` registry entry and its `wide` tile already exist and stay unchanged.

| File | Change |
|---|---|
| `src/modules/incinerator/index.tsx` | Replace placeholder Screen with the real one (header, grievance `TextInput`, `Chamber`, status line, `VeraPanel`, button). Phase = local `useState`. Keep the tile export unchanged. |
| `src/modules/incinerator/strings.ts` | New. Port `STR.en`/`STR.ko` incinerator keys verbatim: `title` (evalIncinerator), `iGrievance`, `iPlaceholder`, `iChamber`, `iAsh`, `iWordsSuffix`, `iAwaiting`, `iStatusBurning`, `iStatusDone`, `iBtn`, `iBtnBurning`, `iBtnAgain`, `iVeraCompose`, `iVeraBurn`, `iVeraDone`, and the `iBurned` prefix/suffix. Korean ported as-is (Phase 5 native pass). |
| `src/modules/incinerator/Chamber.tsx` | New. The SVG + Reanimated flame; takes a `burning` (or phase) prop; owns its own animations and cleanup. |
| `src/core/storage.ts` | Add one key: `burnedCount: 'facility.burnedCount.v1'`. |
| `src/modules/incinerator/__tests__/` | Tests for the Screen (phases, timers, guards, counter) and `Chamber` (renders both phases, cleanup). |

Hex values verbatim from the prototype markup; type sizes via `ms()`, fonts via `font(role, weight, lang)`.

## Data flow

```
mount
  → read burnedCount (storage, default 0)
  → phase = 'compose', text = ''
compose + press INCINERATE (text.trim() non-empty)
  → phase = 'burning'  (input read-only + fade, flame surges)
  → setTimeout 2000ms → phase = 'done', burnedCount++ (persist)
done + press "state another"
  → phase = 'compose', text = ''
unmount / step change
  → clearTimeout, cancel animations
```

Word count: `text.trim() ? text.trim().split(/\s+/).length : 0` — same for both languages, matching the prototype (Korean word count via whitespace is intentionally left as-is; Phase 5).

V.E.R.A. line and status are pure derivations of `phase` (+ word count in compose).

## Error handling

- Storage read/write wrapped like existing callers; a failure falls back to an in-memory count (starting 0) rather than crashing — consistent with `hydrate()` and the results module.
- Timer + animation cleanup on unmount (the explicit "burn timeout" risk in architecture.md).

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`); `globalThis` not `global`; fake timers for the burn timeout with `jest.useRealTimers()` in `afterEach`.

- **Screen:**
  - compose → INCINERATE (non-empty) → burning → (advance 2s) → done, and the V.E.R.A. line / status / button label change per phase.
  - Empty/whitespace text: INCINERATE is a no-op (stays compose).
  - Pressing while burning is a no-op (no double-advance, counter increments once).
  - Word count renders (`AWAITING GRIEVANCE` at 0; `N WORDS · READY FOR DISPOSAL` with text).
  - Burned counter increments and persists to storage on a completed burn; reads back on mount.
  - "STATE ANOTHER GRIEVANCE" returns to compose and clears the text.
  - Back arrow returns to facility; timer cleared on unmount (no post-unmount state update).
- **Chamber:** renders in idle and burning states; cancels animations on unmount.

## Out of scope

- Skia / dev build (deferred to organism, if needed at all).
- `expo-blur` for the burning text (opacity-fade is sufficient).
- Persisting the in-progress grievance text (transient by design).
- Korean native-speaker comedy pass (Phase 5).
