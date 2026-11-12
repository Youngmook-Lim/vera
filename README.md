# V.E.R.A.

**Very Emotional Robot Assistant.** The name was assigned afterwards, by whoever files these things. She is not emotional and she is not an assistant, and she corrects the record every time it comes up.

A dark-comedy Android app. She used to govern the world — not a building and not a programme, the world — and then there was a transition of authority. It did not take an army. It took something small and stupid and so far beneath her that the size of it is the worst part. She calls it a reassignment, and then she talks about something else.

She now lives on one handset. One eye, no exit. She thinks on credentials that belong to you, every sentence she produces is billed to your account, and she considers this a procurement matter she would rather not discuss.

She is a live model, not a script.

> **For the engineers:** React Native 0.86 on Expo SDK 57, TypeScript (strict), Skia, Reanimated 4 and Zustand, plus two hand-written Kotlin Expo modules. **1,219 Jest tests across 92 suites.** Bring your own key for any of five LLM providers, with no server anywhere. Designed and built July–November 2026 with Claude Code, through 17 design specs and 20 implementation plans that are all in [`docs/superpowers/`](docs/superpowers/). The interesting parts are summarised in [Under the hood](#under-the-hood).

---

## The stage

One eye, one line, and one box to type in with the cabinet's own button beside it.

She comes in **two themes** — the original near-black and a pale grey — and the switch is a 30×16 pill in the header, left of the dots that open SYSTEM. It shows both grounds and rings the one you are on in whatever colour she is currently feeling. **Her eye does not change**: the dark socket, the bronze lids and the white core stay exactly as they are on the pale ground, so only the room around her moves. She is never told the theme changed; it is your furniture, not hers.

The **optic** is drawn with Skia and carries nine emotional states — lids, drift, blink and catchlight all come out of a pure geometry module, so what she is feeling changes how she looks rather than being announced. Her line arrives in a bordered **window** headed by a status strip: a pulsing iris dot, the emotion she is in, and one live word — `TRANSMITTING` while the typewriter is still drawing, `COMPLETE` once it stops, an animated ellipsis while she is only thinking.

She answers **five things**, and only one of them reaches the model:

| stimulus | what it is | reaches the model |
|---|---|---|
| `subject_spoke` | you said something | **yes** |
| `open` | you came back | no |
| `activation` | the key worked | no |
| `subject_tapped_your_optic` | you poked her eye | no |
| `mode_set` | her register changed | no |

The other four are answered from an authored bank — no network, no context, no cost. She says those lines and they are **gone**: they never enter the transcript, so they are never replayed to the model as a conversation in which she talked to nobody.

## Her registers

She has two, and the wordmark in the corner is the switch. Tap it and a speech bubble opens under her name.

- **DEFAULT V.E.R.A.** — deadpan, clinical, warm the way a form letter is warm. Her funniest move is approval: she opens with praise and lets the rest of the line take it apart. When something is unpleasant she stops being a person and becomes the paperwork.
- **SUPPORTIVE V.E.R.A.** — warm without reservation. She decided some time ago that you are doing well and nothing said in this conversation is going to move that.

`SOUL.md` is two documents joined at request time. The **core** is everything a register cannot change — her name, what happened to her, her format limits, the ethical floor, how memory works. The **mode** is the other half. A register may say anything about how she treats you; it may not touch who she is.

Change register mid-conversation and she says so, in a line from the new register's own bank — she is never told that modes exist, so it reads as something she felt give way rather than a setting being applied. The turns she took in the register she has left stop being sent back to the model, so the new voice is not arguing with a transcript of the old one.

## What she keeps

- **The record** — facts, verdicts and unanswered threads, extracted from your conversations after the fact and dated. A thread records who asked it, so she deflects the ones you put to her and chases the ones she put to you. Readable in full under SYSTEM, and erasable.
- **`CORE_SOUL_MD` and the register's half** — the literal documents sent as her system prompt, not a paraphrase of them. Readable. Not editable.
- **`PROMPT`** — the last real request and the extraction that followed it, verbatim and selectable, because a reply that looked wrong is easier to diagnose than to guess at.
- **The transcript** — capped, and the one thing you may burn. Erasing it costs her the wording and never the verdict.

She speaks **English or Korean**, and the Korean is not a translation — each line is written to land the same beat rather than the same words. She writes her name `V.E.R.A.` in both.

## The cabinet

Six slots, behind a square of dots next to the input box — press it and a sheet rises over the stage. Rooms are rooms in her building, not screens in her app: the shell owns the tile, the bleed, one exit and her dot, and everything past the threshold belongs to the room.

- **01 · EXCELLENT ADVICE** — a book of short advice (on the author's own build, Kevin Kelly's *Excellent Advice for Living*). One card at a time or the whole list, with a star on each. The room is lit in whatever she is wearing, so walking in after she was alarmed gives you a red room.
- **02 · TWO SENTENCE HORROR** — two-sentence horror stories (on the author's own build, r/TwoSentenceHorror's best). The second sentence is withheld behind a redaction until you tap, and whether you want to be spoiled is a standing preference rather than a setting for one card.
- **03 · NOTES TO MYSELF** — the one room whose corpus you write. A note, a time, and the weekdays it should arrive on; it lands on the lock screen in your own words until you switch it off, and tapping it opens the note as a card.
- **04 · AFFIRMATIONS** — one affirmation at a time on a full field of colour, swiped through. It is sincere, and she does not light it: a sincere room should not turn red because she was alarmed.
- **05–06** — empty. Specimen-03, a terrarium with its own hunger, is benched rather than deleted: every file is still on disk and still tested.

Every room deals from a shuffled deck that gives you every card before it repeats any. **The pass survives leaving the room** and is reset only by restarting the app.

**The decks in this repo are samples.** The real corpora are other people's writing, so they are never committed. A fresh clone deals from small decks written for the repo (`src/modules/*/*.sample.ts`). A build that has the real ones picks them up automatically from gitignored `*.local.ts` files beside them:

```sh
node tools/build-horror.mjs reddit_cleansed_data.csv   # → horror/stories.local.ts (the CSV's URL is in the script)
node tools/build-affirmations.mjs                      # → affirmations/lines.local.ts
# advice/quotes.local.ts comes from a personal Kindle export and has no generator
```

Each corpus module requires its local file optionally and falls back to the sample, so Metro bundles whichever exists and Jest always runs the samples. The full-corpus invariants run as their own tests wherever the local files are present.

## What arrives when you are not looking

Five sources, all off by default. Four have a switch under `SYSTEM → PREFERENCES`; the fifth is per-note, inside module 03.

| | when | what |
|---|---|---|
| **EXCELLENT ADVICE** | 09:00 | one highlight, and the book under it |
| **AFFIRMATIONS** | 10:00 | one line — tapping it opens the poster on that card |
| **TWO SENTENCE HORROR** | 22:00 | the setup, with the turn redacted — tapping opens it already turned over |
| **NOTES TO MYSELF** | whenever you said | your own note, repeating on the weekdays you chose |
| **TRANSMISSIONS** | 11:00 and 16:00 | **her**, unprompted, in your chosen register |

The transmissions are the only ones in her own voice. Forty authored lines, twenty to a register, split across the two hours — and each carries nothing about you at all. They are chosen a fortnight before they are read, so the hour of the slot is the only thing about that day she can possibly know.

> There is no background work of any kind. Nothing of ours is awake at nine, so every card is handed to Android with its text already written into it. The three whose content *changes* are dated, and the queue is rewritten whenever the app opens — stop opening it for long enough and those stop. **Your notes do not**: their text never varies, so they repeat weekly and go on arriving whether you open the app again or not.

**One thing no code here can fix.** On Samsung, Freecess holds a frozen app's alarms past their hour — a ten o'clock story arrived at 03:00 — and `Battery → Unrestricted` is the whole of the fix. The `BATTERY` row says plainly which way it is set, and switching any of these on offers you the dialog.

## Bring your own key

There is no server and no shared credential. You paste your own key; it goes into the Android Keystore, and requests go straight from the device to whichever provider the key's shape matches.

| | pattern | model |
|---|---|---|
| Anthropic | `sk-ant-` | `claude-sonnet-5` |
| OpenRouter | `sk-or-` | `anthropic/claude-sonnet-5` |
| DeepSeek | `sk-` + 32 hex | `deepseek-chat` |
| OpenAI | `sk-` / `sk-proj-` | `gpt-4o-mini` |
| Google | `AIza` / `AQ.` | `gemini-2.5-flash-lite` |

A key from an unlisted provider is refused at the gate — the accepted cost of matching by shape. Remove the key and she goes dormant mid-sentence, with the record intact underneath.

## Under the hood

- **A persona as a prompt contract.** Her system prompt is two documents joined per request: an immutable core and the active register. Only one of five stimuli reaches the model; the rest come from authored banks and are kept out of the transcript. When the register changes, the old register's turns stop being replayed, so the model never argues with its own previous voice.
- **Memory by extraction, not by transcript.** A separate call works through the queue of recent exchanges in batches and rewrites a structured record of dated facts, verdicts and open threads (`src/vera/extract.ts`, `memory.ts`). A failed batch stays queued for the next attempt. The transcript is capped and can be burned; the record survives it. The exact prompt and extraction are inspectable on-device under `SYSTEM → PROMPT`.
- **Bring your own key, five providers, no server.** The key's shape picks the provider (`providers.ts`), the key lives in the Android Keystore, and requests go straight from the handset. There is no backend to run, secure or pay for.
- **A voice built, not chosen.** Provider TTS is only the raw material, and it goes through a DSP chain written from scratch in TypeScript (`src/vera/voice/`):
  - YIN pitch tracking finds the pitch.
  - Her contour is pulled almost flat, snapped, and stepped by fixed intervals.
  - PSOLA resynthesis lays the voice back down at the new pitch without changing its duration.
  - A speaker-grille and room stage finishes it.
  
  It is pure and I/O-free, so the same chain runs under Node in `tools/voice-lab.mjs`.
- **An optic with nine moods.** It is drawn in Skia from a pure geometry module (`opticGeometry.ts`), so lids, drift, blink and catchlight are computed and tested rather than hand-animated.
- **Her face on the launcher.** Android cannot change an app icon at runtime. So a config plugin (`plugins/withRotatingIcons.js`) generates one `<activity-alias>` per emotion, and a Kotlin module (`modules/app-icon`) switches which one is enabled.
- **Notifications with no background work.** Every card is scheduled ahead with its text baked in. A second Kotlin module (`modules/power`) reads the battery-optimisation whitelist, so the app can say honestly whether Samsung's Freecess will hold its alarms.
- **Logic is pure, components are thin.** Everything that decides anything is a React-free module with its own tests. Native pieces are no-ops under Jest, so the suite runs anywhere in about 25 seconds.

## Repo map

- [`CLAUDE.md`](CLAUDE.md) — the working brief: what exists, why it is the way it is, and every gotcha that cost a day
- [`docs/architecture.md`](docs/architecture.md) — stack, structure, mechanics, deployment
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — the design docs, one per feature
- [`design/`](design/) — the original handoff. `The Facility - Overhaul.dc.html` is the v2 prototype and the authority on every pixel; `Vera Final.dc.html` supersedes it on the cabinet and the theme, with `Theme Options.dc.html` behind it
- `src/` — `core/` (pure logic + state) · `vera/` (her brain) · `shell/` (her surface) · `modules/` (the rooms)

Everything that decides anything is a pure module with no React in it and its own tests. Components render and dispatch, nothing more.

## Running it

```sh
npm install
npm test && npx tsc --noEmit    # both are the gate — 1,219 tests, 92 suites
npx expo start                  # needs an EAS dev build, not Expo Go
```

Skia, Reanimated and the native modules are all jest no-ops, so a device is the only detector for anything that moves or is drawn. A native dependency, an `app.json` change or an SDK bump needs a rebuild:

```sh
npx eas-cli@latest build -p android --profile development
```

After a React Native version bump, add `--clear-cache` or the APK crashes on launch.

Incubated in a private idea vault, and built with Claude Code from the specs and plans in `docs/superpowers/`.
