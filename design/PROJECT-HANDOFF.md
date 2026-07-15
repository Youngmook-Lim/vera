# THE FACILITY — project handoff

## What this is
An Android app that pretends you've been enrolled in a "Personal Enrichment Program" run by **V.E.R.A.** (Verification & Enrichment Response Administrator), a deadpan, faux-supportive AI overseer. Dark comedy / ARG tone. Concept lives in `uploads/the-facility.md` + `uploads/the-facility-design-brief.md` — **read these first.**

## Visual system — "3a Aperture Lab" (binding)
The design-system project (`/projects/3ee55957-…`) reads EMPTY. Until real tokens land there, the canonical system is what's built into these files:
- **Surfaces (two moods, both used deliberately):** dark `#14130f` / `#17171a` = V.E.R.A.'s domain, spectacle, mystery. Light enamel `#ecebe4` / cards `#faf9f6`,`#f4f3ee` = bureaucracy, forms, utility.
- **Accents:** amber `#f4b43a`, orange `#ff6a1a` (transmission left-border), red `#d63a2a` (danger/missed), blue `#2f6fff` (GOOD STANDING), green `#4fd08a` (ready/compliant). Field Trials uses a distinct cyan `#38c8c8` "signal" palette on purpose.
- **Type:** Space Grotesk (display), IBM Plex Mono (labels/telemetry), **Pretendard** as the Hangul fallback (loaded via CDN in each file's `<helmet>`).
- **Motifs:** layered optic (V.E.R.A.'s "eye"), `LIVE TRANSMISSION` panel with orange left-border, scanline sweep, status pills.

## Files (all `.dc.html` Design Components)
- **`The Facility.dc.html`** — THE MAIN PROTOTYPE. Single-file, interactive, bilingual EN/KO.
- `The Facility — README.md` — route/state/token doc for this prototype.
- `Evaluations - 3a.dc.html` — static exploration canvas; holds all evaluation direction alternates (1a–1h, 2a) not chosen.
- `Enrollment Prototype.dc.html` — earlier standalone enrollment (superseded by The Facility, kept for reference).
- `Compliance Loop.dc.html` — static explorations of the daily loop / notification / missed-day (source for what's now merged in).
- `Enrollment - 3a.dc.html` — static enrollment screens.
- `Visual Identity Directions.dc.html` — original direction exploration (3a was chosen).
- `Facility Home - 3a.dc.html`, `Evaluation Pattern - 3a.dc.html` — original chosen mocks.

## The Facility prototype — how it works
Single `step` state routes between `sc-if` screens. All copy in `this.STR.en` / `this.STR.ko`. Two tweak props on the root: **`startStep`** (jump to any screen) and **`startLang`** (en/ko).

Screens: `intake → baseline → consent → assigned → permission` (first-run enrollment) → **`facility`** (the enamel-grid launcher home) → `settings`, `daily`, `missed`, and the three evaluation modules `results`, `incinerator`, `field`.

Key mechanics already built & verified:
- **First-run gate:** completing enrollment sets `localStorage['facility.enrolled.v1']='1'`; later loads boot to `facility`. Settings → *Re-process intake* clears it.
- **Language:** device-locale default (mocked EN), live switch in baseline + Settings.
- **Daily loop:** hold-to-comply (2.2s) → optional audit deliberation → verdict; `streak` increments.
- **Missed day:** streak forfeit + standing GOOD STANDING → UNDER REVIEW → PROBATION via petition.
- **Launcher:** 2a enamel grid. Tiles → module, back-arrow → home.

## Evaluations — status
Chosen directions (built into The Facility, **display-only, not yet interactive**):
- **Results Pending** = 1c (dark dwindling-number screen)
- **The Incinerator** = 1e (furnace mouth, live ember)
- **Field Trials** = 1g (cyan instrument compass)

- **Support Organism** = 3c (dark tank + mutation log, from Turn 3) — wired into The Facility as `step: 'organism'`, **interactive**: OFFER STEPS feeds it (hunger 82%→41%, pills/mood/V.E.R.A. react; `oFed` state, session-only).

- **Hazard Assessment** = 4a (sweep radar, red palette) — wired as `step: 'hazard'`, display-only, bilingual. 4b census ledger kept in Evaluations Turn 4 as the alternate.
- **The Incinerator** is now **interactive**: editable grievance textarea (live word count), INCINERATE → 2s burn (flame surge, text blurs away, ASH RETAINED overlay) → burned counter increments, V.E.R.A. reacts per phase (`iPhase`/`iText`/`iBurnedCount`).
- **Push notification mock** = 5c in `Evaluations - 3a.dc.html` — **wired into The Facility** as the Transmission Log (`step: 'notiflog'`, Settings → Transmission log). COMPLY NOW buttons jump to the daily loop. Bilingual.
- **Results Pending** is now **interactive**: queue number ticks down live (~1.1s), every ~9th tick it jumps UP by thousands — number flashes orange, delta flips red, V.E.R.A. comments ("Someone was prioritized. It was not you."). `startQueue()` interval, cleaned up on leave/unmount.

All five launcher tiles now wired. Locked "budget pending" vitrines below remain diegetic roadmap.

## Open next steps (pick up here)
1. Make a module truly interactive — e.g. The Incinerator (type a grievance → burn animation → V.E.R.A. reads it), Field Trials (faked live compass/distance), Results Pending (ticking number).
2. All modules are now interactive. Stretch ideas: Hazard rescan, organism persistence across sessions.
3. Wire the daily notification to a real lock-screen mock if desired.
4. Korean copy is a strong first pass — needs a native-speaker rhythm/comedy read.
5. Production: self-host Pretendard woff2; wire real permission/locale/sensor APIs; remove the `demo: miss a day` link; back streak/standing with real persistence.

## Working conventions
- Sensor values are faked for mocks (user approved).
- Static-first, then wire into The Facility. Present options as side-by-side `sc-if`/section variations with `{turn}{letter}` ids (1a, 2a…).
- New evaluation variations go in `Evaluations - 3a.dc.html`; wire the winner into `The Facility.dc.html`.
