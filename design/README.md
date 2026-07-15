# Handoff: The Facility — "Personal Enrichment Program" Android app

## Overview
A dark-comedy Android app: the user is "enrolled" in a Personal Enrichment Program overseen by **V.E.R.A.** (Verification & Enrichment Response Administrator), a deadpan faux-supportive AI. One-time enrollment flow, a launcher home, a daily hold-to-comply loop, and five evaluation modules (Results Pending, Incinerator, Field Trials, Support Organism, Hazard Assessment) plus a Transmission Log of V.E.R.A.'s push notifications. Fully bilingual English / Korean.

Concept documents are included: `the-facility.md` (full concept) and `the-facility-design-brief.md`.

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, NOT production code to copy directly. The task is to **recreate these designs in the target codebase's environment** (Kotlin/Compose, React Native, Flutter — whatever the project uses) following its established patterns. If no codebase exists yet, choose the most appropriate Android stack (Jetpack Compose recommended) and implement the designs there.

`The Facility.dc.html` is the main prototype — open it directly in a browser. It is a single file: all markup, styling (inline), copy (in a bilingual string table), and state logic live inside it. `The Facility - README.md` documents every route, state variable, and mechanic — **read it alongside this file**.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final design intent. Recreate pixel-perfectly. The Korean copy is a strong first pass but should get a native-speaker rhythm/comedy read before ship.

## Screens / Views
The prototype routes on a single `step` value. Full table in `The Facility - README.md`; summary:

**Enrollment (first-run only):** `intake` (V.E.R.A. powers on) → `baseline` (adequacy slider, motive, language) → `consent` (decline button dodges the cursor; checkbox refuses to uncheck) → `assigned` (SUBJECT #50640 stamp) → `permission` (notification permission; deny gets a passive-aggressive "enter anyway").

**Core:** `facility` (light-enamel launcher grid; compliance streak card; locked "budget pending" vitrines), `settings` (language, re-process intake, notifications toggle, Transmission log), `daily` (hold-to-comply 2.2s ring → optional audit deliberation → verdict), `missed` (streak forfeit; petition → PROBATION).

**Evaluation modules (all interactive):**
- `results` — Results Pending: queue position 8,442,105 ticks DOWN ~every 1.1s; every ~9th tick it jumps UP by 2,000–6,000 (number flashes orange, delta flips red, V.E.R.A.: "Someone was prioritized. It was not you.").
- `incinerator` — editable grievance textarea (live word count) → INCINERATE → 2s burn (flame surges, text blurs to nothing, "ASH RETAINED FOR RECORDS") → burned counter increments → reset.
- `field` — Field Trials: HOLD TO WALK → distance 340m ticks down, compass needle stops wandering and homes to 0°, signal bars fill, V.E.R.A. escalates by proximity; at 0m a TARGET REACHED overlay appears and the button becomes the exit.
- `organism` — Support Organism: animated blob (Specimen-03) in a containment tank, drifting step-pellets, vitals grid, mutation log; OFFER STEPS → hunger 82%→41%, status pill HUNGRY→FED. GRUDGINGLY., mood + V.E.R.A. line change.
- `hazard` — Hazard Assessment: rotating radar sweep, pulsing blips, entity case-file list (BENIGN / MONITORING / ESCALATED / KNOWN), "YOU · AUTHORIZED*" center dot. Display-only.
- `notiflog` — Transmission Log: the day's five pushes (morning courtesy → module-flavored reminders → FINAL COURTESY countdown); COMPLY NOW buttons deep-link to `daily`.

Exact layout, dimensions, and copy: read the corresponding `sc-if` block in `The Facility.dc.html` (each screen is marked with a `data-screen-label` and a banner comment).

## Interactions & Behavior
- Screen transitions are instant swaps (no route animation); each module has a back arrow → `facility`.
- Hold gestures: pointer-down starts, pointer-up/leave cancels (daily comply ring 2.2s; field-trials walking ticks every 220ms).
- Timers MUST be cleaned up on screen exit and unmount (queue ticker, walk ticker, burn timeout).
- Field trials arrival: guard so the pointer-up that finishes the walk does not also trigger the exit (exit only on a new press after arrival).
- Ambient animations: scanline sweep (6–7s linear loop), pulsing status dots (1.4s), blob morph/bob/blink, ember flicker, radar sweep (4.4s), compass needle wander (4s ease-in-out ±6°).
- V.E.R.A. transmission panels: dark card, amber LIVE dot, 3px orange left border; the text line reacts to state everywhere.

## State Management
Single state object (see logic class in `The Facility.dc.html`): `step`, `lang`, enrollment fields, `streak`, `dPhase`/`dProg`, `mPhase`, `oFed`, `iPhase`/`iText`/`iBurnedCount`, `rQueue`/`rDelta`/`rEvent`, `fDist`/`fWalking`/`fArrived`, `notif`.
- Persistence: `localStorage['facility.enrolled.v1']` gates enrollment (→ real prefs/DataStore in production). Everything else is session-only in the prototype; production should persist streak, standing, organism state.
- All copy in `STR.en` / `STR.ko` keyed tables — a ready-made i18n resource map.

## Design Tokens
- **Dark surfaces (V.E.R.A.'s domain):** `#14130f`, `#17171a`, cards `#1c1b17`, borders `#2c2a22`. Incinerator warm-dark `#120d0a`; Hazard red-dark `#131011`; Field Trials blue-dark `#0c1012`; notification tray `#131211`.
- **Light enamel (bureaucracy):** bg `#ecebe4`, cards `#faf9f6` / `#f4f3ee`, borders `#e4e1d7` / `#dcd9cf`.
- **Accents:** amber `#f4b43a`, orange `#ff6a1a`, red `#d63a2a` (+ `#ff5a48`), green `#4fd08a`, blue `#2f6fff` (GOOD STANDING), cyan `#38c8c8`/`#38f0e0` (Field Trials only).
- **Type:** Space Grotesk (display/UI), IBM Plex Mono (labels, telemetry, timestamps), Pretendard (Hangul fallback — self-host woff2 in production).
- **Shape:** phone screen radius 34px; cards 12–16px; pills fully rounded; buttons 11–15px.
- **Label style:** mono, 7–10px in the 388px-wide mock (scale ~×1.1 for real dp), letter-spacing .08–.24em, uppercase.

## Assets
No raster assets. Everything is CSS-drawn (blob, radar, compass, flame, optic). Fonts via Google Fonts / Pretendard CDN in the prototype — self-host for production.

## Production notes
- Wire real platform APIs: notification permission, device locale, step counter (organism food), GPS/compass (field trials). Sensor values are faked in the prototype by design.
- Remove the `demo: miss a day` home-screen link; real missed state comes from an actual missed day.
- Push notifications: the Transmission Log screen defines the notification voice/format — implement as real Android notifications (channel: "V.E.R.A.").

## Files
- `The Facility.dc.html` — main interactive prototype (all screens)
- `The Facility - README.md` — route/state/mechanics reference
- `PROJECT-HANDOFF.md` — project-level context and working conventions
- `the-facility.md`, `the-facility-design-brief.md` — concept + design brief
- `Evaluations - 3a.dc.html` — exploration canvas with all design alternates (reference only)
- `screenshots/` — one PNG per screen (English), numbered in flow order: intake, baseline, consent, assigned, permission, facility, settings, daily, missed, results, incinerator, field, organism, hazard, notiflog
