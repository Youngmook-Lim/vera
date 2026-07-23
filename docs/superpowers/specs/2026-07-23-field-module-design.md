# Field Trials — module design

*Decided 2026-07-23. Phase 4, module 4 of 5 (results ✅ → incinerator ✅ → organism ✅ → field → hazard). Concept: `design/the-facility.md` · Design spec: `design/README.md` + `design/The Facility.dc.html` · Screenshot: `design/screenshots/12-field.png`.*

## Summary

Replace the `field` placeholder with the real Field Trials module: V.E.R.A. issues an absurd directive ("Proceed to the place where pigeons hold court") and you **HOLD TO WALK** — distance ticks down from 340m, a compass needle homes to the target, signal bars fill, and V.E.R.A. escalates by proximity until you arrive.

## Key decision: fake hold-to-walk, NOT real GPS

`docs/architecture.md` earmarked Field Trials as "the only network feature" (GPS + magnetometer + OSM Overpass API). This is **abandoned** in favor of the prototype's fake hold-to-walk. Reasons, established during brainstorming:

- **The comedy fights real GPS.** The whole joke is the absurd *authored* directive ("where pigeons hold court," "do not address the bench"). A real Overpass POI target would be mundane ("Riverside Park, 340m NE") and disconnected from the joke — real navigation makes the bit *worse*.
- **Brutal dev loop + complexity:** real GPS/compass would require physically walking outside to test every change, plus location permission, magnetometer, network, geo math, and offline handling — right after the organism sensor saga (Android sensor limitations are real, per that module).
- The prototype's fake mechanic is a **complete, satisfying bit** on its own, reusing the hold-gesture pattern already proven in `src/shell/daily/ComplyRing`.

No GPS, no compass sensor, no network, no permissions. Works anywhere.

## Behavior model (matches the prototype)

State (session-only, resets to defaults on each open — a fresh trial; no persistence): `dist` (starts 340), `walking` (bool), `arrived` (bool).

### HOLD TO WALK
- On press-down (and not arrived): `walking = true`; start an interval (**220ms**) that decrements `dist` by a random **6–13m** (`6 + floor(rand()*7)`), flooring at 0.
- On press-up / press-out / leave (and not arrived): `walking = false`; clear the interval. (Holding again resumes.)
- When `dist` reaches 0: clear interval, set `dist = 0`, `walking = false`, `arrived = true`.

### Compass needle
- **Idle** (not walking, not arrived): needle *wanders* — a gentle ±loop (~4s ease-in-out), matching the mock's `fneedle`.
- **Walking:** needle *homes toward 0°* — angle derived from remaining distance (mock: `34 − (340 − dist) × 0.1` degrees, transitioning). As distance shrinks, the needle converges on 0°.
- **Arrived:** needle locked at 0°.

### Signal bars (5)
Fill by distance thresholds, cyan (`#38c8c8`) when lit else dim (`#1e2a2d`): bar heights per mock (35/55/80/45/100%); lit when `dist < 320`, `< 240`, `< 120`, `<= 0` (bar 1 always lit). Signal text: idle `SIGNAL STRENGTH · HOLDING`, walking `SIGNAL STRENGTH · RISING`, arrived `SIGNAL STRENGTH · MAXIMUM`.

### V.E.R.A. by proximity (authored lines)
- Idle (untouched): `fVera` — "Your compliance is appreciated and mandatory. Walk. I will not tell you why."
- Walking / started (`walking` or `dist < 340`): `fVeraWalking` — "Good. Continue. The pigeons have been notified of your approach."
- Near (`dist < 100`): `fVeraNear` — "You are close. Act natural. They can tell when you act natural."
- Arrived: `fVeraArrived` — "You have arrived. Observe the court. Do not address the bench."

### Arrival + the arrival guard
At 0m: a `TARGET REACHED` / `THE COURT IS IN SESSION` overlay appears on the compass; the button label becomes `TRIAL COMPLETE · RETURN TO FACILITY` and styles as the exit.

**Arrival guard** (a called-out risk in `architecture.md` and `design/README.md`): the pointer-up that *finishes* the walk must NOT also trigger the exit. Exit fires only on a **new press** after arrival. Implemented with an "exit-armed" ref (the mock's `_fExitArm`): when arrived, press-down arms it; press-up exits only if armed. So arriving-then-releasing does nothing; a fresh tap exits to the facility.

### Directive
Fixed authored line: `fTask` — "Proceed to the place where pigeons hold court." Header shows `TODAY'S DIRECTIVE` (`fDirective`) and a static `TRIAL 50640-F13` code. (Daily directive rotation is out of scope — one authored line, matching the prototype; could rotate in Phase 5.)

## Drawing (SVG + Reanimated, no Skia)

The compass is a dial + rotating needle — pure vector rotation, `react-native-svg` + `react-native-reanimated`'s wheelhouse (like `ComplyRing`). Skia is available but adds nothing here; SVG is simpler and faithful.

- `Compass.tsx`: an `<Svg>` with concentric rings + a top tick + faint radial grid, and a needle (a thin rounded rect / line from center) whose **rotation** is a Reanimated shared value:
  - idle → `withRepeat` wander (±~6° ease-in-out, ~4s);
  - walking → `withTiming` toward the homing angle (derived from distance);
  - arrived → 0°.
- Props: `{ walking, arrived, dist }` (or a precomputed `angle` + mode). Owns its animation; cancels on unmount.
- Signal bars are plain `View`s (heights + lit color by distance), not part of the compass.

## Architecture & files

Follows the module contract (`src/modules/types.ts`). The `field` registry entry + square tile (with its custom compass `Icon`) already exist and stay unchanged.

| File | Change |
|---|---|
| `src/modules/field/index.tsx` | Replace placeholder Screen with the real one: header (back, title, `TRIAL 50640-F13`), directive card, `Compass` + distance readout + `TARGET REACHED` overlay, signal bars + text, `VeraPanel`, hold-to-walk button. Distance/walking/arrived = local state; walk interval + exit-arm in refs. Keep the tile + `Icon` export unchanged. |
| `src/modules/field/strings.ts` | New. Port `STR.en`/`STR.ko` field keys verbatim: `title` (evalField), `fDirective`, `fTask`, `fDistance`, `fSignal`, `fSignalIdle`, `fSignalArrived`, `fVera`, `fVeraWalking`, `fVeraNear`, `fVeraArrived`, `fWalk`, `fWalking`, `fWalkDone`, `fArrivedBig`, `fArrivedSub`. Korean ported as-is (Phase 5). |
| `src/modules/field/Compass.tsx` | New. SVG compass dial + animated needle (wander/home/locked); owns animation + cleanup. |
| `src/modules/field/__tests__/` | Tests for the Screen (walk tick, arrival, arrival guard, VERA by proximity, signal thresholds, back-nav, timer cleanup) and `Compass` (renders each mode + cleanup). |

No storage keys (session-only). Hex/type/font conventions as elsewhere: `ms()`, `font(role, weight, lang)`, palette + prototype hexes verbatim (Field Trials' blue-dark `#0c1012`, cyan `#38c8c8`/`#38f0e0`).

## Data flow

```
open / mount
  → dist = 340, walking = false, arrived = false
press-down (not arrived)
  → walking = true; interval(220ms): dist = max(0, dist − (6..12))
       → if dist hits 0: clear interval, arrived = true, walking = false
press-up / leave (not arrived)
  → walking = false; clear interval
press-down (arrived)
  → arm exit
press-up (arrived)
  → if armed: setStep('facility')
unmount / step change
  → clear interval, cancel needle animation
```

Compass mode, signal bars, signal text, and the V.E.R.A. line are pure derivations of `{ dist, walking, arrived }`.

## Error handling

- No storage, no network, no sensors → minimal failure surface.
- Interval + needle animation cleanup on unmount, on release, and on `step` change (the "timer cleanup" + "hold-gesture cancellation" risks in `architecture.md`).
- Arrival guard prevents the finishing pointer-up from double-acting as the exit tap (the explicit Field Trials risk).

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`); `globalThis` not `global`; fake timers for the walk interval with `jest.useRealTimers()` in `afterEach`.

- **Screen:**
  - press-in starts the walk; advancing timers drops the distance readout; press-out pauses (distance stops changing).
  - walking long enough reaches 0 → `arrived`: `TARGET REACHED` shows, signal text = MAXIMUM, button label = `TRIAL COMPLETE · RETURN TO FACILITY`.
  - **arrival guard:** the press-out that arrives does NOT navigate away; a subsequent press-in + press-out navigates to `facility`.
  - V.E.R.A. line changes with proximity (idle vs near `<100` vs arrived).
  - signal bars light per threshold (assert via lit count or the signal text transitions).
  - back arrow returns to facility; the interval is cleared on unmount (no post-unmount state update).
- **Compass:** renders in idle, walking, and arrived modes without throwing; cancels animation on unmount.

## Out of scope

- Real GPS / magnetometer / Overpass / network / location permission (abandoned; see key decision).
- Daily directive rotation (one authored directive).
- Persistence (session-only).
- Korean native-speaker comedy pass (Phase 5).
