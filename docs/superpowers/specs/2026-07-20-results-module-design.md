# Results Pending — module design

*Decided 2026-07-20. Phase 4, module 1 of 5 (results → incinerator → organism → field → hazard). Concept: `design/the-facility.md` · Design spec: `design/README.md` + `design/The Facility.dc.html` · Screenshot: `design/screenshots/10-results.png`.*

## Summary

Replace the `results` placeholder with the real Results Pending module: a satire of bureaucratic waiting. The user is position **#8,442,105** in a queue with an estimated wait of **4,331 years**. The number ticks while the screen is open — mostly crawling down, periodically leaping up — and V.E.R.A. narrates the movement with deadpan non-comfort.

This is the Phase 4 warm-up module: **no Skia, no dev build.** The screen is typography, a ticking number, a static progress/history block, and a `VeraPanel` — buildable entirely in Expo Go, mirroring how `src/shell/daily` is built (`react-native-svg` + Reanimated, no Skia). Skia's first real trigger remains the later modules (organism blob, field compass/radar, incinerator flame, hazard optic eye).

## Behavior model — live ticker + drift-on-open

The chosen model is the prototype's **live 1.1s interval** (Option B), plus one cheap upgrade: a **drift-on-open** that gives each visit a plausibly-shifted starting number without persisting a running simulation.

Rejected: treating the queue as a literal "pure function of (install date, now)" per `docs/architecture.md`. The prototype's tick dynamics are tuned for a human watching for seconds; run over real elapsed time (~78,000 ticks/day) the every-9th-tick up-jump dominates and the number diverges to hundreds of millions within a week, collapsing the fiction. That pure-function pattern belongs to Field Trials and the Organism, where the underlying quantity (steps walked, hunger) is *real*. For a fictional queue position, faking it live is both funnier and truer to the mock.

### On screen open

1. Read `enrolledAt` (store, a `YYYY-MM-DD` day key) and `lastSeenQueue` (storage).
2. `start = queueForDay(enrolledAt, today)` — a deterministic **net-neutral seeded jitter** around the base (see below), floored.
3. `delta = start − lastSeenQueue`. First-ever visit (no `lastSeenQueue`) falls back to the authored `−1204`.
4. Persist `start` as the new `lastSeenQueue`.
5. Start the live interval.

Same day → same `start` (deterministic per day). Reopen tomorrow → the number has plausibly moved, and the "SINCE YESTERDAY" delta reflects the *real* difference from last visit.

### The drift is net-neutral, not net-downward

Between sessions the number **jitters both directions around the base with ~zero net trend** (at most an imperceptible upward lean). It goes nowhere, forever. This is deliberate:

- A net-*downward* creep would, over decades, trend the queue toward completion — quietly contradicting the "4,331 years / you will never be processed" premise. Net-neutral keeps the fiction permanent: bureaucracy as a treadmill.
- The two-directional jitter gives V.E.R.A. both her lines organically: green "your position improved, do not celebrate" on a down day, red "someone was prioritized, it was not you" on an up day.

### The queue never reaches zero

- By construction the drift is net-neutral, so it never trends toward zero.
- The live in-session ticker, over any session, trends *upward* if anything (the +2,000–6,000 jump every 9th tick dominates over the 1–4 drops), never toward zero.
- A **defensive floor** clamps the displayed value to stay comfortably in the millions, so no edge case (a weird device clock, a huge gap between opens) can render a zero or negative position.
- **No terminal "result" state.** The absence of a result is the punchline (`RESULT: —`). Building a payoff for an event that cannot occur is YAGNI; a hidden "enrichment complete / inconclusive / re-enroll" easter egg is a clean bolt-on for later if ever wanted.

### While the screen is open — prototype ticker, verbatim

Port the prototype's `startQueue()` dynamics (`design/The Facility.dc.html`):

- Interval **1100ms**. Guarded to stop when `step !== 'results'`; cleared on unmount.
- Tick counter `t`:
  - **Every 9th tick** (`t % 9 === 0`): jump **up** by `2000 + rand(0..3999)`; `event = 'up'`.
  - **Otherwise**: drop by `1 + rand(0..3)`; `event` resets to `'none'` on the tick *after* a jump (`t % 9 === 1`), otherwise unchanged.
- `delta` moves by the same amount as the queue on every tick.
- Styling:
  - Number: `#f4efe2` normal, `#ff8a6a` (orange) on `event === 'up'`, with matching text-shadow (`#f4b43a33` normal / `#ff6a1a44` up).
  - Delta: green `#4fd08a` when `≤ 0`, red `#ff6a5a` when `> 0`; arrow `▼` when `≤ 0` else `▲`; `LIVE · QUEUE ADJUSTED · ` prefix when `event === 'up'`.

### Authored constants (kept fixed — funnier than computed, zero engineering)

- `EST. WAIT · 4,331 YEARS`
- The 2% progress bar (`ENROLLED` / `0.02% PROCESSED` / `RESULT`).
- The three history rows: `Mar 02 ▼1,204`, `Mar 01 ▲3,991` (red), `Feb 28 ▼812`.
- `CASE #8442105`, the scanline sweep (decorative).

## Architecture & files

Follows the existing module contract (`src/modules/types.ts`) — a module is a folder exporting a `ModuleDef` + its registry line (already present).

| File | Change |
|---|---|
| `src/modules/results/index.tsx` | Replace placeholder. Export `ModuleDef` (tile unchanged shape) + real `Screen`: header (back, title, `CASE #…`), queue readout (position label, big number, delta, est. wait), static progress/history block, `VeraPanel`. |
| `src/modules/results/strings.ts` | New. Port `STR.en`/`STR.ko` result keys verbatim: `rPosition`, `rWait`, `rEnrolled`, `rProcessed`, `rResult`, `rSince`, `rLiveUp`, `rVera`, `rVeraUp`. Korean ported as-is (native-speaker pass is Phase 5). |
| `src/modules/results/queue.ts` | New. **Pure, no React**: `queueForDay(enrolledAt, dayKey) → number` (net-neutral seeded jitter around base, floored) and the ticker step (`nextTick(state) → state`). This is the drift-on-open + live-ticker seam, unit-testable without a component. |
| `src/core/storage.ts` | Add one key: `lastSeenQueue: 'facility.lastSeenQueue.v1'`. |
| `src/modules/results/__tests__/` | Tests for `queue.ts` (pure) and the `Screen` (fake timers). |

Constants (base `8442105`, floor, jitter amplitude, tick bounds, colors) live in `queue.ts` / read from `theme.ts` palette where a token exists. Copy verbatim from the prototype; hex from `design/README.md`.

## Data flow

```
mount
  → read enrolledAt (store) + lastSeenQueue (storage)
  → start = queueForDay(enrolledAt, today)          // deterministic, floored
  → delta = start − lastSeenQueue  (or −1204 first-ever)
  → persist lastSeenQueue = start
  → setInterval(1100ms): nextTick → setState(queue, delta, event)
unmount / step !== 'results'
  → clearInterval
```

The `VeraPanel` line is selected from `event`: `rVeraUp` when `event === 'up'`, else `rVera`.

## Error handling

- Storage reads/writes wrapped like existing callers; a failure falls back to the authored base (`8442105`) and `−1204` delta rather than crashing — consistent with `hydrate()`'s "fall back to defaults rather than a dead splash" posture.
- The floor clamp guards the displayed value against any arithmetic edge case.
- **Timer cleanup on unmount and on `step` change** — the explicit risk called out in `docs/architecture.md` ("queue ticker" cleanup).

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`).

- **`queue.ts` (pure):**
  - `queueForDay` determinism: same `(enrolledAt, dayKey)` → same value.
  - Net-neutral jitter stays above the floor across many simulated days; no drift toward zero.
  - `nextTick`: 9th tick is an up-jump within `[2000, 5999]`; other ticks drop within `[1, 4]`; `event` sets to `'up'` on jump and resets to `'none'` on the following tick.
- **`Screen` (fake timers):** renders the base number and delta on mount; advancing 9 ticks triggers the up-jump and asserts the orange number + red delta styling and the `rVeraUp` line; timer is cleared on unmount.

## Out of scope

- Skia / dev build (later Phase 4 modules).
- Any terminal "result" / reveal state.
- Real computed history or wait estimate (kept as authored constants).
- Korean native-speaker comedy pass (Phase 5).
