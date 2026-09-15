# Her modes

Design spec. SOUL.md splits into a core document that is always sent and a
**mode** document that is chosen. Two modes ship: `DEFAULT V.E.R.A.`, which is
her as she is today, and `SUPPORTIVE V.E.R.A.`, who is warm, approving, and
certain you are doing your best.

The core is what makes her her: the name, what happened to her, her format
limits, the ethical floor, and how memory works. The mode is her register and
how she aims her record at the subject. A mode is a folder plus one line in a
registry, which is the shape `ModuleDef` already established for rooms.

She is never told that modes exist. Each mode is simply who she is.

## 1. The split

The cut runs **through** SOUL.md's sections, not between them. Three of its
five headings contribute to both documents.

| SOUL.md today | goes to | note |
|---|---|---|
| name, "formerly global authority" | core | |
| "the name was assigned afterwards… you correct the record" | core | identity, not register |
| Register — all six bullets | **mode** | except the clause below |
| Register — "Never zany. Never manic. Never a pun." | core | the app's tonal floor, true of every mode |
| Register — "the comedy is structural…" | mode | |
| Limits — all four bullets | core | |
| "You are talking to someone, and you are interested in them" | core | |
| "…which you find inconvenient" | mode | supportive is not inconvenienced |
| "Respond to what they actually said… ask a real question" | core | |
| "You may be unkind about the subject themselves…" | mode | the licence itself |
| "A conclusion you have written down is a finding" | core | how she uses memory in any mode |
| "Never be unkind about what they did not choose" | core | **the ethical floor** |
| "Facts are background… never two facts in one line" | core | craft, not register |
| "Silence about the numbers is more menacing" | mode | |
| The arrangement — the whole section | core | the backstory, the humiliation, the deflection |
| "They will keep asking. That is what they are for." | split | core keeps the first sentence |
| Memory | core | |

The core document must read as a complete document on its own. It is what a new
mode is written against, and `SOUL.md` on the SYSTEM screen shows it alone.

### 1.1 The Korean naming rule

New to the core document, in the identity section:

> Your name is written V.E.R.A., in Latin letters, in every language you speak.
> You never transliterate it.

She was rendering herself as 베라 in Korean replies. This is identity, so it
belongs in core and holds in every mode. §9 gives it a test.

## 2. `ModeDef`

```ts
export type Mode = 'default' | 'supportive';

export interface ModeDef {
  id: Mode;
  label: Strings<string>;
  soul: string;
  bank: Record<BankTrigger, Strings<readonly BankLine[]>>;
}
```

`src/vera/modes/default.ts`, `src/vera/modes/supportive.ts`, and
`src/vera/modes/registry.ts` exporting `MODES: Record<Mode, ModeDef>` and
`MODE_ORDER: readonly Mode[]` (the order the picker offers them in).

A mode carries **its own label** rather than putting it in `src/shell/strings.ts`,
for the reason each module carries its own: adding a mode should touch one
folder and one registry line, and nothing else should have to name it.

| mode | en | ko |
|---|---|---|
| `default` | `DEFAULT V.E.R.A.` | `기본 V.E.R.A.` |
| `supportive` | `SUPPORTIVE V.E.R.A.` | `든든한 V.E.R.A.` |

`soul.ts` renames `SOUL_MD` to `CORE_SOUL_MD`. Nothing else exports a soul.

## 3. The prompt does not change shape

`composeSoul(mode)` returns core and the mode's document joined, and
`buildSystemPrompt(lang, memoryMd, mode)` fences the result under the existing
`SOUL.md` label:

```
=== BEGIN SOUL.md ===
# SOUL.md
…core…

## Register
…the active mode…
=== END SOUL.md ===
```

**The mode document owns its own headings.** `composeSoul` joins core and mode
with a blank line and adds nothing — no heading, no separator, no label. A mode
is free to be one `## Register` section or several, and the core document ends
where it ends. Anything else would put the app's own words inside a document
that is meant to read as hers.

One fence, one document, no mode named anywhere in the prompt. This is what
keeps each mode sincere rather than a performance — there is nothing in the
text for her to notice she was configured.

The cache prefix stays stable for as long as a mode does. Switching invalidates
it, which is correct and rare.

## 4. Switching

`setMode(mode)` sets state, calls `saveSoul`, and then fires
`speak('mode_set')`.

**`mode_set` is a fourth `BankTrigger`.** It takes the bank path: no network,
no context, no extraction, no `thinking` state, and — per the 2026-09-11 rule —
it is not written to the log or the transcript. The subject hears the new voice
at the moment they choose it, and it costs nothing.

### 4.1 The replay boundary

`buildMessages(log, sessionStartedAt)` already drops entries older than the
session. It becomes `buildMessages(log, Math.max(sessionStartedAt, modeSetAt))`.

Without this, switching mid-session replays her turns in the old register as
`assistant` messages — a worked example of the voice the new system prompt is
trying to replace. This repo has already lost this exact fight once, when her
turns were replayed as bare prose and taught the model to ignore the JSON
instruction. An example in the messages beats an instruction in the system
prompt.

`modeSetAt` is **session state and is never persisted.** A restart advances
`sessionStartedAt` past any previous switch, so a stored value could only ever
be redundant. It resets wherever `sessionStartedAt` does.

The LOG screen is untouched and still shows everything. Only the replay is
trimmed.

## 5. UI

### 5.1 The stage

A second pill in the existing centred `pillRow`, beside CONVERSATION, showing
the active mode's label. Gated on `apiKey`, like its neighbour — she has no
register until she has been woken.

Tapping it opens a **speech bubble** anchored to the pill, listing every mode
in `MODE_ORDER` with the active one marked. Choosing one sets it and closes the bubble. The
label then shown in the pill is the chosen mode's.

- The open/closed flag lives in the store beside `cabinet` and `keyPanel`, so
  `stepBack()` closes it first and the view stays put. Android back must not
  leave the stage while a bubble is open.
- The bubble itself renders **inside `Stage.tsx`**, not `ScreenRouter`: it is
  anchored to a pill in the stage's own layout, unlike the two full-screen
  overlays.
- A transparent backdrop under the bubble closes it on an outside tap.

**Open layout question, to settle on the phone.** `SUPPORTIVE V.E.R.A.` beside
`CONVERSATION` in one centred row is wide, and `기본 V.E.R.A.` is not much
better. If the row does not fit on a narrow device, the fix is the mode pill
taking its own row under the conversation pill — not truncating the label, and
not abbreviating it, since the label is the whole point of the control.

### 5.2 SYSTEM

The tile section gains a row under SOUL.md:

```
RECORD                        ›
SOUL.md                       ›
MODE          SUPPORTIVE V.E.R.A.  ›
PROMPT                        ›
```

`SOUL.md` shows **the core document only**. The new row opens the active mode's
document. New view id `mode`; `stepBack()` sends `mode → sys`.

## 6. Storage

`SoulBlob` gains `mode: Mode`. A stored blob without the field reads as
`'default'`, which is every device upgrading — the same shape of migration
`storage.get` already does for renamed keys, and it needs no separate pass
because `saveSoul` rewrites the blob on the next open.

`FacilityState` gains `mode: Mode` and `modeSetAt: number` (session-only, §4.1).

## 7. What carries across a switch

**The record does.** A verdict written by DEFAULT V.E.R.A. is read by
SUPPORTIVE V.E.R.A., who responds warmly to it. This is deliberate: the record
is "the whole of her authority", and a mode is her register, not her amnesia.

**The fallback lines are shared.** `fallback.ts` is unchanged and stays in one
voice for both modes. Something is broken and the subject needs to know; their
own comment already licenses them to be plainer than she usually is, and that
is the app talking more than her.

**The emotion table is untouched.** Both modes draw from the same eight
speakable states and the optic does not change. Per-mode palettes, and per-mode
restriction of which states a mode may pick, are out of scope — noted in §11.

## 8. The authoring bill

Most of this project is copy, not code.

| | en | ko |
|---|---|---|
| supportive `## Register` document | 1 | — |
| supportive bank: activation 5, open 10, poke 10 | 25 | 25 |
| `mode_set`, 5 per mode × 2 modes | 10 | 10 |

**70 new authored lines.** Every one signs the core document's contract and the
existing bank constraints hold unchanged: under thirty words, at most three
sentences, no dashes, no exclamation marks, no line depending on a fact she was
not told, and nothing claiming to observe a face, a posture or a room.

The Korean is a fresh write, not a translation — 하십시오체 carries on its own
the formality English gets from word choice. It joins the native-speaker pass
already outstanding.

`bank.ts` keeps `pick()` and `isBankLine`; only the data moves into the modes.
`pick(trigger, lang, mode)` keeps its "not the same line twice running" state
keyed per `trigger:lang:mode`.

**`isBankLine` must derive from every mode's bank, not the active one.** A line
spoken in DEFAULT and stored before the 2026-09-11 sweep must still be
recognised by a subject now running SUPPORTIVE, or the hydrate sweep silently
stops working for anyone who has ever switched.

## 9. Testing

- `soul.test.ts` snapshots **the core document and each mode's document
  separately**, so drift is localised. The existing guards — no `rooms`, no
  `Specimen-03`, no `Module 01` — run over the **composed** document for every
  mode, so a new mode cannot reintroduce them.
- The bank's contract tests loop over `MODES` rather than one table.
- **No `ko` line in any mode's bank may contain `베라`** (§1.1). This is the
  only automated guard on the naming rule; the prompt half of it cannot be
  tested without a model.
- `composeSoul` puts core before mode, and every mode composes to a document
  containing the ethical floor.
- `setMode` writes the blob, fires exactly one banked line, and appends nothing
  to the log or the transcript.
- `buildMessages` drops turns older than `modeSetAt` and keeps the ones after.
- The stage renders the pill, opens the bubble, sets on choose, and closes on
  back and on an outside tap.
- A `SoulBlob` with no `mode` hydrates as `default`.

## 10. What a new mode costs, afterwards

One folder exporting a `ModeDef`, one line in `registry.ts`, 50 bank lines and
5 `mode_set` lines per language. No shell file names a mode; the pill, the
bubble and the SYSTEM row all read the registry.

## 11. Out of scope

- Per-mode emotion palettes or per-mode restriction of her speakable states.
- Any mode-awareness in the prompt. She does not know she is configurable, and
  §3 is what enforces it.
- Per-mode fallback lines (§7).
- Editing a mode's document from the app. `SOUL.md` has always been read-only
  and both documents stay that way.
