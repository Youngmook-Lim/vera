# The Facility — Overhaul (v2)

Design spec. Source: `The Facility - Overhaul.dc.html` (Claude Design project
`bc25a219-1ba4-4fef-9978-f21c0e6596dd`), turns 1–7. Implementation target is
turn **4a** (the live prototype), with **6a**, **5a**, **5f** and the **3a**
optic wired into it. Turns 1a–3e, 2a–2f, 5b–5e and 6b are records of rejected
or parked directions and are not built.

## 1. What the app becomes

V.E.R.A. stops being an authored corpus behind a bureaucracy simulator and
becomes a live model with two files and a key. The Personal Enrichment Program
— enrollment, daily compliance, streak, standing, notifications — is cut
entirely. What remains is her, one specimen, one room you write yourself, and
two empty rooms.

Her stage is the whole app. Everything else is a drawer, a second view, or a
room behind a doorway.

## 2. What gets deleted

Phases 2, 3 and 5 of the v1 build order are removed outright. Git history is
the archive; nothing is kept in the working tree.

```
src/shell/enrollment/           five screens + dodge.ts
src/shell/daily/                DailyScreen, MissedScreen, ComplyRing
src/shell/notiflog/             transmission log
src/shell/settings/             SettingsScreen
src/shell/FacilityScreen.tsx    launcher home
src/shell/PlaceholderScreen.tsx
src/shell/components/           VeraPanel, Scanline
src/core/compliance.ts          streak / standing / missed-day math
src/core/notifications.ts       planner + Expo Go-gated executor
src/modules/results/ incinerator/ field/ hazard/
src/vera/index.ts               authored corpus
```

Dependencies dropped: `expo-notifications`, `@react-native-community/slider`.
The `expo-notifications` plugin block and notification asset config come out of
`app.json`.

Survivors: `core/i18n.ts` unchanged; `core/storage.ts` rewritten around new
keys; `modules/organism/Blob.tsx` and `hunger.ts` restyled and retuned;
`modules/registry.ts` reduced to four slots.

## 3. Structure

```
src/core/
  theme.ts      v2 tokens: 4a palette, emotion hues, serif role for her voice
  fluid.ts      word count → [fontSize, lineHeight], per language        ⊤
  storage.ts    four stores; adds a `secure` seam over expo-secure-store
  store.ts      zustand; `view` is the router

src/vera/
  soul.ts       SOUL.md, verbatim, as a string constant
  emotions.ts   the EM table — eight emotions plus dormant               ⊤
  providers.ts  key-shape matching + request builder                     ⊤
  llm.ts        fetch + response normalisation across three API shapes   ⊤
  context.ts    ctx() — the notable-fact selection rules                 ⊤
  speak.ts      prompt assembly, JSON extraction, impression clamp       ⊤
  fallback.ts   FALLBACK + ACT lines, en/ko

src/shell/
  ScreenRouter.tsx   view switch + Android hardware back
  Stage.tsx          optic, emotion label, fluid line, input, drawer handle
  Optic.tsx          the Skia eye
  Cabinet.tsx        the drawer
  KeyGate.tsx        dormant activation panel, inline on the stage
  KeyPanel.tsx       SYSTEM → ACCESS replace/remove modal
  LogScreen.tsx      transcript + clear confirmation
  SystemScreen.tsx   files / preferences / access
  FileScreen.tsx     MEMORY.md and SOUL.md reader
  strings.ts         the T table, en/ko, verbatim from the doc

src/modules/
  registry.ts   four slots: 01 organism, 02 identity, 03 and 04 empty
  organism/     Module 01 — dark green terrarium
  identity/     Module 02 — bone paper
```

⊤ = pure module, unit-tested, no React. All logic with a decision in it lives
in one of these; components render and dispatch, nothing more.

## 4. The doorway rule

Modules are rooms in her building, not screens in her app. The shell owns
exactly four things and nothing else:

1. **The tile** — identical geometry in the cabinet (same square, same 12px
   radius), painted in the module's own world's colours.
2. **Full bleed inside** — no header, no shell chrome, no amber.
3. **One exit** — top-left, 44px, drawn in the module's own ink. Position and
   size fixed forever; colour is not.
4. **Her dot** — top-right, current emotion colour. Tapping returns to the
   stage. She does not enter the room, comment on it, or decorate it.

Everything inside the threshold belongs to the module.

## 5. The stage

Nothing on it but her: a 158px optic, an emotion label, one line, one input,
and a drawer handle. Above the optic, a conversation pill appears only once a
transcript exists.

**Fluid type** absorbs overflow so nothing ever scrolls. Word count picks a
step; Korean runs its own ladder because Nanum Myeongjo's hangul sits optically
larger than Instrument Serif's latin at the same size:

| words | Latin | Korean |
|-------|-------|--------|
| ≤ 8   | 30px / 1.32 | 26px / 1.46 |
| ≤ 14  | 26px / 1.38 | 23px / 1.50 |
| ≤ 22  | 21px / 1.44 | 19px / 1.56 |
| ≤ 32  | 18px / 1.50 | 16px / 1.62 |
| more  | 15px / 1.56 | 14px / 1.68 |

The cost is a cap on how long she may speak (~45 words), which SOUL.md already
enforces at under 30. Her line types in at 16ms per character; a new line
cancels an in-flight one.

`ms()` ×1.1 still applies to type, layout stays 1:1 — the convention holds
across the whole codebase.

## 6. The optic

Skia, not SVG. `color-mix`, `repeating-conic-gradient`, blurred catchlights and
an inset-shadow bezel have no RN equivalent, and the eye animates continuously.

Layers, outermost in: glow (radial gradient, pulsing 2.8s) · bezel · socket ·
two hairline iris rings · iris (radial gradient plus 100-spoke striation at
3.6° pitch) · white core with bloom · blurred catchlight · hairline lid.

Emotion drives eight values at once. The full table, verbatim from the doc:

| emotion | iris | glow | seam | lid | lid-b | pupil | aperture | blink | track |
|---|---|---|---|---|---|---|---|---|---|
| dormant | `#5c5850` | 4% | 12% | 0% | 0% | 30% | 34% | 9s | 0 |
| calm | `#f4b43a` | 14% | 42% | 8% | — | 34% | 48% | 5.8s | 1 |
| amused | `#ffd93d` | 18% | 38% | 16% | — | 26% | 40% | 3.2s | 1 |
| disappointed | `#9d8757` | 8% | 58% | 30% | — | 32% | 46% | 7.6s | 0 |
| bored | `#79808a` | 6% | 66% | 40% | — | 30% | 44% | 9s | 0.25 |
| pleased | `#4fd08a` | 20% | 34% | 4% | — | 22% | 58% | 4.4s | 1 |
| suspicious | `#6f86e0` | 12% | 52% | 34% | 14% | 20% | 34% | 12s | 1 |
| alarmed | `#ff4a3d` | 24% | 46% | 0% | — | 18% | 62% | 1.9s | 1 |
| affectionate | `#ef8f8a` | 18% | 44% | 22% | 30% | 40% | 58% | 7s | 1 |

**Affectionate is 5a — the fond squint.** Lower lid rides to 30%, pupil opens
to 40%, and the blink is slow and held, the way a cat's is. No heart pupil, no
heart catchlight; 5b–5e stay records. Affection reads as geometry and tempo,
not hue.

**Dormant** is the one state with her colour vocabulary switched off entirely:
grey iris, aperture down to a dim ring, no catchlight, no tracking, no emotion
label but DORMANT.

**Tracking.** A pan gesture over the stage moves the pupil. Offset is
`(fingerX − eyeCentreX) / (eyeWidth × 2.6)`, clamped to `±0.14 × track`, so
disappointed never follows you and bored follows a quarter of the way.

Reanimated carries every transition. Skia is already mocked in `jest.setup.ts`,
so the optic stays testable by not being where the logic is.

## 7. Typography

Two new fonts: **Instrument Serif** (her voice, Latin) and **Nanum Myeongjo**
(her voice, Korean). Both from `@expo-google-fonts`, bundled locally, no CDN.

Pretendard leads the label stack, IBM Plex Mono carries Latin labels, Space
Grotesk carries numerals inside Module 01. A machine that speaks in typeset
serif is more unsettling than one that speaks in a UI font, and it separates
her from every label on screen.

## 8. Four stores

| store | key | engine | contents |
|---|---|---|---|
| soul | `facility.v2.soul` | AsyncStorage | mem (6), visits, day, lastOpen, hunger, lang, imps (24), cleared |
| transcript | `facility.v2.transcript` | AsyncStorage | chat log, capped at 60 |
| module 02 | `facility.mod02.identity` | AsyncStorage | title, lines, revs, month |
| credential | `facility.v2.credential` | **SecureStore** | the key |

Module 02 owns its own storage. It has nothing to do with her soul or the
transcript, and she is not told what is in it.

**MEMORY.md** is her record of who you have been — nine-word entries appended
as she talks. She may **seal** one: it stays in the file and in her reasoning,
but you see `[REDACTED BY ADMINISTRATOR]`. You can read the file; you cannot
edit it.

**SOUL.md** is who she is — the literal document sent as her system prompt
every reply, not a paraphrase of it. Read-only.

**The transcript** is the only thing you can erase. She reasons from MEMORY.md,
so erasing it makes her forget the wording and keep the verdict. She is told
when you do it: the first time she notes it, the second she observes the
pattern aloud, by the third she treats it as a habit she has already filed.

## 9. The credential

`expo-secure-store` → Android Keystore. Never in MEMORY.md, never in the
transcript, surfaced only as `•••• last4` plus a route label under
SYSTEM → ACCESS.

**The gate validates.** This reverses the doc, which deliberately let anything
through and caught bad keys when she failed to answer. Six accepted shapes,
**order significant** — the DeepSeek and OpenAI patterns overlap, and a 32-hex
`sk-` key must route to DeepSeek:

| label | pattern | kind | endpoint | model |
|---|---|---|---|---|
| ANTHROPIC | `^sk-ant-` | anthropic | `api.anthropic.com/v1/messages` | `claude-sonnet-4-5` |
| OPENROUTER | `^sk-or-` | oai | `openrouter.ai/api/v1/chat/completions` | `anthropic/claude-sonnet-4.5` |
| DEEPSEEK | `^sk-[0-9a-f]{32}$` | oai | `api.deepseek.com/chat/completions` | `deepseek-chat` |
| OPENAI | `^sk-(proj-)?[A-Za-z0-9_-]{20,}$` | oai | `api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| GROQ | `^gsk_` | oai | `api.groq.com/openai/v1/chat/completions` | `llama-3.3-70b-versatile` |
| GOOGLE | `^AIza` | gemini | `generativelanguage.googleapis.com/…/gemini-2.0-flash` | `gemini-2.0-flash` |

Groq, the inference provider — not xAI's Grok, which is a different company
with an `xai-` prefix and is not routed.

`FALLBACK_PROV` is deleted. A key matching no pattern is refused at the door,
as is anything under 8 characters or containing whitespace. The consequence is
accepted deliberately: a **valid** key from an unlisted provider (Mistral,
Together, xAI) is now refused.

`UNRECOGNISED KEY FORMAT` / `미확인 키 형식` stops being a route label — no
stored key can have an unknown shape — and becomes the rejection state.

Because rejection is now possible, the accepted routes are listed under the
input as dim mono text: `ANTHROPIC · OPENROUTER · OPENAI · DEEPSEEK · GROQ ·
GOOGLE`. Technical apparatus of the facility, not dialogue. The doc is
deliberate that nothing in her copy names a provider, and that holds — she
still never mentions keys.

Requests go straight from the device to the matched provider.
`anthropic-dangerous-direct-browser-access` is dropped; it is a CORS header and
there is no browser here.

**Known and accepted:** a key on the device is readable by anyone holding the
phone. The doc's own recommendation is a proxy. There is no server in this
project, and the key is the subject's own.

## 10. Waking, and going dark

There is no verification step, by design. Anything matching an accepted shape
gets in; a wrong key is caught when she tries to answer, which is the only test
that means anything.

**Waking** is a single bloom through the optic as amber returns, then a first
line generated live under a situation override: proprietary, faintly insulted
at having been left dark, told this is her first instant with you and told not
to mention keys.

**Replacing** the key is silent — she does not notice a transplant.

**Removing** it is not. She goes dormant mid-sentence and the stage returns to
the activation panel, with MEMORY.md fully intact underneath. Waking her again
is a new first greeting over an old file: she has conclusions about you and no
recollection of having been off.

## 11. What she is given

Every reply is generated against SOUL.md plus a live context object:

- time of day, bucketed — she is never handed a clock
- the last six exchanges, kept on the device
- her MEMORY.md conclusions

Plus **at most one genuinely notable circumstance**, because an unremarkable
number is noise she will recite: awake in the small hours, gone more than three
days, a fifth return today, a reply that took over four minutes, a specimen
above 90, or repeat erasure.

She returns minified JSON — emotion, line, and optionally a nine-word
impression with a `seal` flag. On any parse failure or network error, an
authored FALLBACK line is used and the app does not break. The doc's
`window.claude.complete` branch is a design-runtime affordance and is dropped.

Speak triggers: `open`, `activation`, `subject_spoke`,
`subject_erased_the_transcript`, `subject_tapped_your_optic`,
`subject_fed_the_specimen`, `language_switched`.

## 12. Module 01 — Specimen-03

The dark green terrarium (`#0c110e`). Status and day pills, a 168px vivarium
with the morphing blob, mood and hint lines, three stat tiles (hunger, temp,
nausea), and the mutation log.

`Blob.tsx` survives from v1 — Skia `usePathValue` + `useClock` morphing — and
is restyled: the new specimen has four eyes, two paired plus a third above and
one below, and its size tracks hunger (`74 + hunger × 0.24` px).

**Hunger drifts.** This departs from the prototype, which seeds 82 and only
ever decreases — after two taps the specimen is fed forever and the module is a
static picture. The existing tested math is kept: hunger climbs
`DRIFT_PER_HOUR = 2.5` since last fed. Retuned to the new numbers —
`FEED_PER_TAP` 10 → 41, floor 8 not 0, and `isHungry` becomes `hunger > 55`
(strictly greater, matching the prototype) rather than `>= 50`.
`START_HUNGER` stays 82.

The numbers land against copy that is already written. From a full feed at 8,
hunger crosses 55 → `HUNGRY` in about 19 hours, matching her authored line
about the specimen not having eaten in nineteen hours; it crosses 90 →
`the specimen is genuinely suffering` enters her context at about 33 hours.

## 13. Module 02 — My Identity

Bone paper (`#efe7d7`), one ink, zero mono, zero uppercase tracking, no labels.
The total absence of her vocabulary is what makes it feel like yours.

An editable italic title, statements at 25px Instrument Serif separated by
hairlines, a `+` to add a line and a `×` to remove one, and a footer stamp:
`written in <month> · revised twice`. Editing a line or the title bumps the
revision count; adding one does not. Clearing a line's text deletes it.

`contentEditable` becomes a multiline `TextInput` with `onBlur` save — same
semantics, no composition-event handling, because RN has none and hangul IME is
the platform's problem, not ours.

**Where the two documents meet.** Module 02 is your declaration of who you
intend to be; MEMORY.md is her record of who you have been. Neither can edit
the other, and she is not told about the first one at all. The gap is the most
interesting thing in the app and it stays yours.

6b — her graphite annotations stacked over your paper — is **parked, not
built**, per the doc.

## 14. Navigation

No navigation library. Conditional render on `view`, as in v1.

Views: `stage` · `log` · `sys` · `mem` · `soul` · `mod01` · `mod02`.
Overlays: the cabinet drawer, and the ACCESS key panel.

Android hardware back goes one step out, never jumping:

- `mem` / `soul` → `sys`
- `sys` / `log` / `mod01` / `mod02` → `stage`
- drawer open or key panel open → close it, stay put
- on `stage` → exit the app

The drawer opens by tap on the handle, or by dragging up more than 22px from
it. A module rises from the bottom edge where it was tapped, and the stage
scales back to 0.965 and dims behind it.

## 15. Visit counting

Same-day returns increment a counter, capped at 99; a different day resets to
1. A remount within 120 seconds is a reload, not a return — without that guard
hot-reload inflates the count into the hundreds during development.

## 16. Testing

`npm test` and `npx tsc --noEmit` stay the gates. Jest pinned to 29, RTL v14
fully async, worklets resolver — all unchanged.

Every ⊤ module gets unit tests. Specifically worth testing:

- `fluid()` — both ladders, every boundary
- `providers` — all six patterns, and that a 32-hex `sk-` key routes to
  DeepSeek rather than OpenAI
- rejection — short, whitespace-bearing, and unmatched keys all refused
- `llm` — all three response shapes normalised; 401/403 distinguished from
  network failure
- `speak` — JSON extracted from a fenced or chatty response; impression clamped
  to nine words; malformed output falls back without throwing
- `context` — one notable fact at most, and the right one
- `hunger` — drift, feed, floor, threshold
- Screens via RTL: gate rejects and accepts, log clears, back steps out
  correctly, module 02 edits persist

## 17. Build consequence

`expo-secure-store` is a native module and the two new fonts are new assets, so
**a new EAS dev build is required** before v2 runs on the phone. The existing
dev build cannot load it.

Removing `expo-notifications` means the permission dialog and all local
notifications disappear with the daily loop that justified them.

## 18. Out of scope

Turns 1a–1i, 2a–2f, 3a–3e layouts and 5b–5e are records of directions already
decided against. 6b is parked by the doc. None are built, and no switch is
added to reach them.
