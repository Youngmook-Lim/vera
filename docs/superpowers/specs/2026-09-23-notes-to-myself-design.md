# Notes to Myself

Design spec. Module 03. The subject writes a note, picks a time and the days of
the week it should arrive on, and it arrives — on the lock screen, in their own
words, for as long as they leave it switched on. Tapping it opens the room with
that note showing as a card.

It is the first room whose corpus the subject writes, and the first notification
in this app whose text nobody authored in advance.

## 1. What the subject gets

| | |
|---|---|
| title | `NOTES TO MYSELF` |
| body | the note, verbatim |
| when | one time, on any set of weekdays, repeating until switched off |
| data | `{ room: 'notes', id }` |
| tap | opens module 03 with that note dealt as a card |

```
NOTES TO MYSELF                                    the list
  09:00   M W F        Call the dentist               ●
  14:00   M T W T F    Stand up                       ●
  18:00   S S          Water the plant                ○
  + NEW NOTE
```

## 2. Why `WEEKLY`, and why `makeDaily` goes unused

The rooms hand Android ninety **dated** notifications with their text baked in,
and `2026-09-04-daily-advice-design.md` §3 is the reasoning: *a repeating trigger
cannot vary its content*, and the advice room's content must vary. The price is a
queue that runs dry after ninety days of not opening the app, and a re-plan every
morning.

**A note does not vary.** Its text is whatever the subject typed, and it is the
same text next Tuesday. So the constraint that shaped both rooms does not apply
here, and its opposite does: a repeating trigger is exactly right.

```ts
{ type: SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId }
```

One per selected day. A note on Mon/Wed/Fri is three pending notifications that
fire **forever**, with no horizon, no `dueForSync`, no re-planning, and no
silence after a fortnight away.

`channelId` rides on the **trigger** here as it does everywhere else — the
`WeeklyTriggerInput` type carries the field and the content type rejects it.

So this module uses `makeDaily` not at all. What it takes from
`src/modules/notify.ts` is the channel discipline (§7) and the shape of the
`data` tag that makes cancelling precise.

## 3. The note

```ts
export interface Note {
  id: string;
  text: string;
  hour: number;              // 0-23
  minute: number;            // 0-59, in five-minute steps (§10)
  days: readonly number[];   // 0 = Sunday — Date.getDay()'s order (§5)
  enabled: boolean;
}
```

`enabled` is a switch, not a deletion. An alarm you want back next month should
not have to be retyped, and a note you wrote at a bad time is worth keeping even
while it is silent.

`id` is what the notification carries and what cancelling matches on, so it must
survive an edit: editing a note's text or its time keeps the id and replaces its
triggers.

## 4. Three faces, where the rooms have two

The other two rooms are a card and a list. This one is a card, a list, and an
**editor**, because the corpus is the subject's to write.

- **The list is the front door.** Opening the room from the cabinet shows the
  notes, each row carrying its time, its days, its text and its own switch. This
  differs from both rooms, which open on a card — but there is nothing to deal
  here. A note is not drawn at random; it is a thing you made.
- **The editor** opens from a row, or from `+ NEW NOTE` with a blank. Text, a
  time, the days, and a delete.
- **The card** is what a tapped notification opens to: that one note, alone,
  centred, the way the advice room shows a quote. Set in **Instrument Serif**,
  for the same reason the advice cards are — it is a thing worth reading rather
  than a row in a table, and it is the subject's own sentence being handed back
  to them at the hour they asked for it.

Back from the card or the editor returns to the list; back from the list leaves
the room. `stepBack` already walks the view stack, but these three faces live
**inside** the module, so they are the module's own state, exactly as `listing`
is in both rooms. The shell knows about `mod03` and nothing finer.

## 5. Three indexings of one concept

| | |
|---|---|
| Expo's `weekday` | **1–7**, 1 = Sunday |
| `Date.getDay()` | **0–6**, 0 = Sunday |
| the row `M T W T F S S` | Monday first |

An off-by-one with three places to hide, so it gets a pure module —
`src/modules/notes/schedule.ts` — and no arithmetic anywhere else.

**The stored canonical is `Date.getDay()`'s**: 0 = Sunday, 0–6. It is the
platform's own indexing rather than one library's, so a stored note does not
carry expo-notifications' convention in it forever.

```ts
export const toExpoWeekday = (day: number): number => day + 1;
export const DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];
export const triggersFor = (note: Note): WeeklyTrigger[] => …
```

`triggersFor` is the whole of the translation: a note in, one trigger per day
out, empty when the note is disabled or has no days. Pure, and the one place the
conversion happens.

## 6. Scheduling and cancelling

Every write goes through one path: **cancel this note's triggers, then schedule
its current ones.** Matching is on `data.room === 'notes' && data.id === id`, so
editing one note never touches another's — the per-room rule the two rooms
already follow, one level finer because this room holds many independent things.

A **full reconcile** runs at boot: cancel everything the room owns, reschedule
every enabled note. It is idempotent, it is cheap at this volume, and it is what
makes a queue that has drifted — a failed write, a half-applied edit — correct
itself without the subject knowing.

Expo registers a `RECEIVE_BOOT_COMPLETED` receiver and restores scheduled
notifications after a device restart, so the boot reconcile is insurance rather
than the mechanism.

## 7. The channel, and the one change to shared code

**`ensureChannel` comes out of `makeDaily` and becomes a standalone export of
`src/modules/notify.ts`.** `makeDaily` calls it; this module calls it.

That is not tidying. Both rooms' channels sat at importance 3 with vibration off
for weeks, arriving silently, because the channel-creation rule lived in one
place and the understanding of it in another — and a second hand-rolled copy of
`setNotificationChannelAsync` is the most direct way to reproduce that. The rule
is: **importance HIGH, `enableVibrate` named explicitly** (the native side
applies it only `if (args.containsKey(...))`), and a channel id is never reused
after deletion, because Android restores a deleted channel's old settings.

This room's channel is **`notes.v1`**, named from the module's own `strings.ts`
so the row in Android's settings and the room cannot drift apart.

## 8. Storage

A store of its own, `facility.mod.notes`, on the rooms' pattern. Nothing about
it reaches her soul or the transcript.

| | |
|---|---|
| key | `facility.mod.notes` |
| engine | AsyncStorage |
| contents | the notes, in the order they were made |

`serialize` picks its fields by name, as both rooms' do, so a field added to the
runtime state does not silently reach the disk.

A blob that fails to parse costs the notes and not the room: `parse` returns an
empty list rather than throwing, and any note in it missing a field is dropped
rather than being loaded half-formed and scheduled.

## 9. The tap

`pendingNote: string | null` on the facility store, beside `pendingQuote` and
`pendingStory`, read once and cleared. The room reads it as *open on the card,
showing this one*.

**Deliberately not persisted**, for the reason the other two are not: a tap is a
thing that just happened, and one surviving a restart would re-open a note from a
notification tapped hours ago.

A tap on a note whose id no longer exists — deleted between the notification
firing and the tap — opens the list, not an empty card.

The room needs no API key. A tap opens it on a dormant stage exactly as the
other two do.

## 10. Limits, and why each one is where it is

| | | |
|---|---|---|
| notes | **20** | 7 days each is 140 pending, over the rooms' 180 and the transmissions' 28. Android's practical ceiling is around 500 and this stays well clear of an untested one. |
| note text | **200 characters** | The horror corpus caps its sentences at 200 for the same reason: past that a notification body is truncated by the launcher and the card stops being a card. |
| minute | **five-minute steps** | The picker is built from scratch (§11) and sixty positions is a worse control than twelve. No reminder of this kind needs 09:07, and it is one constant to change if that turns out to be wrong. |

A note with **no days selected** cannot be saved. The editor's save refuses, on
the `SEND` rule — a control that accepts a tap and does nothing is worse than one
that plainly cannot be pressed.

The permission ceremony rides on **saving the first note**, which is the moment
it begins to matter, and carries the battery ask with it exactly as
`makeDaily`'s `request()` does. Not on opening the room: the room is readable
with notifications refused, and a prompt at the threshold would fire before the
subject had made anything.

## 11. The room's look

Its own ink in `palette.notes`, and its accent read from `EMOTIONS[emotion].iris`
at render, like both rooms — walk in after she was alarmed and the room is red.
This remains the one place a module reaches into her state, and the traffic still
runs only that way: she is told nothing about what is in here, and this room is
the strongest case for that rule yet, since the content is literally the
subject's.

The ink is **quiet and cool** — the lane advice (warm) and horror (near-black)
leave open. A note to yourself should not look like a warning.

**The picker is built, not imported.** `@react-native-community/datetimepicker`
would render Android's own clock dialog in the middle of a screen where every
hex comes from `palette`, and it is a native dependency, so nothing about this
module could be seen without a rebuild. Two columns of numbers and a row of
seven day toggles, in the app's own language, cost more to write and nothing to
look at.

`@react-native-community/slider` was removed in the v2 cut for the same reason;
this is that decision holding.

## 12. Files

| | |
|---|---|
| create | `src/modules/notes/schedule.ts` — pure: the three indexings, `triggersFor`, validation |
| create | `src/modules/notes/stored.ts` — `Note`, `serialize`, `parse` |
| create | `src/modules/notes/store.ts` — the list, and the write-then-schedule path |
| create | `src/modules/notes/notify.ts` — impure: schedule, cancel, reconcile, permission |
| create | `src/modules/notes/strings.ts` — `T`, en/ko |
| create | `src/modules/notes/TimePicker.tsx` · `DayPicker.tsx` · `NoteEditor.tsx` |
| create | `src/modules/notes/index.tsx` — `ModuleDef`: Tile, Screen, `onBoot` |
| modify | `src/modules/notify.ts` — export `ensureChannel` |
| modify | `src/modules/registry.ts` — one line |
| modify | `src/core/storage.ts` — `KEYS.notes` |
| modify | `src/core/store.ts` — `pendingNote` |
| modify | `src/core/theme.ts` — `palette.notes` |

## 13. Testing

Pure, and where most of the risk is:

- **`schedule.ts`** — `toExpoWeekday` over all seven days against a hand-written
  table, never a formula that could match the bug; `DISPLAY_ORDER` is a
  permutation of 0–6 starting at Monday; `triggersFor` emits one trigger per day
  in the right order, nothing when disabled, nothing when `days` is empty.
- **`stored.ts`** — a round trip; a blob with a malformed note drops that note
  and keeps the rest; a blob that is not JSON gives an empty list.

Mocked `expo-notifications`:

- one `WEEKLY` trigger per selected day, carrying `channelId`
- editing a note cancels **only** its own ids
- a disabled note schedules nothing
- the boot reconcile is idempotent — running it twice leaves one set
- the other rooms' and the transmissions' `owns` all reject a `notes` payload,
  and this room's rejects theirs

Components:

- the list renders a row per note, and its switch writes through
- saving with no days selected is refused
- the editor keeps the id across an edit
- a tap with a `pendingNote` opens the card; an unknown id opens the list

**`npm test` cannot see delivery.** The channel, the importance, the hour and
Freecess are device facts, as they are for everything else here.

## 14. Not in scope

- **A SYSTEM row.** Each note carries its own switch where the subject can see
  it; a master switch on another screen would be a second place to look and a
  second thing to disagree with.
- **Snoozing, or actions on the notification.** A note is read and dismissed.
- **One note at several times.** One time, many days — the alarm-app model. Two
  times is two notes, which keeps each row one thing.
- **Anything reaching her.** The doorway rule: she is not told this room exists,
  and its contents never enter her record, her transcript or her prompt.
