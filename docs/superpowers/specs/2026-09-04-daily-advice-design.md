# The daily advice notification

Design spec. Module 02 (`EXCELLENT ADVICE`) sends one quote a morning at 09:00.
Tapping it opens the room with that quote already dealt.

This reverses a v2 decision. The overhaul spec cut `expo-notifications` outright
and CLAUDE.md records that v2 has "no notifications, no permission ceremony, and
no background work of any kind". The first two clauses stop being true here. The
third does not: there is still no background work, and §3 is the consequence of
holding that line.

## 1. What the subject gets

At 09:00 every morning, a notification carrying one of the book's 232
highlights. Tapping it opens the app on module 02 in shuffle mode with that
exact quote showing, its star live, so it can be kept or let go from there.

Off by default. Turned on from a row in SYSTEM, which is also the user action
Android requires before the permission can be asked for.

It works with no API key. The quotes are a book on a shelf and need no
credential — see §7 for what that costs.

## 2. Whose voice it is

The book's, not hers and not the building's.

| field | content |
|---|---|
| title | `EXCELLENT ADVICE` — from the module's own `strings.ts`, so it translates |
| body | the quote, then `— Kevin Kelly` |
| data | `{ quote: <index into QUOTES> }` |

v1's notifications came from `The Facility` and were written in its register.
This one is not in anyone's register. She is told nothing about module 02 and
that does not change here: putting her name on a line she never composed is the
thing `systemNotice` is deliberately styled to prevent, and the doorway rule
would have to be reopened to let her know the room exists at all.

## 3. Why the queue is finite

**A repeating trigger cannot vary its content.**
`SchedulableTriggerInputTypes.DAILY` fires the same body every day forever;
content is fixed when the notification is handed over. To vary the quote, each
day must be its own `DATE`-triggered notification with its text already written
into it.

**Nothing of ours is awake at 09:00.** Android holds the scheduled notifications
and fires them; the app is not running and is not consulted. So the quote cannot
be chosen at delivery time — the randomness happens at scheduling time, and the
app opening is the only event that can schedule anything.

This is the same shape v1 used (`planTransmissions` — a pure planner emitting
dated notifications, an impure executor behind a lazy `require`), and it is
still the only shape that varies the content without background work.

The consequence, accepted: **stop opening the app for 90 days and the
notifications stop.** Two alternatives were considered and rejected.

- A `DAILY` repeating trigger behind the dated ones removes the silence but
  replaces it with the same quote every morning, forever. A feature that goes
  quiet is better than one that goes wrong.
- Background work to regenerate the queue has no failure mode of its own, but
  reverses the third clause of the v2 decision and depends on Android
  scheduling that is deferred and killed aggressively enough to need its own
  verification pass.

## 4. Scheduling

```
planDaily(now, count, days, rand) -> { at: Date; index: number }[]
```

Pure. No expo, no React, no store. Emits one entry per day at `NOTIFY_HOUR`
(09), starting at the next 09:00 **strictly after** `now` — so a sync at 08:00
includes today and one at 10:00 starts tomorrow. Each `at` is built from local
date parts, so a DST shift lands on 09:00 local rather than 08:00 or 10:00.
`index` is `Math.floor(rand() * count)`; `rand` is injected so a test can pin a
plan exactly.

`PLAN_DAYS` is **90**. There is no documented Android ceiling on pending
notifications (the 64 limit is iOS, and this app is Android-only), so the number
is chosen to stay well clear of an untested one rather than to approach it. Three
months without opening the app means the feature has already failed at its job.

**Synced at most once a day.** The horizon slides — every sync cancels what is
pending and hands over a fresh 90 days from now — but doing that on every launch
would be ~90 cancels and ~90 native schedule calls in the boot path, almost
always producing an identically-shaped result. The module's store records the
date of the last sync and the boot path skips when it already ran today.

`syncedOn` is a `Date.toDateString()` string, matching the soul store's `day`
convention and compared the same way, so the two agree about when a day turns
over and neither has to reason about timezones.

Sync is called from `App.tsx`'s boot effect after hydrate — the module's store
must be read before it can be known whether the feature is even on — and again
immediately when the toggle is switched on, which does not wait for the next
launch.

A consequence worth stating: because each sync re-draws, no specific quote is
ever "assigned" to a specific future date. Draws made today are replaced by
draws made tomorrow. Nothing observable changes, since the replaced ones were
never seen.

`cancelAllScheduledNotificationsAsync` assumes this feature owns every
notification the app schedules. That is true today and a comment will say so.

## 5. Files

**`src/modules/advice/daily.ts`** — pure. `NOTIFY_HOUR`, `PLAN_DAYS`,
`planDaily`, and `dueForSync(syncedOn: string | null, now: Date): boolean`,
which is true when `syncedOn` is not `now`'s `toDateString()`.

**`src/modules/advice/notify.ts`** — the impure half, behind a lazy
`require('expo-notifications')` inside a try/catch, so a build without the
native module degrades to doing nothing rather than crashing. Owns
`setNotificationChannelAsync`, the permission request, and
`sync(enabled, now)`.

**`src/modules/advice/stored.ts`** — `parse` and `serialize` move out of
`favorites.ts`, which goes back to being only favorites logic (`toggle`,
`displayOrder`). The blob now holds three unrelated things and the file that
owns it should not be named after one of them.

```
facility.mod02.advice
{ "favorites": [...], "daily": true, "syncedOn": "Fri Sep 04 2026" }
```

## 6. The toggle, and the registry

The row lives in SYSTEM under PREFERENCES, beside LANGUAGE and LAUNCHER. But
SYSTEM naming `EXCELLENT ADVICE` would make it the third file hardcoding a
module, against `registry.ts`'s own promise that a new module is one folder plus
one line.

So `ModuleDef` gains an optional `Settings?: ComponentType`. `SystemScreen`
renders whatever the registry's modules contribute; module 02 supplies its own
row. The shell still names nothing, and a third module's preferences cost
nothing to add.

```
PREFERENCES
  LANGUAGE          EN / ko
  LAUNCHER          Amused
  DAILY ADVICE      OFF
```

Three states, because **Android never re-prompts after a refusal**:

| state | meaning |
|---|---|
| `OFF` | not enabled; pressing requests the permission |
| `ON` | enabled and scheduled |
| `BLOCKED` | permission refused; the row says the OS settings are the only way back |

The state is read from `getPermissionsAsync()` **at render**, the way the
LAUNCHER row already reads the launcher's actual face rather than what was last
asked for. `granted` false with `canAskAgain` false is `BLOCKED`; `granted` true
with the store's `daily` false is `OFF`. This is also what surfaces a permission
revoked in the OS settings after the fact: the store would still say `daily`,
and only reading the real permission catches that nothing is arriving.

Switching the row off cancels everything scheduled and writes `daily: false`. It
does not and cannot revoke the OS permission.

## 7. The tap

The store gains `pendingQuote: number | null` and `openQuote(index)`, which sets
`view: 'mod02'` and closes the cabinet. `AdviceScreen` consumes `pendingQuote` on
mount — `goTo` that card, then clear it — landing in shuffle mode with the quote
up and its star live. The list toggle is untouched, so the room behaves normally
from that point on.

Both delivery paths are wired in `App.tsx`'s existing boot effect, behind the
same lazy require:

| the app was | API |
|---|---|
| not running | `getLastNotificationResponseAsync()`, after hydrate |
| already running | `addNotificationResponseReceivedListener` |

Because the room works while she is dormant, a tap opens module 02 with no key —
the one way into a cabinet room that does not go through the cabinet, which a
dormant stage does not offer. The exit returns to the dormant stage. This is
deliberate and is the cost of §1's last line.

## 8. Testing

Pure and unit-tested, no React: `planDaily` (90 entries, all at 09:00 local,
first strictly after `now`, indices in range, deterministic under an injected
`rand`, correct across a DST boundary) and `dueForSync`.

Mocked expo-notifications: `sync` cancels before scheduling; disabled cancels
and schedules nothing; a missing native module is swallowed; the channel is
created before anything is scheduled.

Store: `daily` and `syncedOn` round-trip through the real save and load paths; a
blob written by the previous version (favorites only) parses with `daily` false.

Screen: `pendingQuote` lands on that quote in shuffle mode and is cleared;
`ModuleDef.Settings` renders in SYSTEM from the registry; the row's three states.

None of this can observe a notification actually arriving. That is on-device
verification, and so is the tap from a cold start.

## 9. Costs

- `expo-notifications` is native: another `--profile development` build before
  any of this can be seen.
- CLAUDE.md's "no notifications, no permission ceremony" is rewritten. "No
  background work of any kind" survives, and §3 is why.
- `app.json` gains the plugin block and a notification icon and colour.
- A refusal of the OS permission is permanent from inside the app.
- 90 days of not opening the app ends the notifications until it is opened.
