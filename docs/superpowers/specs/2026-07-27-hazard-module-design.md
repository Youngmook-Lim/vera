# Hazard Assessment — module design

*Decided 2026-07-27. Phase 4, module 5 of 5 — the last module (results ✅ → incinerator ✅ → organism ✅ → field ✅ → hazard). Concept: `design/the-facility.md` · Design spec: `design/README.md` + `design/The Facility.dc.html` (lines 423–484 = the hazard screen; 955–963 en, 1096–1104 ko) · Screenshot: `design/screenshots/14-hazard.png`.*

## Summary

Replace the `hazard` placeholder Screen with the real Hazard Assessment module: a passive surveillance readout. An ambient radar sweeps over your apartment, a fixed census lists four "detected entities" (one claims to be the refrigerator; one is reading over your shoulder, currently), and V.E.R.A. delivers a single deadpan line. The comedy is entirely in the verbatim copy plus the eerie ambient radar.

## Key characteristic: passive, no user interaction

Unlike every other Phase 4 module (field's hold-to-walk, organism's tap-to-feed, incinerator's burn), the prototype hazard screen has **zero user interaction**. The only interactive affordance is the back arrow → facility. There is no hold gesture, no state machine, no persistence. This is faithful to the pixel-final design.

## Key decision: SVG + Reanimated, not Skia

`CLAUDE.md` explicitly flagged hazard as the module to reassess Skia-vs-SVG. Decision: **SVG + Reanimated**, consistent with field/results/incinerator (4 of the 5 modules; only organism uses Skia).

- The radar's signature elements are a rotating conic-gradient sweep and glowing blips. SVG can't do a true conic gradient or a true blur glow, so both are **approximated**: the sweep is a rotating gradient wedge `<Path>`; the blip/center glows are radial-gradient rims. This is faithful enough and matches the softer approach already shipped in the other SVG modules.
- Skia would reproduce both exactly (`SweepGradient` + `BlurMask`) but adds a second Skia module for a passive background flourish — not worth it. SVG is simpler, more testable, and reuses the exact pattern proven in `Compass.tsx`.

Note: `architecture.md` mentions an "optic eye" as an example of custom-drawn UI for this module. The pixel-final design (HTML + screenshot) has **no optic eye** — radar only. The design HTML is the authority; hazard is radar + census.

## Key decision: live element = ambient blip drift

The prototype screen is otherwise static. The one added liveness is **ambient blip drift**: the radar blips slowly drift around their base positions on a repeating ease-in-out loop (in addition to their opacity pulse and the spinning sweep). Subtle "they're moving" unease.

- **No count change, no new copy, no session state.** The `4 UNAUTHORIZED` badge stays 4; the census stays 4 rows; all copy stays verbatim from the prototype. (A census escalation 4→5 tied to the existing `n4Body` notification line was considered and rejected in brainstorming — drift only.)

## Screen layout (top → bottom, from `The Facility.dc.html` lines 425–482)

Screen background `#131011`. Reads `lang` from the store; `setStep('facility')` on back. Stateless (the only "state" lives inside `Radar.tsx`'s own animations).

- **Sticky header** (`#131011`, bottom border `#2a2020`): back arrow (`◀`, `#8a6868`) + `HAZARD ASSESSMENT` (`t.evalHazard`); right-aligned static `SWEEP 50640-H04` (hardcoded constant, `#6c5656` mono — like field's `TRIAL 50640-F13`).
- **Two pills** (centered row): `● 4 UNAUTHORIZED` (`t.hUnauthorized`, red `#ff5a48`, border `#d63a2a66`, bg `#d63a2a14`, pulsing) + `SECTOR · YOUR APARTMENT` (`t.hSector`, dim `#8a8168`, border `#2c2222`).
- **`<Radar>`** (230×230) — see below.
- **`YOU · AUTHORIZED*`** (`t.hYou`, `#8a8168`) rendered as the center label inside/under the radar, then **`*AUTHORIZATION SUBJECT TO REVIEW`** (`t.hYouNote`, `#6c5656`).
- **`DETECTED ENTITIES`** (`t.hDetected`, `#6c5656`) header + a card (`#1c1617`, border `#2c2222`, radius 12) with **4 rows**, each `border-bottom #241a1c` except the last:
  - H-01 (`hE1Id`/`hE1Desc`) — tag `BENIGN` (`hTagBenign`), dim scheme (`#8a8168`, border `#2c2a22`, no bg).
  - H-02 (`hE2Id`/`hE2Desc`) — tag `MONITORING` (`hTagMonitoring`), amber scheme (`#c98a17`, border `#f4b43a66`, bg `#f4b43a14`).
  - H-03 (`hE3Id`/`hE3Desc`) — tag `ESCALATED` (`hTagEscalated`), red scheme (`#ff5a48`, border `#d63a2a66`, bg `#d63a2a14`).
  - H-04 (`hE4Id`/`hE4Desc`) — tag `KNOWN` (`hTagKnown`), green scheme (`#4fd08a`, border `#4fd08a66`, bg `#4fd08a14`).
  - Row: id (mono `#8a8168`) over desc (display `#c9c2ae`) on the left; tag pill on the right.
- **V.E.R.A.**: the existing `VeraPanel` with `line={t.hVera}`, `lang`, `accent="#ff6a1a"` (the mock's orange left border; the LIVE dot/label stay amber as in `VeraPanel`).

## `Radar.tsx` (new, self-contained)

A single `<Svg width={230} height={230}>` that owns all its animation and cleans up on unmount — following `Compass.tsx` (`Animated.createAnimatedComponent`, `useAnimatedProps`, `withRepeat`, `cancelAnimation`).

- **Static geometry:**
  - Outer circle: radial-gradient fill `#1d1416` → `#131011`, border `#2c2222` (SVG `<RadialGradient>` + `<Circle>`).
  - Inset ring (`#241a1c`) and inner **dashed** ring (`#241a1c`, `strokeDasharray`).
  - Vertical + horizontal crosshairs (`#241a1c`, 1px).
  - Center "you" dot: radial-gradient white → `#f4b43a` (9px) with a soft glow rim (a larger low-opacity `#f4b43a` circle behind it).
- **Sweep:** a ~90° wedge `<Path>` (from center) filled with a red→transparent `<LinearGradient>` (approx `#d63a2a3d` → transparent), wrapped in an `Animated.G` whose `rotation` = a shared value running `withRepeat(withTiming(360, { duration: ~4400, easing: linear }), -1)`. Rotation pivots on the radar center.
- **Blips (4):** each an `AnimatedCircle` (radius ~3.5) plus a static radial-gradient glow rim behind it. Positions per the mock (3 red `#ff5a48`, 1 green `#4fd08a`), roughly: red at upper-left, red at right, red at lower-right, green at lower-left. Each blip:
  - `cx`/`cy` via `useAnimatedProps` = base position + a small drifting offset (each blip its own shared value on a `withRepeat` ease-in-out loop, distinct duration ~3.5–5s and phase, amplitude ±~10px on a gentle path).
  - opacity pulse (like the mock's staggered `fpulse`).
- **Cleanup:** `useEffect(() => () => { cancelAnimation(...) }, [])` cancels every shared value on unmount (the "timer/animation cleanup" risk in `architecture.md`).

Props: none needed (the screen is passive; the radar is self-contained). If the "you" label placement is easier in the parent, `Radar` may expose nothing and the label sits under it — decided during implementation.

## Architecture & files

Follows the module contract (`src/modules/types.ts`). The `hazard` registry entry + square tile (with its red-bordered-square `Icon`) already exist in `index.tsx` and stay unchanged — only the `Screen` is replaced.

| File | Change |
|---|---|
| `src/modules/hazard/index.tsx` | Replace the placeholder `Screen` with the real one (header, pills, `<Radar>`, you-label, `DETECTED ENTITIES` card with 4 rows, `VeraPanel`). Keep the `hazard` `ModuleDef`, `tile`, and `Icon` exports unchanged. Import strings from `./strings`. |
| `src/modules/hazard/strings.ts` | New. Verbatim en+ko port of all `h*` keys. Entities as a structured array so the row list maps cleanly: `entities: [{ id, desc, tag, scheme: 'benign'\|'monitoring'\|'escalated'\|'known' }]`, plus `title` (evalHazard), `hUnauthorized`, `hSector`, `hYou`, `hYouNote`, `hDetected`, `hVera`. Korean ported as-is (Phase 5 comedy pass). |
| `src/modules/hazard/Radar.tsx` | New. SVG radar: static rings/crosshairs/gradients, rotating sweep wedge, 4 drifting+pulsing blips, glowing center. Owns animation + cleanup. |
| `src/modules/hazard/__tests__/` | `strings.test.ts` (en/ko key + entity-array parity, like field's), a Screen test, and a `Radar` test. |

Hex/type/font conventions as elsewhere: `ms()`, `font(role, weight, lang)`, `palette` + prototype hexes verbatim (`#131011`, `#ff5a48`, `#d63a2a*`, `#f4b43a`, `#4fd08a`, `#8a8168`, `#c9c2ae`, `#ff6a1a`, etc.). No storage keys, no network, no sensors.

## Data flow

```
open / mount
  → Radar mounts, starts sweep rotation + per-blip drift/pulse loops
  → Screen renders static copy (pills, census rows, VERA line) from strings[lang]
back arrow
  → setStep('facility')
unmount / step change
  → Radar cancels all animations
```

There is no user-driven state. Everything on the screen except the radar's animation is a pure render of `strings[lang]`.

## Error handling

- No storage, no network, no sensors, no user input → minimal failure surface.
- The only lifecycle concern is animation cleanup: `Radar` cancels every shared value on unmount / step change (the "timer cleanup" / "hold-gesture cancellation" family of risks in `architecture.md`). No post-unmount state updates because the screen holds no state.

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`); `globalThis` not `global`; if any timers/animations are asserted, `jest.useRealTimers()` in `afterEach`. Skia is mocked in jest but not used here; `react-native-svg` + `react-native-reanimated` render under jest (as in the field/Compass tests).

- **strings:** en and ko expose identical key sets and an identical-length `entities` array with matching `tag`/`scheme` per index (mirrors `field/strings.test.ts`).
- **Screen:**
  - renders the title, both pills (`4 UNAUTHORIZED`, `SECTOR · YOUR APARTMENT`), and the you-note.
  - renders all four entity rows: each id, desc, and tag label present; tags in order BENIGN / MONITORING / ESCALATED / KNOWN.
  - renders the `hVera` line.
  - back arrow calls `setStep('facility')`.
  - renders in both `en` and `ko`.
- **Radar:** renders without throwing; cancels animation on unmount (no post-unmount warning).

## Out of scope

- Skia (SVG + Reanimated chosen; see key decision).
- Optic eye (not in the pixel-final design).
- Census escalation / count change / any copy change (drift-only live element).
- User interaction, session state, persistence, network, sensors.
- Korean native-speaker comedy pass (Phase 5).

## After this module

`hazard` is the **last Phase 4 module**. On merge, Phase 4 (Modules) is complete — update the `CLAUDE.md` build-progress list. Next is **Phase 5 — Polish** (transmission log, settings, Korean copy pass, EAS build for friends).
