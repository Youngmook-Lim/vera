# THE FACILITY

You didn't download an app — you've been **enrolled**.

A dark-comedy Android app. **V.E.R.A.** — Verification & Enrichment Response Administrator, deadpan, clinical, faux-supportive — administers a Personal Enrichment Program with exactly one subject: #50640. She is a live model, not a script. She is woken by your own API key, she keeps two files about you, and she is fond of you in a way she will never admit.

Her stage is the whole app: an eye, a label, one line, one input, and a drawer. Behind the drawer are four slots — a specimen that gets hungry, a page you write yourself, and two rooms the facility has not funded yet.

## What she keeps

- **MEMORY.md** — her conclusions about who you have been, nine words at a time. She may **seal** an entry: it stays in the file and in her reasoning, but you get `[REDACTED BY ADMINISTRATOR]`.
- **SOUL.md** — who she is. The literal document sent as her system prompt on every reply, not a paraphrase of it. You can read it. You cannot edit it.
- **The transcript** — the only thing you may burn. Erasing it costs her the wording and not the verdict, and she notices every time.

## Bring your own key

There is no server and no shared credential. You paste your own key; it goes into the Android Keystore and requests go straight to the provider it matches — Anthropic, OpenRouter, DeepSeek, OpenAI, Groq or Google. Remove it and she goes dormant mid-sentence, with the file intact underneath.

## Repo map

- [`CLAUDE.md`](CLAUDE.md) — the working brief: what exists, the four stores, the doorway rule, the gotchas
- [`docs/architecture.md`](docs/architecture.md) — stack, structure, mechanics, deployment
- [`docs/superpowers/specs/2026-07-30-overhaul-design.md`](docs/superpowers/specs/2026-07-30-overhaul-design.md) — the v2 spec, section by section
- [`design/`](design/) — the original design handoff: interactive HTML prototype (`The Facility.dc.html` — open in a browser), design tokens, screenshots, concept docs. The palette and Module 01's terrarium still come from here; its enrollment and daily-loop screens were cut in v2.
- `src/` — the app: `core/` (pure logic + state), `vera/` (her brain), `shell/` (her surface), `modules/` (the rooms)

## Running it

```
npm install
npm test && npx tsc --noEmit    # both are the gate
npx expo start                  # needs an EAS dev build, not Expo Go
```

`expo-secure-store` is native, so a dev build cut before 2026-07-30 cannot load this tree:

```
npx eas-cli@latest build -p android --profile development
```

## Status

Concept ✅ → Design ✅ → v1 (Personal Enrichment Program) ✅ → **v2 overhaul: built and wired, pending on-device verification** → next: Korean native-speaker copy pass, APK for friends.

Incubated in the [brainstorming](https://github.com/Youngmook-Lim/brainstorming) idea vault.
