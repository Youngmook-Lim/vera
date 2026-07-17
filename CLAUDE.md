@AGENTS.md

# The Facility

Dark-comedy Android app: the user is "enrolled" in a Personal Enrichment Program overseen by V.E.R.A., a deadpan faux-supportive AI. React Native + Expo (TypeScript), Android-first, bilingual en/ko.

**Read first:** `docs/architecture.md` (stack, structure, mechanics, build order) · `design/README.md` + `design/The Facility.dc.html` (pixel-final design spec; per-screen PNGs in `design/screenshots/`).

## Build progress

Phases per the build order in `docs/architecture.md`. Update this list when a phase merges.

- [x] **Phase 1 — Scaffold + theme + shell skeleton** (merged to main 2026-07-15; plan: `docs/superpowers/plans/2026-07-15-phase-1-shell-skeleton.md`)
- [ ] **Phase 2 — Enrollment flow** (intake → baseline → consent → assigned → permission) + first-run gate (mmkv)
- [ ] **Phase 3 — Daily loop** + streak/standing + missed-day + local notifications
- [ ] **Phase 4 — Modules, one at a time:** results → incinerator → organism → field → hazard (replace placeholder Screens; Skia centerpieces, sensors)
- [ ] **Phase 5 — Polish:** transmission log, settings, Korean native-speaker copy pass, EAS build for friends

## What exists (after phase 1)

- `src/core/` — `theme.ts` (design tokens; `ms()` = mock px ×1.1 for type, layout 1:1; `font(role, weight, lang)` picks Pretendard for ko), `i18n.ts` (`Lang`, `Strings<T>`), `store.ts` (Zustand; single `step` value is the router; boots straight to `'facility'` until the phase 2 gate)
- `src/shell/` — `FacilityScreen` (launcher home), `ScreenRouter` (conditional render IS the router; Android hardware back → facility), `PlaceholderScreen`, `components/VeraPanel` (pulsing LIVE card), `strings.ts`
- `src/modules/` — registry contract: five module folders with final tiles + placeholder Screens, two `locked: true` vitrines. New module = new folder exporting `ModuleDef` + one line in `registry.ts`
- `src/vera/` — `getTransmission(context)`: authored corpus now, LLM-swappable later; callers never know

## Conventions & gotchas

- All copy verbatim from the prototype `STR.en`/`STR.ko` tables; all hex values from `design/README.md`. Don't "improve" either.
- Verify with `npm test` and `npx tsc --noEmit`. Jest is pinned to 29 (jest-expo 57 requires it); RTL v14 is fully async (`await render(...)`, `await fireEvent.press(...)`, no global `screen`); jest uses the `react-native-worklets/jest/resolver.js` resolver.
- Stay Expo Go-runnable until a phase truly needs mmkv (phase 2) or skia (phase 4) — those force a dev build. The user's phone runs Expo Go 57 from the direct APK (Play Store lags behind).
- No navigation library, no raster UI assets, fonts bundled locally (no CDN).
