@AGENTS.md

# The Facility

Dark-comedy Android app: the user is "enrolled" in a Personal Enrichment Program overseen by V.E.R.A., a deadpan faux-supportive AI. React Native + Expo (TypeScript), Android-first, bilingual en/ko.

**Read first:** `docs/architecture.md` (stack, structure, mechanics, build order) · `design/README.md` + `design/The Facility.dc.html` (pixel-final design spec; per-screen PNGs in `design/screenshots/`).

## Build progress

Phases per the build order in `docs/architecture.md`. Update this list when a phase merges.

- [x] **Phase 1 — Scaffold + theme + shell skeleton** (merged to main 2026-07-15; plan: `docs/superpowers/plans/2026-07-15-phase-1-shell-skeleton.md`)
- [x] **Phase 2 — Enrollment flow** (intake → baseline → consent → assigned → permission) + first-run gate (AsyncStorage behind `core/storage.ts`; mmkv deferred by choice — merged 2026-07-18)
- [x] **Phase 3 — Daily loop** + streak/standing + missed-day + local notifications (notifications no-op under Expo Go — dev build still postponed; merged 2026-07-20, with enrollment polish: editable designation, blinking cursor, on-screen decline dodge, back-steps through enrollment)
- [x] **Phase 4 — Modules, one at a time:** results ✅ → incinerator ✅ → organism ✅ → field ✅ → hazard ✅ (all placeholder Screens replaced). `results` done (live queue ticker + drift-on-open — plan: `docs/superpowers/plans/2026-07-20-phase-4-results-module.md`); `incinerator` done (grievance burn, SVG+Reanimated flame, persisted counter from 0 — plan: `docs/superpowers/plans/2026-07-21-phase-4-incinerator-module.md`); `organism` done (**first Skia module** — morphing blob via `usePathValue`+`useClock`; verified on the dev build — plan: `docs/superpowers/plans/2026-07-23-phase-4-organism-module.md`); `field` done (**fake hold-to-walk** — SVG compass + homing needle, arrival guard; NO GPS/sensors/network — plan: `docs/superpowers/plans/2026-07-23-phase-4-field-module.md`). Two real-vs-fake pivots this phase: organism dropped device steps → tap-to-feed (Android has no historical step API via expo-sensors — `getStepCountAsync` is iOS-only; Health Connect too heavy); field dropped GPS/Overpass → fake hold-to-walk (real GPS fights the absurd-directive comedy + brutal outdoor dev loop). results/incinerator/field are SVG (no Skia); only organism uses Skia so far. `hazard` done (last module — **SVG + Reanimated**, not Skia: radar sweep + drifting blips + a fixed 4-entity census; passive screen, no user interaction, no optic eye per the pixel-final design — plan: `docs/superpowers/plans/2026-07-27-phase-4-hazard-module.md`). **Phase 4 complete.**
- [ ] **Phase 5 — Polish:** ~~transmission log~~ ✅ · ~~settings~~ ✅ (both merged 2026-07-27 — plan: `docs/superpowers/plans/2026-07-27-phase-5-settings-notiflog.md`; settings = language switch + re-process full-wipe + real notifications toggle; notiflog = 5 authored cards, back→settings), Korean native-speaker copy pass, EAS build for friends

## What exists (after phase 1)

- `src/core/` — `theme.ts` (design tokens; `ms()` = mock px ×1.1 for type, layout 1:1; `font(role, weight, lang)` picks Pretendard for ko), `i18n.ts` (`Lang`, `Strings<T>`, `tmpl()`), `store.ts` (Zustand; single `step` value is the router; `hydrate()` boot gate decides intake vs. facility), `storage.ts` (AsyncStorage seam; callers never import the engine directly), `compliance.ts` (pure date math: streak/standing/missed detection), `notifications.ts` (pure planner + Expo Go-gated executor)
- `src/shell/` — `FacilityScreen` (launcher home), `ScreenRouter` (conditional render IS the router; Android hardware back → facility, consumed during enrollment), `PlaceholderScreen`, `components/VeraPanel` (pulsing LIVE card), `strings.ts`, `enrollment/` (five screens: Intake, Baseline, Consent, Assigned, Permission), `daily/` (DailyScreen with hold-to-comply ring + random audits, MissedScreen with petition flow)
- `src/modules/` — registry contract: five module folders with final tiles + placeholder Screens, two `locked: true` vitrines. New module = new folder exporting `ModuleDef` + one line in `registry.ts`
- `src/vera/` — `getTransmission(context)`: authored corpus now, LLM-swappable later; callers never know

## Conventions & gotchas

- All copy verbatim from the prototype `STR.en`/`STR.ko` tables; all hex values from `design/README.md`. Don't "improve" either.
- Verify with `npm test` and `npx tsc --noEmit`. Jest is pinned to 29 (jest-expo 57 requires it); RTL v14 is fully async (`await render(...)`, `await fireEvent.press(...)`, no global `screen`); jest uses the `react-native-worklets/jest/resolver.js` resolver.
- **A dev build now exists (as of 2026-07-23) — Skia is enabled and the app on the phone is the EAS dev build, NOT Expo Go.** Run the app with `npx expo start` (auto-detects `expo-dev-client`; hot reload preserved). `@shopify/react-native-skia` 2.6.2 is installed and verified on-device. EAS `development`/`preview` profiles live in `eas.json` (Android APK, `internal` distribution, node pinned 24.14.1); build with `npx eas-cli@latest build -p android --profile development`. Consequence: `expo-notifications` is now REAL on-device (the enrollment permission screen fires the genuine OS dialog), no longer a no-op.
- **`.npmrc` (committed) pins `legacy-peer-deps=false`** — a global `~/.npmrc` with legacy-peer-deps=true silently drops `@react-native/babel-preset` + its metro/hermes peer subtree from the lockfile, which breaks EAS Build's strict `npm ci`. Keep it; don't regenerate the lock with legacy-peer-deps on.
- Skia can't run in jest (jsdom); it's mocked as a no-op Proxy in `jest.setup.ts`, so Skia-importing modules stay testable.
- Earlier phases stayed Expo Go-runnable by choice (mmkv deferred phase 2); the skia trigger finally landed at the organism module (phase 4). Results + incinerator were built WITHOUT skia (SVG gradient art).
- `expo-notifications` cannot even be *imported* under Expo Go on Android (its native modules were removed in SDK 53; a top-level import kills the bundle at startup). Keep it lazy-`require()`d behind `isRunningInExpoGo()` — see `PermissionScreen.onAllow`. Phase 3's local notifications need the same gating or the dev build.
- No navigation library, no raster UI assets, fonts bundled locally (no CDN).
