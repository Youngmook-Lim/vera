@AGENTS.md

# The Facility

Dark-comedy Android app. **V.E.R.A.** — a deadpan, faux-supportive AI administrator — owns the whole screen. She is a live model woken by the subject's own API key, she keeps two files, and she has opinions about you. React Native + Expo (TypeScript), Android-first, bilingual en/ko.

**Read first:** `docs/superpowers/specs/2026-07-30-overhaul-design.md` (the v2 spec — every section number cited in code comments points here) · `docs/architecture.md` (stack, structure, mechanics) · `design/README.md` + `design/The Facility.dc.html` (the v1 pixel-final prototype; still the source for the palette and for Module 01's terrarium, but its enrollment/daily screens are gone).

## Where the build is

**v2 is complete and wired** (branch `v2-overhaul`, plan: `docs/superpowers/plans/2026-07-30-overhaul.md`, 18 tasks). The v1 Personal Enrichment Program — enrollment, daily compliance, streak, standing, transmission log, settings, and the results / incinerator / field / hazard modules — was **deleted** in Task 8. What remains is her, one specimen, one room you write yourself, and two empty slots.

Not yet done: a new EAS dev build (see below), on-device verification of the whole loop, and a Korean native-speaker copy pass.

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

**The six accepted key shapes (spec §9), order significant** — DeepSeek's pattern is a strict subset of OpenAI's, so it must be tested first:

| label | pattern | model |
|---|---|---|
| ANTHROPIC | `^sk-ant-` | `claude-sonnet-4-5` |
| OPENROUTER | `^sk-or-` | `anthropic/claude-sonnet-4.5` |
| DEEPSEEK | `^sk-[0-9a-f]{32}$` | `deepseek-chat` |
| OPENAI | `^sk-(proj-)?[A-Za-z0-9_-]{20,}$` | `gpt-4o-mini` |
| GROQ | `^gsk_` | `llama-3.3-70b-versatile` |
| GOOGLE | `^AIza` | `gemini-2.0-flash` |

GROQ is Groq the inference provider, not xAI's Grok. Anything under 8 characters, containing whitespace, or matching none of the six is refused at the gate. The accepted consequence: a **valid** key from an unlisted provider (Mistral, Together, xAI) is refused too. Requests go straight from the device to the matched provider — there is no server in this project. A key on the device is readable by anyone holding the phone; it is the subject's own.

## Conventions & gotchas

- All copy verbatim from `T` in `src/shell/strings.ts` (and each module's own `strings.ts`); all hex from `palette` in `src/core/theme.ts`. Don't "improve" either, and don't add strings the design doc doesn't have.
- Verify with `npm test` and `npx tsc --noEmit`. Jest is pinned to 29 (jest-expo 57 requires it); RTL v14 is fully async (`await render(...)`, `await fireEvent.press(...)`, **`await view.unmount()`** — omitting that last one causes overlapping `act()` and `toJSON()` returning null); jest uses the `react-native-worklets/jest/resolver.js` resolver.
- **No test may make a real network request.** Mock `src/vera/llm.ts` with a `jest.requireActual` spread so `AuthError` stays a real class for `speech.ts`'s `instanceof`, and mock `expo-secure-store` with an in-memory vault (the OS keystore has no jsdom implementation).
- Skia can't run in jest (jsdom); it's mocked as a no-op Proxy in `jest.setup.ts`. **Never put logic inside a Skia component** — it is invisible to tests. Skia now carries two things: the optic (`Optic.tsx`, continuous animation) and Specimen-03's blob (`modules/organism/Blob.tsx`).
- **`expo-secure-store` is native and the two new fonts are new assets, so the dev build installed before 2026-07-30 cannot load v2.** A new `npx eas-cli@latest build -p android --profile development` is required before v2 runs on the phone. Profiles live in `eas.json` (Android APK, `internal` distribution, node pinned 24.14.1). Run with `npx expo start` (auto-detects `expo-dev-client`).
- **`expo-notifications` is gone**, along with `@react-native-community/slider`. There are no notifications, no permission ceremony, and no background work of any kind in v2 — the daily loop that justified them was deleted.
- **`.npmrc` (committed) pins `legacy-peer-deps=false`** — a global `~/.npmrc` with legacy-peer-deps=true silently drops `@react-native/babel-preset` + its metro/hermes peer subtree from the lockfile, which breaks EAS Build's strict `npm ci`. Keep it; don't regenerate the lock with legacy-peer-deps on.
- No navigation library (conditional render on `view` **is** the router), no raster UI assets, fonts bundled locally (no CDN).
- Repo style is single quotes. An editor formatter here has previously reformatted files to double quotes — don't let it.
