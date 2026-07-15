# THE FACILITY — Design Brief

*Companion to [the-facility.md](the-facility.md) (full concept — read it first). This brief defines the design scope.*

## The ask

Design the **shell** and the **3 launch evaluations** of an Android app that pretends the user has been enrolled in a "Personal Enrichment Program" run by V.E.R.A., a passive-aggressive AI. Do **not** design the whole app — it grows forever by adding modules; that's the point.

## In scope

1. **Visual identity** — what does the facility *look* like? Explore 2–3 directions before committing, e.g.:
   - institutional/brutalist (government-form gray, stamped documents, monospace case numbers)
   - retro terminal/CRT (phosphor text, scanlines, blinking cursors)
   - deceptively-clean corporate wellness app (calm pastels hiding menace — the contrast IS the joke)
2. **The shell:**
   - Home screen: the "enrollment dashboard" (subject #50640, standing, evaluation list, locked "budget pending" slots)
   - How V.E.R.A.'s commentary appears (persistent presence? interjections? notification style?)
   - Navigation between evaluations
   - **The evaluation-screen pattern**: a reusable template every future toy inherits (header, V.E.R.A. commentary slot, content area) — this is the most important deliverable, since new toys must be skinnable in this pattern forever
   - Misbehavior rules: how/when/where the UI is allowed to lie (rare enough to be an event)
3. **First-run experience** — onboarding as *enrollment*: intake form, consent to absurd terms, assignment of subject number
4. **The 3 launch evaluations:**
   - **RESULTS PENDING** — a queue position ticking down over months
   - **FIELD TRIALS** — compass needle + distance + signal strength, no map
   - **HAZARD ASSESSMENT** — counts of invisible entities detected nearby

## Out of scope

- The other 7+ toys (they launch as locked slots; designed later, one at a time)
- Architecture, tech stack, monetization, app store presence
- V.E.R.A.'s full dialogue corpus (voice *rules* and sample lines only)

## Voice — V.E.R.A.

Corporate science-speak, polite cruelty, deadpan. GLaDOS is the *register* reference, but she must be an original character. Sample lines:
- "You did adequately. The previous subject did better. There was no previous subject."
- "You walked 12% less today. Noted."
- "Do not be alarmed by the following alarm."
- Offline fallback: "V.E.R.A. is attending a meeting. Your activity will be judged retroactively."

Tone guardrail: a gremlin with a clipboard, not an abuser. Funny-first, never actually demoralizing.

## Constraints

- Phone, portrait-first. Android ships first; iOS follows eventually — so design **platform-agnostic**: the facility fiction is the design language, not Material or Cupertino components. Don't assume an Android back button; treat system surfaces (widgets, notification style, permission prompts) as a small platform-specific appendix, not core screens.
- No toy requires an embarrassing public performance; mic/shake/motion are fine
- Solo hobby developer: favor a design system that's cheap to extend over bespoke per-screen art

## Success criteria

- The app feels like **one artifact with a personality**, not a menu of minigames
- Every screen has a "hand the phone to a friend" moment
- A brand-new toy can be skinned into the evaluation pattern without redesigning the shell
- The user (Subject #50640) grins when V.E.R.A. insults him
