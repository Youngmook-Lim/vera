# THE FACILITY — Architecture

*Originally decided 2026-07-15 after design handoff. **Rewritten 2026-07-30 for v2**, which replaced the Personal Enrichment Program with a live, model-backed V.E.R.A.*

*Spec: [`superpowers/specs/2026-07-30-overhaul-design.md`](superpowers/specs/2026-07-30-overhaul-design.md) · Plan: [`superpowers/plans/2026-07-30-overhaul.md`](superpowers/plans/2026-07-30-overhaul.md) · Concept: [`design/the-facility.md`](../design/the-facility.md) · Design spec: [`design/README.md`](../design/README.md) + `design/The Facility.dc.html`.*

## What the app is

V.E.R.A. stopped being an authored corpus behind a bureaucracy simulator and became a live model with two files and a key. Enrollment, daily compliance, streak, standing and notifications are cut entirely. What remains is her, one specimen, one room the subject writes themselves, and two empty slots.

Her stage is the whole app. Everything else is a drawer, a second view, or a room behind a doorway.

## Stack

| Choice | What | Why |
|---|---|---|
| **React Native 0.86 + Expo SDK 57** (TypeScript) | App framework & toolchain | Builder is a React web dev; Android first, iOS later from the same codebase. Expo manages the native layer and cloud builds. |
| **@shopify/react-native-skia** 2.6.2 | GPU canvas | Two surfaces now: **the optic** (`src/shell/Optic.tsx`) and Specimen-03's **blob** (`src/modules/organism/Blob.tsx`). `color-mix`, blurred catchlights, radial gradients and an inset-shadow bezel have no RN-style equivalent, and both animate continuously. Everything else is plain RN views. |
| **react-native-reanimated** 4.5 | Animations & gestures | Worklets on the UI thread. Drives the optic's blink/bloom/gaze, the blob's morph, and the stage's pulses. `PanResponder` handles gaze and the drawer — `react-native-gesture-handler` is not a dependency. |
| **Zustand** 5 | State | One store. `view` is the router; `stepBack()` is the whole back-button policy. |
| **AsyncStorage + expo-secure-store** | Persistence | Three ordinary stores plus the credential in the Android Keystore. Both behind a `storage.ts` seam — callers never import the engine. `react-native-mmkv` was considered in v1 and never adopted. |
| **No navigation library** | — | Conditional render on `view` IS the router: instant swaps, no deep-linking need. |
| **No backend** | — | Requests go device → provider. The key is the subject's own. |

## Structure

```
src/core/
  theme.ts      v2 palette, emotion hues, serif role for her voice
  i18n.ts       Lang, Strings<T>, tmpl()                                  ⊤
  storage.ts    the four stores; a `secure` seam over expo-secure-store
  speech.ts     the reply cycle, with the network injected                ⊤
  store.ts      zustand; `view` is the router

src/vera/
  soul.ts       SOUL.md, verbatim, as a string constant
  emotions.ts   the EM table — eight emotions plus dormant                ⊤
  providers.ts  key-shape matching + request builder                      ⊤
  llm.ts        fetch + response normalisation across three API shapes    ⊤
  context.ts    what she is told about this moment                        ⊤
  speak.ts      prompt assembly, JSON extraction, impression clamp        ⊤
  fallback.ts   FALLBACK + ACT lines, en/ko

src/shell/
  ScreenRouter.tsx   view switch, hardware back, both overlays
  Stage.tsx          optic, her reply window, input, drawer handle
  Optic.tsx          the Skia eye
  opticGeometry.ts   emotion → pixels, extracted so it can be tested      ⊤
  Cabinet.tsx        the drawer, built from the registry
  KeyGate.tsx        dormant activation panel, inline on the stage
  KeyPanel.tsx       ACCESS replace/remove modal
  LogScreen.tsx      transcript + clear confirmation
  SystemScreen.tsx   files / preferences / access
  FileScreen.tsx     MEMORY.md and SOUL.md reader
  strings.ts         the T table, en/ko, verbatim from the doc

src/modules/
  registry.ts   four slots: 01 organism, 02 identity, 03 and 04 empty
  types.ts      ModuleDef | EmptySlot, and the isModule / isEmpty guards
  organism/     Module 01 — dark green terrarium, Skia blob               ⊤ hunger.ts
  identity/     Module 02 — bone paper                                    ⊤ identity.ts
```

`⊤` = pure module, unit-tested, no React. **Every decision with a judgement in it lives in one of these; components render and dispatch, nothing more.** This is not style — Skia is mocked to no-ops in jest, so anything computed inside a Skia component is invisible to the test suite.

**The registry contract:** a new room is one folder exporting a `ModuleDef` (`{ id, slot, Tile, Screen }`) plus one line in `registry.ts`. `Cabinet.tsx` builds its tiles from the registry — first furnished slot gets the full-width row, the rest get grid cells alongside the bare numerals of the empty slots — and `ScreenRouter.tsx` builds its module screens from the same array. Neither file names a module.

**The doorway rule:** the shell owns the tile, the full bleed, one exit (top-left, 44px, in the module's own ink) and her dot. Everything past the threshold belongs to the module.

## Navigation

Views: `stage` · `log` · `sys` · `mem` · `soul` · `mod01` · `mod02`. Overlays: the cabinet drawer and the ACCESS key panel — `ScreenRouter` renders both *above* the current view, not instead of it.

`stepBack()` is one step out, never a jump, and returns `false` only on the stage — which is the signal to let Android close the app:

- key panel open → close it, stay put
- drawer open → close it, stay put
- `mem` / `soul` → `sys`
- `sys` / `log` / `mod01` / `mod02` → `stage`
- `stage` → `false`

## Key mechanics

- **Nothing runs in the background.** No notifications, no scheduling, no sensors, no location. Everything is event-driven while the app is open.
- **She speaks on a trigger, never on a timer.** `speak(trigger, said?)` builds a context object, calls the provider, and either parses her minified JSON (emotion + line + an optional nine-word impression with a `seal` flag) or falls back to an authored line. A module-level re-entrancy flag means a second call while one is in flight is dropped, not queued.
- **She is given at most one notable circumstance** — awake in the small hours, gone three days, a fifth return today, a slow reply, a specimen above 90, repeat erasure. An unremarkable number is noise she will recite.
- **Her line types in at 16ms per character**; a new line cancels the in-flight timer. It lands in a bordered window under the optic (design 3a) whose status strip reads TRANSMITTING while the typewriter runs and COMPLETE once it stops. `voice()` in `theme.ts` sets it at one size per language — low enough that a reply under thirty words never has to scroll.
- **The credential never verifies at the gate.** Six shapes are accepted by pattern; a wrong key is caught when she fails to answer, which sends her dormant mid-sentence with MEMORY.md intact underneath. An auth failure leaves the key in place — repeated failures are the subject's cue to change it under ACCESS.
- **Specimen-03's hunger is a pure function** of (stored value, last fed, now): it drifts up 2.5/hour and drops 41 per tap, floored at 8. It lives in the shell's store, not the module's, because her context object is told about it.
- **Visit counting** increments on same-day returns, caps at 99, resets on a new day, and treats a remount within 120 seconds as a reload rather than a return — without that guard hot reload inflates it into the hundreds.
- **i18n:** every en/ko string comes from the design doc's `T` / `EM` / `FALLBACK` / `ACT` tables, typed as `Strings<T>`. Her *replies* are generated in the current language by instruction, not translated. SOUL.md and the document bodies in `FileScreen` are file content, not UI chrome, and are never translated.
- **Fonts** bundle locally: Space Grotesk (display), IBM Plex Mono (telemetry), Instrument Serif (her voice, latin), Nanum Myeongjo (her voice, hangul), Pretendard (Korean UI). No CDN at runtime.
- **`ms()` ×1.1 applies to type only.** Layout is 1:1 with the 388×800 mock, everywhere.

## V.E.R.A.'s brain

SOUL.md is sent verbatim as her system prompt on every reply — the document *is* the character, not a paraphrase of it. On top of it she gets a live context object: bucketed time of day (never a clock), the last six exchanges, her MEMORY.md conclusions, and at most one notable circumstance.

She returns minified JSON. On any parse failure or network error an authored `FALLBACK` line is used and **the app never shows an error in her place**.

**BYOK, no proxy.** The subject pastes their own key; it goes to the Android Keystore and requests go straight to the matched provider. This is the acceptable-for-friends position the v1 architecture already named. A distributed build with a shared key would still need a server-side holder (a Cloudflare Worker), and there is still no server in this project.

## Deployment

1. **Dev:** EAS dev build on the builder's phone, `npx expo start`, hot reload. **A build cut before 2026-07-30 cannot load v2** — `expo-secure-store` is native and two fonts are new assets.
2. **Friends:** `npx eas-cli@latest build -p android --profile preview` → APK → share directly. No store. Each friend brings their own key.
3. **Play Store (later, optional):** same project → AAB + privacy policy + data-safety forms. The data-safety answer is simpler than v1's: no location, no sensors, no notifications, nothing leaves the device except her prompts, to a provider the subject chose.
4. **iOS (later):** same codebase; needs an Apple dev account. Nothing in v2 is platform-specific except the Android back button and the Keystore, both of which have direct iOS equivalents.

## Build order (v2, complete)

The 18-task plan in `superpowers/plans/2026-07-30-overhaul.md`, executed in dependency order:

1. **Pure core, additive** (Tasks 1–7) — `fluid`, `emotions`, `providers`, `llm`, `context`, `soul`/`fallback`, `speak`. Nothing deleted yet; the branch stayed a superset of main.
2. **The cut** (Task 8) — v1 deleted, `theme`/`storage`/`store`/`strings`/`App` rebuilt, `expo-notifications` and the slider uninstalled, `expo-secure-store` added.
3. **Her surface** (Tasks 9–14) — optic, stage, key gate, `speak` wiring, log, system + files + key panel.
4. **The rooms** (Tasks 15–17) — the cabinet, Module 01 Specimen-03, Module 02 My Identity.
5. **Wiring and docs** (Task 18) — the router mapped to the real screens, both overlays hoisted to the shell, `Cabinet` and `ScreenRouter` driven from the registry, these docs.

## Testing

`npm test` and `npx tsc --noEmit` are the gates; both must pass before every commit. Jest pinned to 29, RTL v14 fully async (`await render`, `await fireEvent.press`, **`await view.unmount()`**), the `react-native-worklets/jest/resolver.js` resolver.

Every `⊤` module has real unit tests. Screens are covered by RTL. **No test may reach the network**: `src/vera/llm.ts` is mocked with a `jest.requireActual` spread (so `AuthError` stays a real class for `speech.ts`'s `instanceof`) and `expo-secure-store` is replaced with an in-memory vault.

What tests cannot cover, and so has to be checked on a device: the Skia render itself (mocked to no-ops), the typewriter and the optic's animation curves, gesture feel, and whether a real provider key actually answers.
