# The Facility — prototype handoff

Single-file interactive prototype: `The Facility.dc.html`. Bilingual (English / 한국어), state-driven, no build step. Open it directly in a browser.

**Concept source:** `uploads/the-facility.md` + `uploads/the-facility-design-brief.md`. Visual direction: **3a "Aperture Lab" (clean enamel)** — see `Facility Home - 3a.dc.html` / `Evaluation Pattern - 3a.dc.html`.

## What's in it

One phone frame that routes between screens via a single `step` state value. Screens (each an `sc-if` block with a `data-screen-label`):

| step | screen | notes |
|---|---|---|
| `intake` | Cold open — V.E.R.A. powers on | first-run only |
| `baseline` | Intake form (adequacy slider, motive, language) | |
| `consent` | Enrichment Agreement | decline button dodges; checkbox won't uncheck |
| `assigned` | SUBJECT #50640 assigned | |
| `permission` | Contact Protocol (notification permission) | allow → facility; deny → "enter anyway" |
| `facility` | Home dashboard | compliance card + `demo: miss a day` link |
| `settings` | Subject Preferences | language switch + Re-process intake + notifications |
| `daily` | Daily compliance loop | hold-to-comply; SIMULATE AUDIT toggle |
| `missed` | Missed-day consequence | streak forfeit + petition → probation |
| `organism` | Support Organism (Specimen-03) | OFFER STEPS feeds it; vitals/mood/V.E.R.A. react (`oFed`, session-only) |
| `hazard` | Hazard Assessment (entity census) | sweep radar + entity case files; display-only |
| `results` | Results Pending | queue ticks down live; occasionally jumps UP (orange flash, delta flips red, V.E.R.A. reacts) |
| `incinerator` | The Incinerator | editable grievance → burn animation → counter increments |
| `field` | Field Trials | HOLD TO WALK → distance ticks down, needle homes in, signal bars fill, V.E.R.A. escalates; arrival overlay → tap returns to facility |
| `notiflog` | Transmission Log (Settings → Transmission log) | day's push notifications; COMPLY NOW → daily loop |

## Key mechanics

- **First-run gate:** enrollment runs once. On completion, `localStorage['facility.enrolled.v1'] = '1'` is set; subsequent loads boot straight to `facility`. Settings → *Re-process intake* clears the flag and replays.
- **Language:** defaults from device locale (mocked to English); switch live in the baseline step or Settings. All copy lives in `this.STR.en` / `this.STR.ko`. Korean renders in **Pretendard** (loaded via CDN in `<helmet>`); Latin stays Space Grotesk / IBM Plex Mono.
- **Daily loop:** `dPhase` = `directive` → (hold 2.2s) → optional `deliberating` (audit) → `done`; `streak` increments on success.
- **Missed day:** `mPhase` = `missed` → `amending` → `restored`; standing drops GOOD STANDING → UNDER REVIEW → PROBATION.

## Reviewing individual screens

Two tweak props (on the root component) jump straight to any state without clicking through:
- `startStep` — any of the steps above.
- `startLang` — `en` / `ko`.

## Production notes for Claude Code

- **Self-host Pretendard** (woff2) instead of the CDN `<link>`.
- **Korean copy is a strong first pass** — have a native speaker do a final rhythm/comedy read.
- Notification permission + locale are **mocked**; wire to real platform APIs.
- The `demo: miss a day` link on Home is a review affordance — remove for production (real missed state is triggered by an actual missed day).
- Streak/standing are in-memory demo values; back them with real persistence.
