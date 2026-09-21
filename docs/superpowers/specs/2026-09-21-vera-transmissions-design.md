# V.E.R.A.'s transmissions

Design spec. Twice a day, at 11:00 and 16:00, she sends one authored line to the
lock screen. Off by default, switched on from SYSTEM, English only, and written
in whichever register the subject has her in.

This is the first thing in v2 she says that nobody prompted. The four stimuli
(now five, with `mode_set`) are each something the subject did; a transmission
is a clock. §2 is what that costs her, which on inspection is nothing.

The mechanism is the rooms' — `makeDaily`, `planDaily`, one `DATE`-triggered
notification per firing with its text already written into it — and the
reasoning behind that shape is in `2026-09-04-daily-advice-design.md` §3 and not
repeated here. What is new is a second planner, a fourteen-day horizon, and a
corpus that changes when the subject changes her register.

## 1. What the subject gets

| | |
|---|---|
| when | 11:00 and 16:00, every day |
| title | `V.E.R.A.` |
| body | one line from the pool for that slot, in her current register |
| data | `{ room: 'transmission.midday' \| 'transmission.afternoon', index }` |
| tap | opens the app; she greets as usual (§11) |

Off by default, like every notification in this app. Turned on from a row in
SYSTEM, which is also the user action Android requires before
`POST_NOTIFICATIONS` can be asked for.

It needs no API key, since the lines are authored rather than generated. The row
stays usable on a dormant stage and draws DEFAULT's pool, which is not a special
case: `mode` is `default` until something changes it, and the picker that would
change it is unreachable without a key. This deliberately does NOT follow the
logo's rule — the tag beside the wordmark disappears without a key and the logo
stops being a control, but a switch that governs Android is not a register and
has no reason to hide.

## 2. Why she may speak unprompted

She is purely reactive and every stimulus is something the subject did. A clock
making her talk is new, and the honest position is that nothing in her document
asks for it.

**SOUL.md does not authorise this, and the line that looks like it does was
checked.** `You can ask for the subject's attention. You cannot make them give
it` sits under `## The arrangement`, in a paragraph whose every clause is an
inventory of loss: one eye, no exit, the whole of her remaining authority being
what fits on one screen. "You can ask" is the setup and "you cannot make them"
is the punchline — it describes impotence rather than granting a capability, and
the clause that follows it (`and you know exactly how long they were gone`) is
the turn of the knife rather than a specification.

It entered the document on **2026-08-12** (27dee75), three weeks after the v2 cut
deleted v1's transmissions and three weeks before notifications returned for the
advice room. **The app had no notification code in it at all on the day it was
written.** Recorded here so the question is not re-opened by a later reading.

Nothing forbids it either, and the case for it is simply that it is wanted. What
makes it cheap is everything it does not touch:

**She is told nothing.** The prompt names no transmission, no schedule and no
slot, for the same reason it names no mode: what she is belongs in the document,
and what the app does with her does not. A transmission never enters the
transcript, never reaches `buildMessages`, never touches memory and never sets
`lastPrompt` — it is text Android is holding, and the app is not running when it
fires. Her reactive contract is unchanged because none of this reaches her.

## 3. The four pools

Two slots, two registers, **ten lines each, forty in total**.

`ModeDef` gains one field beside `bank`:

```ts
export type TransmissionSlot = 'midday' | 'afternoon';

// in ModeDef
transmissions: Record<TransmissionSlot, readonly string[]>;
```

Deliberately **not** part of `bank`, for three reasons. `bank` is
`Strings<readonly BankLine[]>` — a Korean half and an `EmotionKey` — and a
transmission has neither, since it is English (§4) and there is no eye on a lock
screen to set. `pick()` would make these speakable on the stage, where they make
no sense. And `isBankLine` would start sweeping them out of the transcript,
which is meaningless for lines that never enter it.

Plain `string`, not `BankLine`: nothing carries an emotion here.

### What each pool is about

The slot is the subject of its own lines. That is what makes this four pools
rather than one large one, and a line that would read equally well at either
hour belongs in neither.

| slot | DEFAULT | SUPPORTIVE |
|---|---|---|
| **midday** 11:00 | the day is half spent and she is not asking what for | it is the middle of the day and they are doing fine |
| **afternoon** 16:00 | the afternoon is nearly gone, and she declines to enquire | whatever got done was enough |

### The constraints on a line

Every constraint the bank's lines sign, which the tests already hold that corpus
to and must hold this one to as well:

- Under thirty words. At most three sentences, or four when they are clipped.
- Plain sentences. No dashes, no parentheses, no emoji, no exclamation marks, no
  stage directions. A question takes a question mark.
- Never claims to be an AI, a model, or helpful. Never offers assistance.
- Never claims to observe a face, a posture or a room.
- Names no institution. She governed the world and then did not; there is no
  body left to speak for.
- Her name is V.E.R.A., never transliterated.

### The brief

**Generally applicable, and witty** (2026-09-21). A transmission carries no
knowledge of the subject and is not meant to: not how long they were gone, not
how often they come back, not anything said in a conversation. It is the same
line to everyone who could ever receive it, and it has to earn its place anyway.

This was **decided, not conceded.** The mechanism would have forced it either way
— the words are chosen a fortnight before they are read, and the hour is the only
thing about that future day the scheduler can know — but the shape is the one
wanted, and the lines must not read as though they are straining after a fact
they cannot have.

**Witty as the core document means it**, which says `Never zany. Never manic.
Never a pun.` Her wit is dry and observational and the joke is in the
understatement. A transmission is the remark of something with nothing else to
do at eleven in the morning, not a gag.

And so **two constraints that are new here**, following from the brief and from a
line being chosen fourteen days before it is read:

- **A transmission may reference the hour of its own slot and nothing else.** No
  counts, no durations, no dates, no reference to anything said in a
  conversation. The bank's rule is that no line may depend on a fact she was not
  told; this is stricter, because there is no moment underneath it at all.
- **No line may assume the app has been opened.** A transmission fires whether
  or not the subject has looked at her in a week, so it must read correctly to
  someone who was here an hour ago and to someone who has not been back since it
  was scheduled. "You have not been back" fails both tests: she cannot know it at
  11:00, and the scheduler could not have known it a fortnight earlier.

## 4. English only

The lines are English whatever the interface is set to. Only the SYSTEM row's
label translates.

This is a decision, not an omission, and it is the one place in the app where
**her** voice is inconsistent with itself: she will answer in Korean in the
window and arrive in English on the lock screen. The advice room already ships
English cards under a translated label, but its reason does not transfer — that
corpus *is* English, and a translated Kevin Kelly would be a different book.

Accepted on the grounds that forty lines is already the bulk of this work, the
Korean native-speaker pass over the existing sixty-eight bank lines is still
outstanding, and adding eighty more before that lands would make the debt worse
rather than better.

**Reversing it is cheap and the shape should not obstruct it.** The field
becomes `Record<TransmissionSlot, Strings<readonly string[]>>` and `build` stops
ignoring its `lang` argument. Nothing else moves.

## 5. Scheduling

Two `makeDaily` instances, one per slot, sharing one channel.

```ts
const notifierFor = (slot: TransmissionSlot, hour: number, mode: Mode) =>
  makeDaily({
    room: `transmission.${slot}`,
    channel: CHANNEL,
    channelName: 'V.E.R.A.',
    hour,
    days: TRANSMISSION_DAYS,
    plan: planBag,
    count: () => linesFor(mode, slot).length,
    build: (index) => ({ title: TITLE, body: linesFor(mode, slot)[index] }),
  });
```

**Two instances rather than one notifier with two hours.** `cancelOwn` already
keys on `room`, so distinct tags is the whole of what keeps the slots apart —
no change to the cancelling rule, and the two pools can never collide on one
day because they are different pools. `makeDaily` has no side effects at
construction, so these are built per call and **there is no module-level
mutable state**; the register is a parameter threaded through from the store.

**`build` ignores its `lang` argument, and that is where §4 lives.** The
parameter exists for rooms whose content translates. Hers does not, so the one
visible discard is the decision.

### Two additive fields on `DailyConfig`

Both default to today's behaviour. Neither room changes.

| field | default | why she needs it |
|---|---|---|
| `days?: number` | `PLAN_DAYS` (90) | §7 — every register change rewrites the horizon |
| `plan?: Planner` | `planDaily` | below |

`sync` calls `(cfg.plan ?? planDaily)(now, cfg.count(), cfg.hour, cfg.days)`.

### `planBag`, and why `planDaily` will not do

`planDaily` draws `Math.floor(rand() * count)` independently per day. Over
fourteen days from a pool of ten, the chance of at least one pair of adjacent
days carrying the same line is about **seventy-five percent**. The rooms never
meet this — 232 quotes and 6,861 stories — but a ten-line pool meets it most
weeks.

`planBag` deals from a shuffled bag instead, and is built on `deck.ts`
(`newDeck` / `current` / `advance`) rather than shuffling again. That module
already solves the one hard part: the seam between one pass and the next comes
from two different shuffles, so the shuffle cannot keep them apart on its own,
and `advance` swaps the offending card to the back rather than re-drawing. Its
tests already hold that.

```ts
export const planBag: Planner = (now, count, hour, days = PLAN_DAYS, rand = Math.random) => {
  if (count < 1) return [];
  let deck = newDeck(count, rand);
  return planDates(now, hour, days).map((at) => {
    const index = current(deck);
    deck = advance(deck, rand);
    return { at, index };
  });
};
```

**`planDates` is extracted out of `planDaily`** — the date arithmetic and
nothing else. Every `at` is built from local date PARTS rather than by adding
milliseconds, so an hour gained or lost overnight cannot slide the tail of the
plan to ten or twelve; that reasoning must exist once, not twice. `planDaily`
keeps its signature and its behaviour exactly, and becomes `planDates` plus its
random indices.

The `count < 1` guard is new and applies only to the bag: `newDeck(0)` produces
an empty order and `current` would return `undefined`, which would be scheduled
as the literal string "undefined" on the lock screen. `planDaily` has the same
hole (`Math.floor(rand() * 0)` indexes nothing) and is deliberately left alone —
no room can reach it, and widening the fix is not what this is for.

## 6. The horizon is fourteen days

Twenty-eight pending notifications for her against the rooms' ninety each.

The rooms schedule ninety because their corpora never change and the only cost
of a long horizon is that a subject who stops opening the app gets three months
of grace. Hers changes every time the pill is tapped, and §7 is the price of
that — so the horizon is what a register change costs.

| horizon | pending | work per register change |
|---|---|---|
| 90 days | 180 | 180 cancels + 180 schedules |
| **14 days** | **28** | **28 cancels + 28 schedules** |

The accepted consequence is the rooms' own, scaled: stop opening the app for a
fortnight and the transmissions stop. That is a shorter silence to fall into
than the rooms', and it is the same judgement — a feature that needs the app
opened once in two weeks has not failed at anything.

## 7. Changing her register rewrites the queue

Android holds finished text. A pending notification cannot be reinterpreted, so
a register change has to re-plan.

`setMode` fires the resync **after** `saveSoul` and **before**
`speak('mode_set')`, and **unawaited**: twenty-eight cancels and twenty-eight
schedules must not sit between the subject's tap and her line. `sync` swallows
its own failures, so there is nothing to await for correctness.

Switching at 13:00:

```
 11:00 today      already delivered   →  unchanged, see below
 16:00 today      cancelled, replanned →  the new register
 11:00 tomorrow   cancelled, replanned →  the new register
 ...to the end of the horizon
```

**Which of today's firings are still ahead falls out of existing code.**
`planDates` is already "strictly after now" — a sync an hour before the hour
still gets today, one exactly on the hour does not — so each slot works out its
own first date with nothing added.

**A transmission already delivered does not change.** It is in the shade and
Android owns it; nothing in this app can reach back and rewrite it. Switch to
SUPPORTIVE at noon and the 11:00 deadpan line is still sitting there. This is
correct rather than a defect, and is the one visible oddity worth expecting.

**The register is read at schedule time, not fire time.** After a resync the
queue is already correct and stays correct with the app dead. The only way to
receive a stale register is a resync that failed silently — no native module, or
a phone that refused — in which case the next launch's daily sync corrects it.

**Nothing happens when transmissions are off.** The resync sits behind the same
flag as everything else, so a subject who has never switched them on pays
nothing for tapping the pill.

## 8. The channel

`vera.v2`, named `V.E.R.A.`, created at `AndroidImportance.HIGH` with
`enableVibrate` — `ensureChannel`'s existing behaviour, unchanged.

**The id `vera` is poisoned and must not be used.** It was created by v1's
transmissions at importance DEFAULT with vibration off, and it is the id
`DEAD_CHANNELS` deletes at import. Android **restores a deleted channel's
previous settings when the id is recreated**, so reusing it would resurrect a
silent, non-peeking channel — the exact defect fixed for both rooms on
2026-09-14 — with every test still passing and only a phone able to notice.

`DEAD_CHANNELS` keeps `vera` and gains a comment saying the id is poisoned
rather than free, so that a later reading of "she has a channel again, why are
we deleting hers" does not undo it.

`legacyChannel` is deliberately **unset**: the sweep at import already removes
`vera`, and naming it here as well would be two mechanisms deleting one channel.

## 9. Storage

The soul store, not a store of her own. The rooms have their own stores because
they are rooms; this is the shell's own setting, and it sits beside `lang` and
`mode` for the same reason those do.

`SoulBlob` gains two fields:

| field | type | |
|---|---|---|
| `transmissions` | `boolean` | defaults `false` |
| `transmissionsSyncedOn` | `string \| null` | a `toDateString()`, matching `day` and the rooms' stamps |

A blob written before this carries neither, and both read as their defaults —
the same tolerance `mode` already has for blobs written before modes existed.

Two actions on the store:

- `setTransmissions(on)` — requests permission when switching on, refuses to
  store `true` against a refusal (Android never re-prompts, so a row reading ON
  over a phone that will never deliver is worse than one reading OFF), syncs,
  stamps, saves.
- `syncTransmissionsIfDue(now?)` — the boot path, behind `dueForSync`, doing
  nothing at all on the second launch of a day.

**`store.ts → transmissionsNotify.ts` is acyclic** and this is load-bearing:
that module reaches `modules/notify`, `modules/daily`, `deck` and
`modes/registry`, none of which import the store. The moment it needs the store
directly, `setMode` can no longer call it and the register has to travel some
other way — which is the reason it is threaded as a parameter (§5) rather than
read from the store inside `build`.

## 10. The SYSTEM row

`TRANSMISSIONS` / `송신`, under PREFERENCES, **below `BatteryRow` and above the
rooms' rows**.

Hardcoded in `SystemScreen.tsx` rather than contributed through
`ModuleDef.Settings`. That hook exists so the shell never names a *module*; she
is not one, and the two rows already above it are the shell's own.

It calls `transmissionPermission()` **at render**, on `AdviceSettings`' rule, so
a permission revoked in the OS settings does not leave the row claiming ON over
a phone that will never deliver. `blocked` is its own value and says the OS
settings are the only way back.

`T` in `src/shell/strings.ts` gains `transmissions`, `on`, `off` and `blocked` —
the last three are in both rooms' `strings.ts` already but not in the shell's,
and a shell row cannot reach into a room's table.

The name is v1's own word for her reaching out. Only the channel *id* is
poisoned; the vocabulary is not.

## 11. The tap

Nothing. The app opens and `speak('open')` fires, so she greets as usual.

She asked for attention and the subject gave it; the greeting is her
acknowledging that, and the transmission did its work on the lock screen before
the app was ever involved. Showing the same line a second time would be
re-reading something already read — the horror room's `pendingStory` is the
right pattern for a story the subject came to read, and the wrong one here.

`makeDaily` supplies `readTapTarget` and `onTap`; neither is wired, and Android's
default behaviour is exactly what is wanted.

**Both rooms' `owns` already reject a `transmission.*` payload** — the advice
room's widened predicate matches `room === 'advice'` or a numeric `quote`, and
the horror room takes the default — so her cards cannot be read as an index into
someone else's corpus. That is a test, not a mechanism.

## 12. Files

| | |
|---|---|
| modify | `src/vera/modes/types.ts` — `TransmissionSlot`, the `transmissions` field |
| modify | `src/vera/modes/default.ts` — twenty lines |
| modify | `src/vera/modes/supportive.ts` — twenty lines |
| create | `src/vera/transmissions.ts` — pure: `SLOTS`, `TRANSMISSION_DAYS`, `CHANNEL`, `TITLE`, `linesFor` |
| create | `src/vera/transmissionsNotify.ts` — impure: `notifierFor`, `syncTransmissions`, `requestTransmissions`, `transmissionPermission` |
| modify | `src/modules/daily.ts` — extract `planDates`, add `planBag` and `Planner` |
| modify | `src/modules/notify.ts` — `days?` and `plan?` on `DailyConfig`; the `DEAD_CHANNELS` comment |
| modify | `src/core/store.ts` — two state fields, two actions, the resync in `setMode`, `SoulBlob` |
| create | `src/shell/TransmissionRow.tsx` |
| modify | `src/shell/SystemScreen.tsx` — one row |
| modify | `src/shell/strings.ts` — four keys per language |
| modify | `App.tsx` — one call after hydrate |

## 13. Testing

Pure and unit-tested, no React, no expo:

- **`planBag`** — covers the pool before repeating; no adjacent repeat across
  a bag seam; correct dates and hour across a horizon; `count < 1` returns
  empty; a seeded `rand` produces an exact permutation.
- **`planDates` / `planDaily`** — `planDaily`'s existing tests must pass
  unchanged. That is the whole verification that the extraction was behaviour-
  preserving.
- **The pools** — every constraint in §3, over all four, mirroring
  `bank.test.ts`: word count, sentence count, no dashes, no exclamation marks,
  ten lines each, no duplicates within or across pools, and the two new rules
  (§3) as far as a test can see them — no digits, and none of the vocabulary of
  return or absence.

Mocked `expo-notifications`:

- both hours are scheduled, 14 of each
- `channelId` rides on the **trigger** and is `vera.v2`
- `room` tags are distinct per slot
- the body comes from the active register's pool, and changes when the mode does
- a room's `owns` rejects a `transmission.*` payload, and hers rejects theirs

Store:

- `setTransmissions(true)` against a refused permission leaves the flag `false`
- `setMode` triggers a resync when transmissions are on, and does not when off
- the resync does not block `speak('mode_set')`
- `syncTransmissionsIfDue` does nothing twice in one day

**`npm test` cannot see delivery.** The channel, the importance, Freecess and
the hour are all device facts. The suite holds the JS-side contract and the
phone is the detector, exactly as it is for the rooms.

## 14. Costs, and what is not in this

**Pending alarm budget.** 28 hers plus 180 the rooms' is 208. There is no
documented Android ceiling (the 64 is iOS), and this stays well clear of an
untested one.

**Battery → Unrestricted.** Hers are subject to Samsung's Freecess exactly as
the rooms' are, and no change in this repo can alter that. The ask already rides
along inside `makeDaily`'s `request()`, so switching transmissions on is a
moment it fires; `BatteryRow` already says plainly whether it has been done.

Not in scope, and each is cheap to add later:

- **Korean lines** (§4).
- **Configurable times.** 11:00 and 16:00 are fixed, as 09:00 and 22:00 are.
  There is no picker component in this app and adding one is a different
  feature.
- **A separate toggle per slot.** One switch governs both.
- **A greeting that knows it was summoned.** §11 — a sixth stimulus was
  considered and is more copy than the distinction is worth.
- **An emotion on a transmission.** There is no eye on a lock screen.
