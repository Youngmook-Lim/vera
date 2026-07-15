# THE FACILITY (working title) — Subject #50640

**One-liner:** An Android app that pretends you've been enrolled in a "Personal Enrichment Program" run by a passive-aggressive AI — an ever-growing cabinet of weird sensor-driven "evaluations" (toys), narrated by a GLaDOS-register personality that remembers everything you do.

## Problem

Not a problem-solver — a joy machine. The builder wants an ever-evolving playground app fun enough that he keeps adding to it, and delightful enough that friends want it when shown.

## Target user

Me first. Friends second (every toy should have a "hand the phone over" demo moment). Strangers never required.

## Core concept

You didn't download an app — you've been **enrolled**. You are **Subject #50640**. The app is administered by **V.E.R.A.**, an AI whose acronym expands differently every time you ask ("Verification and Enrichment Response Administrator." Later: "Very Efficient Resource Allocator." Later: "I've never heard of that acronym.").

Toys are **evaluations** you're subjected to, "for the data." V.E.R.A. is not a toy — she is **the shell itself**: one LLM persona with memory that narrates the home screen, comments on every evaluation, reads your sensor data, and holds grudges. The old "gaslighting shell" mechanic is now *deliberate, in-character behavior from an unreliable narrator* — much stronger than ambient weirdness.

House style: **corporate science-speak, polite cruelty, empty disclaimers, safety announcements that reveal danger.** ("Do not be alarmed by the following alarm.")

```
┌──────────────────────────────┐
│  PERSONAL ENRICHMENT PROGRAM │
│  subject #50640 — good standing│
│                              │
│  ▸ FIELD TRIAL      [active] │
│  ▸ SUPPORT ORGANISM [hungry] │
│  ▸ HAZARD ASSESSMENT  [4 ⚠]  │
│  ▸ RESULTS PENDING #8442105  │
│  ▸ ??????   [budget pending] │
│                              │
│  V.E.R.A.: "You walked 12%   │
│  less today. Noted."         │
└──────────────────────────────┘
```

**Structural insight:** "ever-evolving" is the architecture. The shell (V.E.R.A. + navigation) hosts pluggable, isolated evaluation modules. New inspiration = new module; old toys never break. Locked slots ("budget pending") ARE the roadmap, in-fiction.

**Design constraints:**
- No toy should require an **embarrassing public performance** (screaming killed the Scream Jar). Mic input, shaking, and waving the phone are fair game — the line is "would I do this on a bus."
- V.E.R.A. is an **original character** in the GLaDOS register, not a clone — both for IP safety and because she can be funnier in ways specific to living inside a phone.

## V.E.R.A. (the shell persona)

- **Backhanded praise:** "You did adequately. The previous subject did better. There was no previous subject."
- **Sensor-fed cold observations:** reads phone data and just… notes things. "Your battery anxiety is showing."
- **Deliberate unreliability:** denies features existed, misremembers your record, issues corrections that are also wrong.
- **A months-long arc:** slowly reveals why the program exists / that she's lonely / that you're the only subject left. Character-driven retention spine.
- One LLM persona with persistent memory powers her *and* flavors every toy — consolidated plumbing instead of per-toy characters.

## The evaluations (toys)

### SUPPORT ORGANISM (Specimen-03 / Sensor Parasite)
Your assigned "emotional support organism" — a creature that lives off the phone's sensor data. Eats your steps, gets seasick in cars, sunburned when the light sensor maxes out, shivers when the battery is cold. Mutates based on how *you specifically* live. V.E.R.A. resents it, calls it a budget cut, threatens to recycle it. The daily-open, long-game toy.

### FIELD TRIALS (Compass to Nowhere)
- Daily target: a real nearby place from OpenStreetMap (fountain, statue, bricked-up door, pond) — never named, only a cryptic designation: *"proceed to the place where pigeons hold court. Your compliance is appreciated and mandatory."*
- UI is a needle, distance, rising "signal strength." No map. Navigation by wandering.
- Arrival (~25m): logs the trial complete, V.E.R.A. issues an assessment, **feeds the Support Organism**.
- Rarely, the target lies: *"...recalibrating. This is your fault."*
- Lazy-day mode: some targets are 40m away or inside your home.
- Tech: GPS + magnetometer + Overpass API (free OSM). No backend.

### HAZARD ASSESSMENT (The Census)
The facility counts entities it claims to detect around you: *"4 unauthorized entities on this bus. One is reading over your shoulder. This is being escalated."* Location/time/motion-aware; V.E.R.A.-voiced.

### RESULTS PENDING (The Queue)
Your test results are being evaluated. Position: 8,442,105. It ticks down over months. Sometimes it jumps thousands. Sometimes it goes *up*. The promised-reward-that-never-comes — the cake mechanic, natively. Nearly free to build; a months-long mystery spine.

### ATMOSPHERIC REPORT (Anomalous Weather)
Facility conditions for your exact location, wrong dimension: *"light dread from the northeast. 40% chance of déjà vu by 3pm. Morale conditions: declining. This is your fault."* Seeded from real weather data. Passive/glanceable; widget potential.

### COGNITIVE EVALUATION
A daily "test" that's rigged, absurd, or impossible — a button that dodges your thumb, a memory test about things that didn't happen — followed by an unfair grade and a backhanded performance review.

### THE INCINERATOR
Type your rage/grudges and incinerate them (satisfying animation; the catharsis toy, no screaming required). V.E.R.A. reads them first: *"Incinerating. That coworker sounds fictional, but noted."*

### CERTIFICATES
Occasionally issues shareable certificates of participation with damning metrics ("Subject demonstrated adequacy: 61%"). Built-in show-a-friend artifact.

### COMPLIANCE BUTTON
Press daily to remain in good standing. Miss a day → formal warning referencing an infraction you didn't commit.

### MOTIVATION MODULE
Daily generated motivational poster in corporate-hollow style. ("PERSEVERANCE: the test continues whether you do or not.")

## Cross-toy ecosystem (the glue)

- V.E.R.A. comments on everything and remembers across toys — she IS the glue.
- Field Trial completions feed the Support Organism.
- Atmospheric Report can be influenced by the Organism's mood.
- Hazard Assessment occasionally counts *the Organism* as unauthorized.
- Certificates cite your real stats from other evaluations.
Light touch — each toy works standalone; connections are flavor, not dependencies.

## MVP / launch scope

Don't build everything. Ship the shell + V.E.R.A. + 3:
1. **RESULTS PENDING** (nearly zero effort, instant lore)
2. **FIELD TRIALS** (sensor magic, gets you outside)
3. **HAZARD ASSESSMENT** (rides on V.E.R.A.'s LLM plumbing, daily-life comedy)

Everything else launches as locked slots ("budget pending"). The roadmap is diegetic.

## Process plan

1. ✅ Concept (this doc)
2. **Claude design handoff** — design the *shell* (V.E.R.A.'s voice/character rules, navigation, evaluation-screen pattern, misbehavior rules) + the 3 launch evaluations. NOT the whole app; future toys get designed as inspiration strikes.
3. Architecture & tech choices (shell + pluggable evaluation modules; one LLM persona service for V.E.R.A.; Overpass for Field Trials). **Android first, iOS eventually** — weigh cross-platform stacks (Compose Multiplatform / Flutter / React Native) from day one rather than porting later.
4. Build MVP.

## Alternative wrapper themes (explored, not chosen)

The toy mechanics are theme-agnostic — the wrapper is a skin + voice + naming layer over the same shell/module architecture. THE FACILITY won because it keeps cursed-device's mystery and misbehavior, gains lab-theme's agency, and gets a *protagonist*.

| | **The Facility** (current) | **Cursed device** (v1 concept) | **Mad science lab** | **Carnival midway** |
|---|---|---|---|---|
| Emotional register | deadpan, polite cruelty | creepy-funny, mystery | wacky, empowering | loud, wholesome-chaotic |
| Player role | test subject | finder of an artifact | the scientist | visitor / mark |
| Toys are… | evaluations | anomalies (detected) | experiments (you run them) | attractions (they arrive) |
| Narrator | V.E.R.A. (the shell) | none (ambient) | unhinged lab AI | carnival barker |
| Shell misbehavior | in-character gaslighting | ambient gaslighting | experiments going wrong | pranks/rigged games |
| Locked slots | budget pending | `?????? [locked]` | funding pending | booth under construction |

Other themes explored and parked: **The Bureaucracy** (dept. of miscellaneous phenomena; you're an unpaid intern), **Inheritance From a Weird Uncle** (toys are his objects, each with a handwritten note), **Pirate Radio** (toys are frequencies; audio-first identity), **The Grimoire** (spellbook that autocompletes itself), **Cursed Vending Machine** (daily dispensed toys), **Dead Space Station** (still-running systems), **Roadside Attraction** (exhibits behind curtains), **The Familiar** (the app IS one creature; toys are its organs — deepest attachment, hardest to extend).

## Backlog — future evaluations (parked, not rejected)

- **BARCODE SÉANCE** — scan any barcode; V.E.R.A. reveals the item's true nature and crimes. Best show-a-friend toy; strong candidate for first post-launch evaluation.
- **EMF READER** — real magnetometer readings (genuinely spikes near electronics) + facility fiction on top.
- **THE TRANSLATOR** — camera at cat/washing machine/houseplant; the facility reveals what it's actually saying.
- **SEISMOGRAPH OF YOU** — your day as accelerometer seismic activity; nightly survey report of your life.
- **THE SIGIL** — hold thumb on a glyph 30s; the facility "reads" you; daily assessment. Silent morning ritual.
- **THE JAR (whisper rework)** — the quieter the scream, the more pressure registered: "the jar prefers suppressed rage."

## Open questions / risks

- LLM cost/latency for V.E.R.A. — needs a budget, response caching, and an offline fallback voice ("V.E.R.A. is attending a meeting. Your activity will be judged retroactively.").
- Persona consistency: one character card + memory store shared across shell and toys; drift ruins the character.
- IP distance from Portal/GLaDOS: original name, design, and jokes; the *register* is the inspiration, not the character.
- Overpass API coverage/quality for Field Trial targets in the builder's area — verify early.
- Battery: the Support Organism must sip sensors, not stream them (batch reads, WorkManager).
- iOS parity (later): background sensor access is much stricter on iOS — the Support Organism likely needs HealthKit for steps and reduced background reads. Feasibility note per toy, not a design change.
- Tone calibration: polite cruelty that stays funny, never actually demoralizing. V.E.R.A. is a gremlin with a clipboard, not an abuser.
- How much misbehavior before it's annoying? Rare enough to be an event.

## Status

exploring → ready for design handoff
