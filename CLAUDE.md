@AGENTS.md

# The Facility

Dark-comedy Android app. **V.E.R.A.** — a deadpan, faux-supportive AI administrator — owns the whole screen. She is a live model woken by the subject's own API key, she keeps two files, and she has opinions about you. React Native + Expo (TypeScript), Android-first, bilingual en/ko.

**Read first:** `design/The Facility - Overhaul.dc.html` — **the v2 prototype, and the authority on every pixel.** The spec below is a *derivation* of it and is wrong in places (it gives module tiles a 12px radius; the design uses 14px). Implementation target is turn **4a** (the live prototype — its own runtime lives in a `<script type="text/x-dc">` block near the end, holding the `EM` emotion table and `applyEmotion`), with the optic from turn **3a**, since 4a's stage eye carries no lid at all. Sections are `<section class="dv-turn" id="tN">`, options `<div class="dv-opt" id="4a">`.

Pulled from Claude Design project `bc25a219-1ba4-4fef-9978-f21c0e6596dd` ("Overhauling VERA's design") with the `DesignSync` tool. **`list_projects` will not show it** — that method filters to design-system projects and this is a plain one; go straight to `get_project` / `list_files` / `get_file` with the UUID.

Then: `docs/superpowers/specs/2026-07-30-overhaul-design.md` (the v2 spec — every section number cited in code comments points here) · `docs/architecture.md` (stack, structure, mechanics) · `design/The Facility.dc.html` (the v1 prototype; still the source for Module 01's terrarium, but its enrollment/daily screens are gone).

**The hover rule.** The prototype is a web page and states several controls twice — a resting colour and a `style-hover` one. A touch screen has no hover, so every such pair is resolved to the **hover** value (see the note at the top of `src/core/theme.ts`). Don't "fix" these back to the resting colour.

## Where the build is

**v2 is complete and wired** (branch `v2-overhaul`, plan: `docs/superpowers/plans/2026-07-30-overhaul.md`, 18 tasks). The v1 Personal Enrichment Program — enrollment, daily compliance, streak, standing, transmission log, settings, and the results / incinerator / field / hazard modules — was **deleted** in Task 8. What remains is her, one specimen, one room you write yourself, and two empty slots.

A v2 dev build is on the phone, and the optic was signed off against it on **2026-08-11** — the lids, the drift, the blink, the catchlight and the type ladder are confirmed in the hand, not only in the tests. That matters more than usual here: the eye is Skia driven by reanimated, both no-ops under jest, so nothing about how it *looks* can be caught by `npm test`.

Not yet done: on-device verification of the rest of the loop, and a Korean native-speaker copy pass.

## What exists

- `src/core/` — `theme.ts` (v2 palette + emotion hues; `ms()` = mock px ×1.1 **for type only**, layout is 1:1; `font(role, weight, lang)`, `serif(lang)` for her voice), `i18n.ts` (`Lang`, `Strings<T>`, `tmpl()`), `fluid.ts` (word count → font size + line height, two ladders), `storage.ts` (the four stores), `speech.ts` (the whole reply cycle with the network injected), `store.ts` (Zustand; `view` is the router, plus `speak`, `activate`, `removeKey`, `clearTranscript`, `setLang`, `feedSpecimen`, `stepBack`, `hydrate`)
- `src/vera/` — `soul.ts` (SOUL.md verbatim, sent as her system prompt every reply), `emotions.ts` (nine states: dormant + eight, each carrying the optic's geometry and tempo), `providers.ts` (key-shape matching + request building), `llm.ts` (fetch + normalising three API response shapes; `AuthError` is its own class), `context.ts` (what she is told about this moment), `speak.ts` (prompt assembly, JSON extraction, impression clamp), `fallback.ts` (authored lines for when the model is unreachable — she never shows an error in place of a line)
- `src/shell/` — `ScreenRouter.tsx` (the view switch + hardware back + both overlays), `Stage.tsx` (her screen), `Optic.tsx` + `opticGeometry.ts` (the Skia eye; every number comes out of the pure module), `Cabinet.tsx`, `KeyGate.tsx`, `KeyPanel.tsx`, `LogScreen.tsx`, `SystemScreen.tsx`, `FileScreen.tsx`, `strings.ts` (the `T` table, en/ko)
- `src/modules/` — `registry.ts` (four slots: 01 organism, 02 identity, 03/04 empty), `organism/` (Specimen-03, dark green terrarium, Skia blob), `identity/` (bone paper, the one room the subject writes)

Pure decision-making modules (`fluid`, `emotions`, `providers`, `llm`, `context`, `speak`, `speech`, `opticGeometry`, `hunger`, `identity`) are unit-tested and have no React in them. **Components render and dispatch, nothing more.**

## The shape of it

**Views:** `stage` · `log` · `sys` · `mem` · `soul` · `mod01` · `mod02`. **Overlays:** the cabinet drawer and the ACCESS key panel — both owned by `ScreenRouter`, both sitting on top of whatever view is showing.

**Android hardware back** (`stepBack()` in the store) is one step out, never a jump: an open overlay closes first and the view stays put · `mem`/`soul` → `sys` · `sys`/`log`/`mod01`/`mod02` → `stage` · on `stage` it returns `false`, which is the signal to let the OS exit.

**The doorway rule (spec §4).** Modules are rooms in her building, not screens in her app. The shell owns exactly four things: the tile (identical geometry in the cabinet, painted in the module's own colours), full bleed inside, one exit (top-left, 44px, drawn in the module's own ink — never the shell's amber), and her dot. Everything past the threshold belongs to the module. A new module is **one folder exporting a `ModuleDef` plus one line in `registry.ts`** — both `Cabinet.tsx` and `ScreenRouter.tsx` read the registry, neither names a module.

**The four stores (spec §8).**

| store | key | engine | contents |
|---|---|---|---|
| soul | `facility.v2.soul` | AsyncStorage | mem (6), visits, day, lastOpen, hunger, lastFed, lang, imps (24), cleared |
| transcript | `facility.v2.transcript` | AsyncStorage | the chat log, capped at 60 |
| module 02 | `facility.mod02.identity` | AsyncStorage | title, lines, revs, month |
| credential | `facility.v2.credential` | **SecureStore** | the key |

Module 02 owns its own store — it has nothing to do with her soul or the transcript, and she is not told what is in it. **MEMORY.md is never written to disk as text**: `FileScreen` composes it at render time out of `impressions`. **SOUL.md is read-only** and is the literal system prompt, not a paraphrase of it. The transcript is the only thing the subject can erase, and erasing it costs her the wording, never the verdict.

**The five accepted key shapes (spec §9), order significant** — every `sk-` shape below also satisfies OpenAI's pattern (its class includes the hyphen, and 32 hex digits are alphanumerics), so anthropic, openrouter and deepseek must all be tested before it:

| label | pattern | model |
|---|---|---|
| ANTHROPIC | `^sk-ant-` | `claude-sonnet-4-5` |
| OPENROUTER | `^sk-or-` | `anthropic/claude-sonnet-4.5` |
| DEEPSEEK | `^sk-[0-9a-f]{32}$` | `deepseek-chat` |
| OPENAI | `^sk-(proj-)?[A-Za-z0-9_-]{20,}$` | `gpt-4o-mini` |
| GOOGLE | `^(AIza\|AQ\.)` | `gemini-2.5-flash-lite` |

Groq was dropped (2026-08-07); the spec's §9 table still lists all six and is out of date on this point and on the Gemini rows below.

**Two Gemini gotchas, both live.** Google is migrating keys from `AIza` (standard) to `AQ.Ab…` (auth, service-account-bound): AI Studio issues **only** the new form now, and from **September 2026** the API rejects standard keys outright — so a gate matching only `^AIza` refuses every key a subject can currently create. And `gemini-2.0-flash` is **shut down**; `gemini-2.5-flash-lite` is the replacement and is the one 2.5 model with **thinking off by default**, which matters because a thinking model would spend the 300-token budget on thoughts and return no text. `llm.ts` also filters out response parts marked `thought` so reasoning is never spoken as her line. A retired model 404s rather than 401s, so it never raises `AuthError` — she just falls back to an authored line forever and looks alive. A test pins the model id for that reason.

Anything under 8 characters, containing whitespace, or matching none of the five is refused at the gate. The accepted consequence: a **valid** key from an unlisted provider (Mistral, Together, xAI, Groq) is refused. Requests go straight from the device to the matched provider — there is no server in this project. A key on the device is readable by anyone holding the phone; it is the subject's own.

## Conventions & gotchas

- All copy verbatim from `T` in `src/shell/strings.ts` (and each module's own `strings.ts`); all hex from `palette` in `src/core/theme.ts`. Don't "improve" either, and don't add strings the design doc doesn't have.
- Verify with `npm test` and `npx tsc --noEmit`. Jest is pinned to 29 (jest-expo 57 requires it); RTL v14 is fully async (`await render(...)`, `await fireEvent.press(...)`, **`await view.unmount()`** — omitting that last one causes overlapping `act()` and `toJSON()` returning null); jest uses the `react-native-worklets/jest/resolver.js` resolver.
- **No test may make a real network request.** Mock `src/vera/llm.ts` with a `jest.requireActual` spread so `AuthError` stays a real class for `speech.ts`'s `instanceof`, and mock `expo-secure-store` with an in-memory vault (the OS keystore has no jsdom implementation).
- Skia can't run in jest (jsdom); it's mocked as a no-op Proxy in `jest.setup.ts`. **Never put logic inside a Skia component** — it is invisible to tests. Skia now carries two things: the optic (`Optic.tsx`, continuous animation) and Specimen-03's blob (`modules/organism/Blob.tsx`).
- **`expo-secure-store` is native and the two new fonts are new assets, so a dev build installed before 2026-07-30 cannot load v2.** The one on the phone is current. Build another with `npx eas-cli@latest build -p android --profile development`, and expect to need one whenever a native dependency moves — `npx expo install --check` currently wants patch bumps to `react-native`, `reanimated`, `react-native-worklets`, `expo-dev-client` and `expo-splash-screen`, deferred on 2026-08-11 so as not to invalidate a working build mid-verification. Profiles live in `eas.json` (Android APK, `internal` distribution, node pinned 24.14.1). Run with `npx expo start` (auto-detects `expo-dev-client`).
- **`expo-notifications` is gone**, along with `@react-native-community/slider`. There are no notifications, no permission ceremony, and no background work of any kind in v2 — the daily loop that justified them was deleted.
- **`.npmrc` (committed) pins `legacy-peer-deps=false`** — a global `~/.npmrc` with legacy-peer-deps=true silently drops `@react-native/babel-preset` + its metro/hermes peer subtree from the lockfile, which breaks EAS Build's strict `npm ci`. Keep it; don't regenerate the lock with legacy-peer-deps on.
- No navigation library (conditional render on `view` **is** the router), no raster UI assets, fonts bundled locally (no CDN).
- Repo style is single quotes. An editor formatter here has previously reformatted files to double quotes — don't let it.
