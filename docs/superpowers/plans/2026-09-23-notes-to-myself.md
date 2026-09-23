# Notes to Myself — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Module 03. The subject writes a note, picks a time and the weekdays it should arrive on, and it arrives on the lock screen in their own words until switched off. Tapping it opens the room with that note as a card.

**Architecture:** One `WEEKLY` trigger per selected day, repeating forever — `makeDaily` and its ninety-day horizon go unused, because a note's text never varies. Three indexings of "weekday" are contained in one pure module. `ensureChannel` leaves `makeDaily` to become a shared export rather than being hand-rolled a second time.

**Tech Stack:** TypeScript, expo-notifications (lazily required), Zustand, jest + RTL v14.

**Spec:** `docs/superpowers/specs/2026-09-23-notes-to-myself-design.md`

## Global Constraints

- **Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.**
- **No test may make a real network request.** Mock `src/vera/llm.ts` with a `jest.requireActual` spread so `AuthError` stays a real class.
- All copy verbatim from the module's own `strings.ts`; all hex from `palette` in `src/core/theme.ts`.
- **Repo style is single quotes.**
- Verify with `npm test` and `npx tsc --noEmit`.
- RTL v14 is fully async: `await render(...)`, `await fireEvent.press(...)`, **`await view.unmount()`**.
- **The doorway rule (spec §4).** The shell owns the tile, the full bleed, one exit top-left at 44px in the module's own ink, and her dot. Everything past the threshold belongs to the module. The shell names no module beyond its line in `registry.ts`.
- Touch only what the task names. Do not "improve" adjacent code, comments, or formatting.
- Commits carry no reference to the model or the tool that wrote them.
- Baseline before starting: **860 tests, 63 suites, tsc clean.**

---

## File Structure

| file | responsibility |
|---|---|
| `src/modules/notes/stored.ts` | **create** — `Note`, `serialize`, `parse` |
| `src/modules/notes/schedule.ts` | **create** — pure: the three weekday indexings, `triggersFor`, the limits, `isSavable` |
| `src/modules/notify.ts` | **modify** — `ensureChannel` becomes a standalone export |
| `src/modules/notes/notify.ts` | **create** — impure: schedule, cancel, reconcile, permission |
| `src/modules/notes/store.ts` | **create** — the list, and the write-then-reschedule path |
| `src/modules/notes/strings.ts` | **create** — `T`, en/ko |
| `src/modules/notes/TimePicker.tsx` | **create** — two columns of numbers |
| `src/modules/notes/DayPicker.tsx` | **create** — seven toggles, Monday first |
| `src/modules/notes/NoteEditor.tsx` | **create** — text, time, days, save, delete |
| `src/modules/notes/index.tsx` | **create** — `ModuleDef`: Tile, Screen (list · card · editor), `onBoot` |
| `src/core/theme.ts` | **modify** — `palette.notes` |
| `src/core/storage.ts` | **modify** — `KEYS.notes` |
| `src/core/store.ts` | **modify** — `pendingNote`, `openNote` |
| `src/modules/registry.ts` | **modify** — one line |

Eight tasks. Tasks 1–2 are pure; Task 1 defines the `Note` every other task imports. Task 3 is the shared-machinery change and must land before Task 4. Tasks 6–8 are the room itself.

---

## Task 1: What a note is, and how it survives

**Files:**
- Create: `src/modules/notes/stored.ts`
- Test: `src/modules/notes/__tests__/stored.test.ts`

**Interfaces:**
- Produces: `Note`, `Stored`, `EMPTY_STORED`, `serialize(s: Stored): string`, `parse(raw: string | null): Stored`.

**First, because everything imports `Note`.** `schedule.ts` types its parameter on it and the store is a list of them.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/notes/__tests__/stored.test.ts`:

```ts
import { EMPTY_STORED, type Note, parse, serialize } from '../stored';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, ...over,
});

describe('a blob of notes', () => {
  it('comes back as it went in', () => {
    const stored = { notes: [note(), note({ id: 'n2', enabled: false })] };
    expect(parse(serialize(stored))).toEqual(stored);
  });

  it('is empty when there is nothing on the disk', () => {
    expect(parse(null)).toEqual(EMPTY_STORED);
  });

  // A blob half-written by a dying process must cost the notes, never the room.
  it('is empty when the disk holds something that is not JSON', () => {
    expect(parse('{ not json')).toEqual(EMPTY_STORED);
  });

  // Dropped rather than loaded half-formed: a note with no days or no hour
  // would be scheduled, and what it would do then is nobody's intention.
  it('drops a note that is missing a field and keeps the rest', () => {
    const raw = JSON.stringify({
      notes: [note(), { id: 'n2', text: 'no hour', days: [1], enabled: true }],
    });
    expect(parse(raw).notes).toEqual([note()]);
  });

  it('drops a note whose days are not days', () => {
    const raw = JSON.stringify({ notes: [{ ...note(), days: ['monday'] }] });
    expect(parse(raw).notes).toEqual([]);
  });

  it('keeps the order they were made in', () => {
    const stored = { notes: [note({ id: 'a' }), note({ id: 'b' }), note({ id: 'c' })] };
    expect(parse(serialize(stored)).notes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/modules/notes/__tests__/stored.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write it**

Create `src/modules/notes/stored.ts`:

```ts
// The whole of what module 03 keeps on disk. The first room whose corpus the
// subject writes, so unlike the two that deal from a fixed book, the content
// IS the stored thing rather than a set of marks against one.

export interface Note {
  // Carried on every notification and matched when cancelling, so it has to
  // survive an edit: changing a note's words or its hour keeps the id and
  // replaces its triggers.
  id: string;
  text: string;
  hour: number;
  minute: number;
  // Date.getDay()'s order, 0 = Sunday. See schedule.ts for why the stored
  // indexing is the platform's rather than expo's.
  days: readonly number[];
  // A switch, not a deletion. An alarm wanted back next month should not have
  // to be retyped.
  enabled: boolean;
}

export interface Stored {
  notes: readonly Note[];
}

export const EMPTY_STORED: Stored = { notes: [] };

export const serialize = (s: Stored): string =>
  JSON.stringify({
    notes: s.notes.map((n) => ({
      id: n.id, text: n.text, hour: n.hour, minute: n.minute,
      days: [...n.days], enabled: n.enabled,
    })),
  } satisfies Stored);

const isDay = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 6;

const readNote = (v: unknown): Note | null => {
  const n = v as Partial<Note> | null;
  if (!n || typeof n !== 'object') return null;
  if (typeof n.id !== 'string' || n.id === '') return null;
  if (typeof n.text !== 'string') return null;
  if (typeof n.hour !== 'number' || n.hour < 0 || n.hour > 23) return null;
  if (typeof n.minute !== 'number' || n.minute < 0 || n.minute > 59) return null;
  if (!Array.isArray(n.days) || !n.days.every(isDay)) return null;
  if (typeof n.enabled !== 'boolean') return null;
  return { id: n.id, text: n.text, hour: n.hour, minute: n.minute, days: n.days, enabled: n.enabled };
};

// A note missing a field is DROPPED rather than defaulted. Both rooms default
// a missing field and lose nothing by it, because theirs are preferences over
// a corpus that exists either way. Here the note is the content: one with no
// hour has no correct hour to fall back to, and scheduling it at midnight
// would be the app inventing an instruction the subject never gave.
export const parse = (raw: string | null): Stored => {
  if (!raw) return EMPTY_STORED;
  try {
    const blob = JSON.parse(raw) as Partial<Stored>;
    if (!Array.isArray(blob.notes)) return EMPTY_STORED;
    return { notes: blob.notes.map(readNote).filter((n): n is Note => n !== null) };
  } catch {
    return EMPTY_STORED;
  }
};
```

- [ ] **Step 4: Run and mutation-check**

Run: `npx jest src/modules/notes && npx tsc --noEmit`

- drop the `readNote` filter (`blob.notes as Note[]`) → the missing-field test fails
- `isDay` loosened to `typeof v === 'number'` → nothing fails; **add a test** for `days: [9]` if so
- remove the `try/catch` → the not-JSON test fails

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes/stored.ts src/modules/notes/__tests__/stored.test.ts
git commit -m "feat: a note, and a blob that drops what it cannot read"
```

---

## Task 2: The weekday module

**Files:**
- Create: `src/modules/notes/schedule.ts`
- Test: `src/modules/notes/__tests__/schedule.test.ts`

**Interfaces:**
- Produces: `toExpoWeekday(day: number): number`, `DISPLAY_ORDER: readonly number[]`, `triggersFor(note: Note): WeeklyTrigger[]`, `isSavable(draft): boolean`, and the constants `MAX_NOTES`, `MAX_TEXT`, `MINUTE_STEP`.
- Consumes: `Note` from `./stored` (Task 1).

**Why this is early:** three indexings of one concept — Expo's 1–7 Sunday-first, `Date.getDay()`'s 0–6 Sunday-first, and the row's Monday-first — is an off-by-one with three places to hide, and it is the only arithmetic in this module.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/notes/__tests__/schedule.test.ts`:

```ts
import { DISPLAY_ORDER, MINUTE_STEP, isSavable, toExpoWeekday, triggersFor } from '../schedule';
import type { Note } from '../stored';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  text: 'Stay positive',
  hour: 9,
  minute: 0,
  days: [1, 3, 5],
  enabled: true,
  ...over,
});

describe('the weekday a notification is filed under', () => {
  // A TABLE, never a formula. A test that recomputes `day + 1` would agree
  // with an implementation that had the offset wrong in the same direction.
  it('is expo’s, which counts from one and starts on Sunday', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('puts Sunday at one and Saturday at seven', () => {
    expect(toExpoWeekday(0)).toBe(1);
    expect(toExpoWeekday(6)).toBe(7);
  });
});

describe('the order the row reads in', () => {
  it('starts on Monday and ends on Sunday', () => {
    expect(DISPLAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('is every day exactly once', () => {
    expect([...DISPLAY_ORDER].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('what a note asks Android for', () => {
  it('is one trigger a day, at the note’s own hour', () => {
    expect(triggersFor(note())).toEqual([
      { weekday: 2, hour: 9, minute: 0 },
      { weekday: 4, hour: 9, minute: 0 },
      { weekday: 6, hour: 9, minute: 0 },
    ]);
  });

  // Sunday is 0 stored and 1 to expo, so a note including it is where an
  // off-by-one shows up as a notification on the wrong day.
  it('files a Sunday note under expo’s first weekday', () => {
    expect(triggersFor(note({ days: [0] }))).toEqual([{ weekday: 1, hour: 9, minute: 0 }]);
  });

  it('asks for nothing at all while the note is switched off', () => {
    expect(triggersFor(note({ enabled: false }))).toEqual([]);
  });

  it('asks for nothing when no day is chosen', () => {
    expect(triggersFor(note({ days: [] }))).toEqual([]);
  });

  it('is in day order however the days were chosen', () => {
    expect(triggersFor(note({ days: [5, 0, 3] })).map((t) => t.weekday)).toEqual([1, 4, 6]);
  });
});

describe('whether a draft can be saved', () => {
  it('needs something to say', () => {
    expect(isSavable({ text: '', days: [1] })).toBe(false);
    expect(isSavable({ text: '   ', days: [1] })).toBe(false);
  });

  // A note with no day never fires. Saving it would be a control that accepts
  // a tap and does nothing, which is the rule SEND already follows.
  it('needs a day to arrive on', () => {
    expect(isSavable({ text: 'Stay positive', days: [] })).toBe(false);
  });

  it('takes a note with both', () => {
    expect(isSavable({ text: 'Stay positive', days: [1] })).toBe(true);
  });

  it('refuses more than a notification body can show', () => {
    expect(isSavable({ text: 'x'.repeat(201), days: [1] })).toBe(false);
    expect(isSavable({ text: 'x'.repeat(200), days: [1] })).toBe(true);
  });
});

describe('the minute', () => {
  it('moves in steps the picker can offer', () => {
    expect(60 % MINUTE_STEP).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/modules/notes`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write it**

Create `src/modules/notes/schedule.ts`:

```ts
import type { Note } from './stored';

// The only arithmetic in this room, in the only file allowed to do it.
//
// "Weekday" means three different things here and they are one apart:
//
//   Date.getDay()   0-6, Sunday first   ← what a Note stores
//   expo's weekday  1-7, Sunday first   ← what a trigger wants
//   the row         Monday first        ← what the subject reads
//
// The STORED one is the platform's, not the library's: a note on disk should
// not carry expo-notifications' convention in it forever.

export const toExpoWeekday = (day: number): number => day + 1;

// The row reads Monday to Sunday, which is neither of the other two.
export const DISPLAY_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export interface WeeklyTrigger {
  weekday: number;
  hour: number;
  minute: number;
}

// One per day the note is set for, in day order rather than the order they
// were tapped, so two notes with the same days queue identically.
//
// A note that is off, or has no day, asks for nothing — which is what makes
// the switch and an emptied day row the same operation to everything
// downstream, rather than two cases every caller has to know about.
export const triggersFor = (note: Note): WeeklyTrigger[] => {
  if (!note.enabled) return [];
  return [...note.days]
    .sort((a, b) => a - b)
    .map((day) => ({ weekday: toExpoWeekday(day), hour: note.hour, minute: note.minute }));
};

// Twenty notes at seven days each is 140 pending notifications, on top of the
// rooms' 180 and the transmissions' 28. There is no documented Android
// ceiling, so this stays well clear of an untested one.
export const MAX_NOTES = 20;

// The horror corpus caps its sentences here for the same reason: past this a
// notification body is truncated by the launcher, and the card it opens to
// stops being a card.
export const MAX_TEXT = 200;

// The picker is built rather than imported, and sixty positions is a worse
// control than twelve. One constant if that turns out to be wrong.
export const MINUTE_STEP = 5;

export const isSavable = (draft: { text: string; days: readonly number[] }): boolean =>
  draft.text.trim().length > 0 && draft.text.length <= MAX_TEXT && draft.days.length > 0;
```

- [ ] **Step 4: Run, and mutation-check**

Run: `npx jest src/modules/notes && npx tsc --noEmit`
Expected: PASS.

Then break each and confirm a named test fails, restoring after each:
- `day + 1` → `day` → the table test fails
- `day + 1` → `day === 0 ? 7 : day` → the Sunday test fails (a plausible wrong fix)
- `DISPLAY_ORDER` → `[0,1,2,3,4,5,6]` → the Monday-first test fails
- drop the `.sort()` → the day-order test fails
- `if (!note.enabled) return []` deleted → the switched-off test fails
- `days.length > 0` dropped from `isSavable` → the no-day test fails

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes/schedule.ts src/modules/notes/__tests__/schedule.test.ts
git commit -m "feat: the one file allowed to do weekday arithmetic"
```

---

## Task 3: `ensureChannel` becomes shared

**Files:**
- Modify: `src/modules/notify.ts`
- Test: `src/modules/__tests__/notify.test.ts`

**Interfaces:**
- Produces: `export const ensureChannel = (cfg: ChannelConfig) => Promise<void>` where `ChannelConfig` is `{ channel: string; channelName: string; legacyChannel?: string }`. `DailyConfig` already satisfies it structurally, so `makeDaily`'s call becomes `await ensureChannel(cfg)`.

**Why:** module 03 needs the identical rule — importance HIGH, `enableVibrate` named explicitly because the native side applies it only `if (args.containsKey(...))`, and never a recycled id. Both rooms' channels sat at importance 3 with vibration off for weeks; a second hand-rolled `setNotificationChannelAsync` is the most direct way to do that again.

- [ ] **Step 1: Write the failing test**

Append to `src/modules/__tests__/notify.test.ts`:

```ts
// Module 03 does not use makeDaily at all — a note's text never varies, so it
// uses repeating WEEKLY triggers rather than a dated horizon. It needs this
// rule and nothing else from this file, and a second copy of it is how both
// rooms shipped silent.
describe('the channel rule, on its own', () => {
  it('is HIGH and vibrates, for a caller that is not a room', async () => {
    await ensureChannel({ channel: 'solo.v1', channelName: 'SOLO' });

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'solo.v1',
      expect.objectContaining({
        name: 'SOLO',
        importance: 6,
        enableVibrate: true,
      }),
    );
  });

  it('takes an old channel away when one is named', async () => {
    await ensureChannel({ channel: 'solo.v2', channelName: 'SOLO', legacyChannel: 'solo.v1' });
    expect(mocked.deleteNotificationChannelAsync).toHaveBeenCalledWith('solo.v1');
  });

  it('never deletes the channel it just made', async () => {
    await ensureChannel({ channel: 'solo.v1', channelName: 'SOLO', legacyChannel: 'solo.v1' });
    expect(mocked.deleteNotificationChannelAsync).not.toHaveBeenCalledWith('solo.v1');
  });
});
```

Update the import:

```ts
import { ensureChannel, makeDaily } from '../notify';
```

**Note:** `importance: 6` is `AndroidImportance.HIGH` in expo's enum. Read the value the existing "how loudly a card arrives" test asserts and use the same expression it does rather than a bare literal if it uses one.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/modules/__tests__/notify.test.ts`
Expected: FAIL — `ensureChannel` is not exported.

- [ ] **Step 3: Lift it out of the closure**

In `src/modules/notify.ts`, move the function to module scope, above `makeDaily`, keeping its comment block verbatim and adding one paragraph:

```ts
export interface ChannelConfig {
  channel: string;
  channelName: string;
  legacyChannel?: string;
}

// …the existing comment block, unchanged, then:
//
// Standalone rather than a closure inside makeDaily (2026-09-23), because
// module 03 needs this rule and does not use makeDaily: a note's text never
// varies, so it schedules repeating WEEKLY triggers instead of a dated
// horizon. `DailyConfig` satisfies ChannelConfig structurally, so the rooms'
// call site is unchanged apart from what it passes.
export const ensureChannel = async (cfg: ChannelConfig): Promise<void> => {
  const N = load();
  if (!N) return;

  await N.setNotificationChannelAsync(cfg.channel, {
    name: cfg.channelName,
    importance: N.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
  });
  if (cfg.legacyChannel && cfg.legacyChannel !== cfg.channel) {
    await N.deleteNotificationChannelAsync(cfg.legacyChannel);
  }
};
```

Inside `makeDaily`, delete the local `ensureChannel` and change both call sites from `await ensureChannel(N)` to `await ensureChannel(cfg)`.

- [ ] **Step 4: Run the whole module suite**

Run: `npx jest src/modules && npx tsc --noEmit`
Expected: PASS. **Every existing channel test must pass unchanged** — that is the verification that lifting it preserved behaviour. If one needed editing, the lift is wrong.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notify.ts src/modules/__tests__/notify.test.ts
git commit -m "refactor: the channel rule is shared, not copied"
```

---

## Task 4: Scheduling a note

**Files:**
- Create: `src/modules/notes/notify.ts`
- Test: `src/modules/notes/__tests__/notify.test.ts`

**Interfaces:**
- Consumes: `ensureChannel` (Task 3), `triggersFor` (Task 1), `Note` (Task 2).
- Produces: `scheduleNote(note: Note)`, `cancelNote(id: string)`, `reconcile(notes: readonly Note[])`, `requestNotes(): Promise<boolean>`, `notesPermission(): Promise<PermissionState>`, `readTapTarget(): Promise<string | null>`, `onTap(handler: (id: string) => void): () => void`, and `CHANNEL`.

- [ ] **Step 1: Write the failing tests**

Create `src/modules/notes/__tests__/notify.test.ts`. `expo-notifications` is mocked globally in `jest.setup.ts`; read the calls off it the way `src/modules/__tests__/notify.test.ts` does.

```ts
import * as Notifications from 'expo-notifications';
import { readTapTarget as adviceTap } from '../../advice/notify';
import { CHANNEL, cancelNote, reconcile, readTapTarget, scheduleNote } from '../notify';
import type { Note } from '../stored';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, ...over,
});

const queued = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('a note handed to Android', () => {
  it('asks for one repeating trigger per day it is set for', async () => {
    await scheduleNote(note());

    expect(queued()).toHaveLength(3);
    for (const r of queued()) {
      expect(r.trigger.type).toBe('weekly');
      expect(r.trigger.hour).toBe(9);
      expect(r.trigger.minute).toBe(0);
    }
    expect(queued().map((r) => r.trigger.weekday)).toEqual([2, 4, 6]);
  });

  // The whole reason makeDaily is unused: a note's text never varies, so it
  // repeats forever instead of being re-planned inside a horizon.
  it('repeats rather than being dated', async () => {
    await scheduleNote(note());
    for (const r of queued()) {
      expect(r.trigger.date).toBeUndefined();
    }
  });

  it('carries the note’s own words, and its id', async () => {
    await scheduleNote(note());
    for (const r of queued()) {
      expect(r.content.body).toBe('Stay positive');
      expect(r.content.data).toEqual({ room: 'notes', id: 'n1' });
    }
  });

  // channelId rides on the TRIGGER, not the content — the WeeklyTriggerInput
  // type carries the field and the content type rejects it.
  it('is filed under this room’s channel, named on the trigger', async () => {
    await scheduleNote(note());
    for (const r of queued()) {
      expect(r.trigger.channelId).toBe(CHANNEL);
    }
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      CHANNEL, expect.objectContaining({ enableVibrate: true }),
    );
  });

  it('asks for nothing while it is switched off', async () => {
    await scheduleNote(note({ enabled: false }));
    expect(queued()).toHaveLength(0);
  });
});

describe('cancelling', () => {
  const pending = (id: string, identifier: string) => ({
    identifier,
    content: { data: { room: 'notes', id } },
  });

  it('takes only the note it was asked for', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      pending('n1', 'a'), pending('n1', 'b'), pending('n2', 'c'),
    ]);

    await cancelNote('n1');

    expect(mocked.cancelScheduledNotificationAsync.mock.calls.map(([i]) => i)).toEqual(['a', 'b']);
  });

  it('leaves the rooms’ cards alone', async () => {
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'x', content: { data: { room: 'advice', index: 3 } } },
      { identifier: 'y', content: { data: { room: 'transmission.midday', index: 1 } } },
    ]);

    await cancelNote('n1');

    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('the boot reconcile', () => {
  it('leaves one set however many times it runs', async () => {
    await reconcile([note()]);
    const first = queued().length;

    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
      queued().map((_, i) => ({ identifier: `i${i}`, content: { data: { room: 'notes', id: 'n1' } } })),
    );
    jest.clearAllMocks();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
      Array.from({ length: first }, (_, i) => ({
        identifier: `i${i}`, content: { data: { room: 'notes', id: 'n1' } },
      })),
    );

    await reconcile([note()]);

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(first);
    expect(queued()).toHaveLength(first);
  });

  it('schedules nothing for a list of switched-off notes', async () => {
    await reconcile([note({ enabled: false }), note({ id: 'n2', enabled: false })]);
    expect(queued()).toHaveLength(0);
  });
});

// A tap on a note must never be read as an index into a room's corpus.
describe('the rooms do not read this room’s cards', () => {
  it('leaves a note to module 03', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'notes', id: 'n1' } } } },
    });
    expect(await adviceTap()).toBeNull();
  });

  it('and this room does not read theirs', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: { request: { content: { data: { room: 'advice', index: 3 } } } },
    });
    expect(await readTapTarget()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/modules/notes/__tests__/notify.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Write it**

Create `src/modules/notes/notify.ts`:

```ts
import { type PermissionState, ensureChannel } from '../notify';
import { triggersFor } from './schedule';
import type { Note } from './stored';

// Everything this room says to expo-notifications. The decisions about WHICH
// day and WHAT hour are in schedule.ts, which is pure; this hands the answer
// to Android and does nothing else.
//
// It does NOT use makeDaily, and the reason is the interesting one. Both rooms
// hand over ninety DATED notifications with their text baked in, because a
// repeating trigger cannot vary its content and theirs must. A note's text
// never varies — it is whatever the subject typed, and it is the same text
// next Tuesday — so a repeating WEEKLY trigger is exactly right here, and it
// fires forever with no horizon, no re-planning, and no silence after a
// fortnight away from the app.

type Notifs = typeof import('expo-notifications');

const load = (): Notifs | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as Notifs;
  } catch {
    return null;
  }
};

export const CHANNEL = 'notes.v1';
// Not translated, matching both rooms: this is the name Android shows in its
// own settings, and it must not change under the subject when they switch
// language, or the switch they silenced last week is a different row today.
const CHANNEL_NAME = 'NOTES TO MYSELF';

const ROOM = 'notes';

interface Payload {
  room?: unknown;
  id?: unknown;
}

const dataOf = (request: unknown): Payload =>
  ((request as { content?: { data?: unknown } })?.content?.data as Payload) ?? {};

const owns = (data: Payload): boolean => data.room === ROOM;
const idOf = (data: Payload): string | null => (typeof data.id === 'string' ? data.id : null);

export const scheduleNote = async (note: Note): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    await ensureChannel({ channel: CHANNEL, channelName: CHANNEL_NAME });

    for (const { weekday, hour, minute } of triggersFor(note)) {
      await N.scheduleNotificationAsync({
        content: {
          title: CHANNEL_NAME,
          body: note.text,
          data: { room: ROOM, id: note.id },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.WEEKLY,
          weekday, hour, minute,
          channelId: CHANNEL,
        },
      });
    }
  } catch {
    // A phone that refuses to schedule must never be the reason the room
    // fails to save the note.
  }
};

// Only this note's. Matching on the id as well as the room is what lets an
// edit replace one note's triggers without disturbing another's — the rooms
// cancel per ROOM, and this room holds many independent things.
export const cancelNote = async (id: string): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    const pending = await N.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      const data = dataOf(item);
      if (owns(data) && idOf(data) === id) {
        await N.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch {
    // nothing to be done, and nothing that should reach the caller
  }
};

// Cancel everything this room owns, then schedule every enabled note. Runs at
// boot: it is idempotent, it is cheap at this volume, and it is what lets a
// queue that has drifted — a failed write, a half-applied edit — put itself
// right without the subject ever knowing it was wrong.
export const reconcile = async (notes: readonly Note[]): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    const pending = await N.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      if (owns(dataOf(item))) await N.cancelScheduledNotificationAsync(item.identifier);
    }
  } catch {
    // fall through and schedule anyway: too many is recoverable, none is not
  }
  for (const note of notes) await scheduleNote(note);
};

export const notesPermission = async (): Promise<PermissionState> => {
  const N = load();
  if (!N) return 'blocked';
  try {
    const { granted, canAskAgain } = await N.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'ask' : 'blocked';
  } catch {
    return 'blocked';
  }
};

export const requestNotes = async (): Promise<boolean> => {
  const N = load();
  if (!N) return false;
  try {
    await ensureChannel({ channel: CHANNEL, channelName: CHANNEL_NAME });
    const { granted } = await N.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
};

export const readTapTarget = async (): Promise<string | null> => {
  const N = load();
  if (!N) return null;
  try {
    const response = await N.getLastNotificationResponseAsync();
    const data = dataOf(
      (response as { notification?: { request?: unknown } })?.notification?.request,
    );
    return owns(data) ? idOf(data) : null;
  } catch {
    return null;
  }
};

export const onTap = (handler: (id: string) => void): (() => void) => {
  const N = load();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const data = dataOf(response?.notification?.request);
      if (!owns(data)) return;
      const id = idOf(data);
      if (id != null) handler(id);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
};
```

**The battery ask:** `makeDaily`'s `request()` fires `askBatteryUnrestricted()` when permission is granted and the exemption is not held. Do the same here — import `askBatteryUnrestricted` and `isBatteryUnrestricted` from `../../core/power` and add the identical `if (granted && isBatteryUnrestricted() === false)` branch to `requestNotes`, with the same reasoning: switching notes on is the moment it starts to matter.

- [ ] **Step 4: Run and mutation-check**

Run: `npx jest src/modules && npx tsc --noEmit`

- `WEEKLY` → `DAILY` → the per-day test fails
- `toExpoWeekday` dropped (pass `day` straight through) → the weekday test fails
- `channelId` moved from trigger to content → the channel test fails
- `idOf(data) === id` dropped from `cancelNote` → the "only the note it was asked for" test fails
- `owns(data)` dropped from `cancelNote` → the "leaves the rooms' cards alone" test fails

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes/notify.ts src/modules/notes/__tests__/notify.test.ts
git commit -m "feat: a note repeats forever, one trigger per day it is set for"
```

---

## Task 5: The store, and the write path

**Files:**
- Create: `src/modules/notes/store.ts`
- Modify: `src/core/storage.ts` — `KEYS.notes`
- Test: `src/modules/notes/__tests__/store.test.ts`

**Interfaces:**
- Produces: `useNotesStore` with `notes`, `hydrated`, `hydrate()`, `save(draft)`, `remove(id)`, `setEnabled(id, on)`, `reconcileAll()`.

**The one rule:** every write goes disk-then-Android, and every mutation reschedules only the note it touched.

- [ ] **Step 1: Add the storage key**

In `src/core/storage.ts`, add to `KEYS`:

```ts
  notes: 'facility.mod.notes',
```

Nothing goes in `LEGACY_KEYS`: this store has never had another name.

- [ ] **Step 2: Write the failing tests**

Create `src/modules/notes/__tests__/store.test.ts`:

```ts
import { KEYS, storage } from '../../../core/storage';
import { useNotesStore } from '../store';
import { MAX_NOTES } from '../schedule';
import { parse } from '../stored';

jest.mock('../notify', () => ({
  scheduleNote: jest.fn(async () => {}),
  cancelNote: jest.fn(async () => {}),
  reconcile: jest.fn(async () => {}),
  requestNotes: jest.fn(async () => true),
  notesPermission: jest.fn(async () => 'granted'),
}));
const { scheduleNote, cancelNote, reconcile, requestNotes } = jest.requireMock('../notify');

const draft = { text: 'Stay positive', hour: 9, minute: 0, days: [1, 3, 5], enabled: true };

beforeEach(async () => {
  await storage.clearAll();
  useNotesStore.setState({ hydrated: true, notes: [] });
  jest.clearAllMocks();
  requestNotes.mockResolvedValue(true);
});

describe('saving a note', () => {
  it('writes it to the disk and hands it to Android', async () => {
    await useNotesStore.getState().save(draft);

    const [saved] = useNotesStore.getState().notes;
    expect(saved.text).toBe('Stay positive');
    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ text: 'Stay positive' }));
    expect(parse(await storage.get(KEYS.notes)).notes).toHaveLength(1);
  });

  // Android never re-prompts once refused, so a refusal must not leave a note
  // on the disk that will never arrive.
  it('is refused when the permission is', async () => {
    requestNotes.mockResolvedValue(false);

    const ok = await useNotesStore.getState().save(draft);

    expect(ok).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(0);
  });

  // Only the FIRST one: the ceremony is Android's, and asking again on every
  // save would be a dialog between the subject and a note they already wrote.
  it('asks for the permission once, not on every note', async () => {
    await useNotesStore.getState().save(draft);
    await useNotesStore.getState().save({ ...draft, text: 'Drink water' });

    expect(requestNotes).toHaveBeenCalledTimes(1);
  });

  it('replaces a note it is given an id for, rather than adding one', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];

    await useNotesStore.getState().save({ ...draft, id, text: 'Stay hydrated' });

    expect(useNotesStore.getState().notes).toHaveLength(1);
    expect(useNotesStore.getState().notes[0].id).toBe(id);
    expect(useNotesStore.getState().notes[0].text).toBe('Stay hydrated');
  });

  // The id is what the pending notifications carry, so an edit has to take
  // the old triggers away before it puts the new ones up.
  it('takes an edited note’s old triggers down first', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().save({ ...draft, id, hour: 18 });

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ hour: 18 }));
  });

  it('refuses past the cap', async () => {
    useNotesStore.setState({
      notes: Array.from({ length: MAX_NOTES }, (_, i) => ({
        id: `n${i}`, text: 't', hour: 9, minute: 0, days: [1], enabled: true,
      })),
    });

    expect(await useNotesStore.getState().save(draft)).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(MAX_NOTES);
  });
});

describe('the switch', () => {
  it('takes a note’s triggers down without deleting it', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().setEnabled(id, false);

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(useNotesStore.getState().notes[0].enabled).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(1);
  });

  it('puts them back up', async () => {
    await useNotesStore.getState().save({ ...draft, enabled: false });
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().setEnabled(id, true);

    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });
});

describe('deleting', () => {
  it('takes the note and its triggers together', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];

    await useNotesStore.getState().remove(id);

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(useNotesStore.getState().notes).toHaveLength(0);
    expect(parse(await storage.get(KEYS.notes)).notes).toHaveLength(0);
  });
});

describe('booting', () => {
  it('reconciles the whole queue against what is on the disk', async () => {
    await storage.set(KEYS.notes, JSON.stringify({
      notes: [{ id: 'n1', text: 't', hour: 9, minute: 0, days: [1], enabled: true }],
    }));
    useNotesStore.setState({ hydrated: false, notes: [] });

    await useNotesStore.getState().hydrate();
    await useNotesStore.getState().reconcileAll();

    expect(useNotesStore.getState().notes).toHaveLength(1);
    expect(reconcile).toHaveBeenCalledWith(useNotesStore.getState().notes);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx jest src/modules/notes/__tests__/store.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 4: Write it**

Create `src/modules/notes/store.ts`, on both rooms' store shape (a module-scope `inFlight` guard on `hydrate`, a `save` that swallows a failed write):

```ts
import { create } from 'zustand';
import { KEYS, storage } from '../../core/storage';
import { cancelNote, reconcile, requestNotes, scheduleNote } from './notify';
import { MAX_NOTES } from './schedule';
import { type Note, type Stored, parse, serialize } from './stored';

// The notes the subject has written, and the one path every change takes:
// write the disk, then tell Android. She is never told any of this exists.

const write = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.notes, serialize(stored));
  } catch {
    // an unwritable disk — the note is kept for this session only
  }
};

// Enough for a personal list; the id only has to be unique among twenty.
const newId = (): string => `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export type Draft = Omit<Note, 'id'> & { id?: string };

interface NotesState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  save: (draft: Draft) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  setEnabled: (id: string, on: boolean) => Promise<void>;
  reconcileAll: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useNotesStore = create<NotesState>((set, get) => ({
  hydrated: false,
  notes: [],

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.notes);
      } catch {
        // unreadable disk — the room opens empty
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  // Returns whether it was saved, which is NOT what was asked for when the
  // permission is refused or the list is full. Android never re-prompts once
  // refused, so a note that will never arrive must not be left on the disk
  // looking as though it will.
  save: async (draft: Draft): Promise<boolean> => {
    await get().hydrate();

    const editing = draft.id != null && get().notes.some((n) => n.id === draft.id);
    if (!editing && get().notes.length >= MAX_NOTES) return false;

    // The ceremony is Android's and it belongs to the FIRST note. Asking again
    // on every save would be a dialog between the subject and a note they have
    // already written.
    if (get().notes.length === 0 && !(await requestNotes())) return false;

    const note: Note = {
      id: draft.id ?? newId(),
      text: draft.text,
      hour: draft.hour,
      minute: draft.minute,
      days: [...draft.days],
      enabled: draft.enabled,
    };

    const notes = editing
      ? get().notes.map((n) => (n.id === note.id ? note : n))
      : [...get().notes, note];

    set({ notes });
    await write({ notes });

    // The old triggers come down FIRST: they carry this id, and an edit that
    // scheduled before cancelling would cancel what it had just put up.
    if (editing) await cancelNote(note.id);
    await scheduleNote(note);
    return true;
  },

  remove: async (id: string): Promise<void> => {
    await get().hydrate();
    const notes = get().notes.filter((n) => n.id !== id);
    set({ notes });
    await write({ notes });
    await cancelNote(id);
  },

  setEnabled: async (id: string, on: boolean): Promise<void> => {
    await get().hydrate();
    const notes = get().notes.map((n) => (n.id === id ? { ...n, enabled: on } : n));
    set({ notes });
    await write({ notes });

    const note = notes.find((n) => n.id === id);
    await cancelNote(id);
    if (note && on) await scheduleNote(note);
  },

  // The boot path. Idempotent, so a queue that has drifted puts itself right.
  reconcileAll: async (): Promise<void> => {
    await get().hydrate();
    await reconcile(get().notes);
  },
}));
```

- [ ] **Step 5: Run and mutation-check**

Run: `npx jest src/modules && npx tsc --noEmit`

- `if (!editing && …length >= MAX_NOTES)` dropped → the cap test fails
- the permission guard's `notes.length === 0` → `true` → the "asks once" test fails
- `cancelNote` before `scheduleNote` swapped → **check whether a test fails.** If none does, that ordering is unprotected; add one asserting the call order with `mock.invocationCallOrder`
- `setEnabled`'s `if (note && on)` → `if (note)` → the switch-off test fails

- [ ] **Step 6: Commit**

```bash
git add src/modules/notes/store.ts src/modules/notes/__tests__/store.test.ts src/core/storage.ts
git commit -m "feat: every change to a note goes disk first, then Android"
```

---

## Task 6: The two pickers

**Files:**
- Create: `src/modules/notes/TimePicker.tsx`
- Create: `src/modules/notes/DayPicker.tsx`
- Create: `src/modules/notes/strings.ts`
- Modify: `src/core/theme.ts` — `palette.notes`
- Test: `src/modules/notes/__tests__/pickers.test.tsx`

**Why built rather than imported:** `@react-native-community/datetimepicker` renders Android's own clock dialog in the middle of a screen where every hex comes from `palette`, and it is a **native** dependency, so nothing about this module could be seen without a rebuild. `@react-native-community/slider` was removed in the v2 cut for the same reason.

- [ ] **Step 1: Add the palette and the strings**

In `src/core/theme.ts`, beside `horror` and `advice`:

```ts
  // Module 03. Quiet and cool — the lane the warm advice room and the
  // near-black horror room leave open. A note to yourself should not look
  // like a warning. The accent is read from her emotion at render, as both
  // rooms' are.
  notes: {
    bg: '#0b0d0f',
    card: '#111417',
    cardBorder: '#1e242a',
    rule: '#191e23',
    ink: '#dde4ea',
    inkSoft: '#8d979f',
    inkDim: '#5d666d',
    inkGhost: '#394147',
  },
```

Create `src/modules/notes/strings.ts` on both rooms' shape (an interface, then `en` and `ko`, then `export const T: Strings<NotesStrings> = { en, ko }`):

```ts
en: {
  label: 'NOTES TO MYSELF',
  empty: 'nothing written yet',
  newNote: '+ NEW NOTE',
  placeholder: 'write it as you want to read it',
  time: 'TIME',
  days: 'DAYS',
  save: 'SAVE',
  del: 'DELETE',
  full: 'twenty is the limit',
  blocked: 'notifications are off in settings',
  dayNames: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],   // indexed by Date.getDay()
}
ko: {
  label: '나에게 쓰는 메모',
  empty: '아직 쓴 메모가 없어요',
  newNote: '+ 새 메모',
  placeholder: '읽고 싶은 대로 써 두세요',
  time: '시간',
  days: '요일',
  save: '저장',
  del: '삭제',
  full: '스무 개까지예요',
  blocked: '설정에서 알림이 꺼져 있어요',
  dayNames: ['일', '월', '화', '수', '목', '금', '토'],
}
```

**`dayNames` is indexed by `Date.getDay()`**, so `dayNames[0]` is Sunday in both languages. `DISPLAY_ORDER` is what puts them in Monday-first order — never a second array in a different order, which would be a fourth indexing of the same thing.

- [ ] **Step 2: Write the failing tests**

Create `src/modules/notes/__tests__/pickers.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DayPicker } from '../DayPicker';
import { TimePicker } from '../TimePicker';
import { MINUTE_STEP } from '../schedule';
import { T } from '../strings';

describe('the day picker', () => {
  it('reads Monday first, whatever the days are stored as', async () => {
    const view = await render(<DayPicker days={[]} onChange={() => {}} lang="en" />);

    const labels = view.getAllByTestId(/^day-/).map((n) => n.props.testID);
    expect(labels).toEqual([
      'day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-0',
    ]);
    await view.unmount();
  });

  it('marks the days that are set', async () => {
    const view = await render(<DayPicker days={[1, 0]} onChange={() => {}} lang="en" />);

    expect(view.getByTestId('day-1').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('day-0').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('day-2').props.accessibilityState.selected).toBe(false);
    await view.unmount();
  });

  it('adds a day on a tap and takes it away on the next', async () => {
    const onChange = jest.fn();
    const view = await render(<DayPicker days={[1]} onChange={onChange} lang="en" />);

    await fireEvent.press(view.getByTestId('day-3'));
    expect(onChange).toHaveBeenLastCalledWith([1, 3]);

    await fireEvent.press(view.getByTestId('day-1'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    await view.unmount();
  });

  it('names the days in the reading language', async () => {
    const view = await render(<DayPicker days={[]} onChange={() => {}} lang="ko" />);
    expect(view.getByTestId('day-0')).toHaveTextContent(T.ko.dayNames[0]);
    await view.unmount();
  });
});

describe('the time picker', () => {
  it('shows the hour and the minute it was given', async () => {
    const view = await render(<TimePicker hour={9} minute={30} onChange={() => {}} />);

    expect(view.getByTestId('picked-hour')).toHaveTextContent('09');
    expect(view.getByTestId('picked-minute')).toHaveTextContent('30');
    await view.unmount();
  });

  it('walks the hour round the clock rather than off the end', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={23} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('hour-up'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 0, minute: 0 });
    await view.unmount();
  });

  it('walks the minute round too', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={9} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('minute-down'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 9, minute: 60 - MINUTE_STEP });
    await view.unmount();
  });

  it('moves the minute in the step the picker offers', async () => {
    const onChange = jest.fn();
    const view = await render(<TimePicker hour={9} minute={0} onChange={onChange} />);

    await fireEvent.press(view.getByTestId('minute-up'));
    expect(onChange).toHaveBeenLastCalledWith({ hour: 9, minute: MINUTE_STEP });
    await view.unmount();
  });
});
```

- [ ] **Step 3: Run to verify it fails, then write both**

Run: `npx jest src/modules/notes/__tests__/pickers.test.tsx` → FAIL.

`DayPicker.tsx` renders `DISPLAY_ORDER.map((day) => …)` with `testID={`day-${day}`}`, `accessibilityRole="checkbox"`, `accessibilityState={{ selected: days.includes(day) }}`, label `T[lang].dayNames[day]`, and an `onPress` that calls `onChange` with the day added (kept in ascending order) or removed.

`TimePicker.tsx` renders two columns, each an up caret, the value, and a down caret — `hour-up` / `picked-hour` / `hour-down` and the same for the minute — with `String(v).padStart(2, '0')`. The hour wraps `(h + 24 + d) % 24`; the minute wraps `(m + 60 + d * MINUTE_STEP) % 60`. Both call `onChange({ hour, minute })` with the whole pair, so the editor holds one piece of state rather than two that can disagree.

Colours from `palette.notes`; the set state and the carets take the accent the room is lit in, which the editor passes down.

- [ ] **Step 4: Run, mutation-check, commit**

- `DISPLAY_ORDER` replaced with `[0,1,2,3,4,5,6]` in `DayPicker` → the Monday-first test fails
- the hour's `% 24` dropped → the wrap test fails
- `MINUTE_STEP` replaced with `1` → the step test fails

```bash
git add src/modules/notes/ src/core/theme.ts
git commit -m "feat: a time picker and a day row in the app's own language"
```

---

## Task 7: The room, and its list

**Files:**
- Create: `src/modules/notes/index.tsx`
- Modify: `src/core/store.ts` — `pendingNote`, `openNote`
- Modify: `src/modules/registry.ts` — one line
- Test: `src/modules/notes/__tests__/screen.test.tsx`

**Interfaces:**
- Produces: `export const notes: ModuleDef` with `id: 'mod03'`, `slot: '03'`, `Tile`, `Screen`, `onBoot`.
- Consumes: everything from Tasks 1–6.

- [ ] **Step 1: The tap channel in the facility store**

In `src/core/store.ts`, beside `pendingStory`:

```ts
  // The same, for module 03. A string rather than an index: this room's
  // corpus is the subject's own and has no fixed order, so a note is
  // identified by the id its notifications carry.
  pendingNote: string | null;
  openNote: (id: string) => void;
```

Initial `pendingNote: null`, and the action beside `openStory`:

```ts
  openNote: (id: string): void => {
    set({ view: 'mod03', pendingNote: id, cabinetOpen: false });
  },
```

**Not persisted**, for the reason neither of the others is: a tap is a thing that just happened, and one surviving a restart would re-open a note from a notification tapped hours ago.

- [ ] **Step 2: Write the failing screen tests**

Create `src/modules/notes/__tests__/screen.test.tsx`. These testIDs are the
contract Step 3 has to satisfy.

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { storage } from '../../../core/storage';
import { notes as mod } from '..';
import { useNotesStore } from '../store';
import { T } from '../strings';

jest.mock('../notify', () => ({
  scheduleNote: jest.fn(async () => {}),
  cancelNote: jest.fn(async () => {}),
  reconcile: jest.fn(async () => {}),
  requestNotes: jest.fn(async () => true),
  notesPermission: jest.fn(async () => 'granted'),
  readTapTarget: jest.fn(async () => null),
  onTap: jest.fn(() => () => {}),
}));

const Screen = mod.Screen;

const NOTE = {
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true,
};

beforeEach(async () => {
  await storage.clearAll();
  useFacilityStore.setState({ view: 'mod03', lang: 'en', emotion: 'calm', pendingNote: null });
  useNotesStore.setState({ hydrated: true, notes: [NOTE] });
});

describe('the room', () => {
  // Both other rooms open on a card, because they have something to deal.
  // There is nothing to deal here: a note is a thing you made.
  it('opens on the list', async () => {
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-list')).toBeTruthy();
    expect(view.queryByTestId('notes-card')).toBeNull();

    await view.unmount();
  });

  it('says so when nothing has been written', async () => {
    useNotesStore.setState({ notes: [] });
    const view = await render(<Screen />);

    expect(view.getByText(T.en.empty)).toBeTruthy();

    await view.unmount();
  });

  it('gives each note a row carrying its hour and its days', async () => {
    const view = await render(<Screen />);
    const row = view.getByTestId('notes-row-n1');

    expect(row).toHaveTextContent('09:00');
    expect(row).toHaveTextContent('Stay positive');
    // Monday, Wednesday, Friday — in the row's own Monday-first order.
    expect(view.getByTestId('notes-row-n1-days')).toHaveTextContent('M W F');

    await view.unmount();
  });

  it('switches a note off from its row, without deleting it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-row-n1-switch'));

    expect(useNotesStore.getState().notes[0].enabled).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(1);

    await view.unmount();
  });

  it('opens the editor on a row, filled in', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-row-n1'));

    expect(view.getByTestId('note-editor')).toBeTruthy();
    expect(view.getByTestId('note-text').props.value).toBe('Stay positive');

    await view.unmount();
  });

  it('opens the editor blank on a new note', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByText(T.en.newNote));

    expect(view.getByTestId('note-text').props.value).toBe('');

    await view.unmount();
  });
});

describe('a tapped notification', () => {
  it('opens that note alone, as a card', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-card')).toHaveTextContent('Stay positive');
    expect(view.queryByTestId('notes-list')).toBeNull();

    await view.unmount();
  });

  // Taken once and cleared, like pendingQuote and pendingStory: walking back
  // into the room later is an ordinary visit.
  it('is spent on arrival', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);

    expect(useFacilityStore.getState().pendingNote).toBeNull();

    await view.unmount();
  });

  // Deleted between the notification firing and the tap.
  it('opens the list when the note is gone', async () => {
    useFacilityStore.setState({ pendingNote: 'deleted' });
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-list')).toBeTruthy();

    await view.unmount();
  });

  it('goes back to the list from the card', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-card-back'));

    expect(view.getByTestId('notes-list')).toBeTruthy();

    await view.unmount();
  });
});

// The doorway rule: one exit, top-left, in the room's own ink.
describe('the threshold', () => {
  it('leaves by the one exit', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));

    expect(useFacilityStore.getState().view).toBe('stage');

    await view.unmount();
  });
});
```

- [ ] **Step 3: Write the room**

`src/modules/notes/index.tsx` holds `NotesTile` (slot numeral `03` above `T[lang].label`, copied from `AdviceTile`'s geometry), `NotesScreen`, and the `ModuleDef`.

`NotesScreen` holds one piece of view state — `'list' | 'card' | 'editor'` — plus the id being edited. The doorway rule's exit is top-left at 44px in `palette.notes.inkSoft`, never the shell's amber. The accent is `EMOTIONS[emotion].iris`, as both rooms.

The card is set in `serif(lang)`, for the reason the advice cards are: it is a sentence worth reading, and it is the subject's own, handed back at the hour they asked for it.

```ts
export const notes: ModuleDef = {
  id: 'mod03',
  slot: '03',
  Tile: NotesTile,
  Screen: NotesScreen,
  // No Settings row: every note carries its own switch where the subject can
  // see it, and a master switch on another screen would be a second place to
  // look and a second thing to disagree with.
  onBoot: async () => {
    await useNotesStore.getState().hydrate();
    // Idempotent, and what lets a queue that has drifted put itself right.
    void useNotesStore.getState().reconcileAll();

    const tapped = await readTapTarget();
    if (tapped != null) useFacilityStore.getState().openNote(tapped);

    return onTap((id) => useFacilityStore.getState().openNote(id));
  },
};
```

And in `src/modules/registry.ts`, replace `{ slot: '03' }` with `notes`, adding the import beside the other two.

- [ ] **Step 4: Run everything**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, with the cabinet and `ScreenRouter` picking the room up without either naming it — both read the registry.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes/ src/modules/registry.ts src/core/store.ts
git commit -m "feat: module 03 opens on the notes you have written"
```

---

## Task 8: The editor

**Files:**
- Create: `src/modules/notes/NoteEditor.tsx`
- Test: `src/modules/notes/__tests__/editor.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/modules/notes/__tests__/editor.test.tsx`, with the same `../notify`
mock as Task 7.

```tsx
const saved = () => useNotesStore.getState().notes;

beforeEach(async () => {
  await storage.clearAll();
  useFacilityStore.setState({ lang: 'en', emotion: 'calm' });
  useNotesStore.setState({ hydrated: true, notes: [] });
});

describe('the editor', () => {
  it('opens blank, with no day chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    expect(view.getByTestId('note-text').props.value).toBe('');
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      expect(view.getByTestId(`day-${day}`).props.accessibilityState.selected).toBe(false);
    }

    await view.unmount();
  });

  it('opens filled for a note being edited', async () => {
    const view = await render(
      <NoteEditor note={NOTE} onDone={() => {}} accent="#f4b43a" />,
    );

    expect(view.getByTestId('note-text').props.value).toBe('Stay positive');
    expect(view.getByTestId('picked-hour')).toHaveTextContent('09');
    expect(view.getByTestId('day-1').props.accessibilityState.selected).toBe(true);

    await view.unmount();
  });

  // fireEvent.press on a DISABLED element is a silent no-op, so pressing it
  // alone would pass against a save with no guard at all. Both halves.
  it('cannot be saved with nothing written', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    await fireEvent.press(view.getByTestId('day-1'));

    expect(view.getByTestId('note-save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId('note-save'));
    expect(saved()).toHaveLength(0);

    await view.unmount();
  });

  // A note with no day never fires.
  it('cannot be saved with no day chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    await fireEvent.changeText(view.getByTestId('note-text'), 'Drink water');

    expect(view.getByTestId('note-save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId('note-save'));
    expect(saved()).toHaveLength(0);

    await view.unmount();
  });

  it('saves the words, the hour and the days together', async () => {
    const onDone = jest.fn();
    const view = await render(<NoteEditor onDone={onDone} accent="#f4b43a" />);

    await fireEvent.changeText(view.getByTestId('note-text'), 'Drink water');
    await fireEvent.press(view.getByTestId('day-2'));
    await fireEvent.press(view.getByTestId('hour-up'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()).toHaveLength(1);
    expect(saved()[0].text).toBe('Drink water');
    expect(saved()[0].days).toEqual([2]);
    expect(onDone).toHaveBeenCalled();

    await view.unmount();
  });

  // The id is what every pending notification for this note carries.
  it('keeps the id it was opened with', async () => {
    useNotesStore.setState({ notes: [NOTE] });
    const view = await render(
      <NoteEditor note={NOTE} onDone={() => {}} accent="#f4b43a" />,
    );

    await fireEvent.changeText(view.getByTestId('note-text'), 'Stay hydrated');
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()).toHaveLength(1);
    expect(saved()[0].id).toBe('n1');
    expect(saved()[0].text).toBe('Stay hydrated');

    await view.unmount();
  });

  it('offers no delete on a note that does not exist yet', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    expect(view.queryByTestId('note-delete')).toBeNull();

    await view.unmount();
  });

  it('deletes an existing note', async () => {
    useNotesStore.setState({ notes: [NOTE] });
    const onDone = jest.fn();
    const view = await render(
      <NoteEditor note={NOTE} onDone={onDone} accent="#f4b43a" />,
    );

    await fireEvent.press(view.getByTestId('note-delete'));

    expect(saved()).toHaveLength(0);
    expect(onDone).toHaveBeenCalled();

    await view.unmount();
  });

  it('says why a valid note was refused', async () => {
    useNotesStore.setState({
      notes: Array.from({ length: MAX_NOTES }, (_, i) => ({ ...NOTE, id: `n${i}` })),
    });
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    await fireEvent.changeText(view.getByTestId('note-text'), 'One too many');
    await fireEvent.press(view.getByTestId('day-1'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(view.getByText(T.en.full)).toBeTruthy();

    await view.unmount();
  });
});
```

- [ ] **Step 2: Write it**

`NoteEditor.tsx` takes `note?: Note`, `onDone: () => void`, and `accent: string`. It holds `text`, `hour`, `minute`, `days` as local state seeded from `note`, renders a `TextInput` (`maxLength={MAX_TEXT}`), `TimePicker`, `DayPicker`, a SAVE that is `disabled={!isSavable({ text, days })}`, and a DELETE only when `note` is given.

SAVE calls `useNotesStore.getState().save({ id: note?.id, text, hour, minute, days, enabled: note?.enabled ?? true })` and calls `onDone()` when it returns true; when it returns false it shows `T[lang].full`, since the cap is the only reason a valid draft is refused once the permission is granted.

- [ ] **Step 3: Run, mutation-check, commit**

- `disabled={…}` removed from SAVE → the two refusal tests fail on the `save` assertion
- `id: note?.id` → `id: undefined` → the keeps-the-id test fails

```bash
git add src/modules/notes/
git commit -m "feat: write a note, set its hour, choose its days"
```

---

## After the eight tasks

- [ ] **Run the full suite and tsc on the merged result.**
- [ ] **CLAUDE.md** — module 03 in the registry line, `KEYS.notes` in the stores table, `pendingNote` beside the other two, a section on why this room uses `WEEKLY` where both others use a dated horizon, and the `ensureChannel` extraction.
- [ ] **README** — the cabinet section says "03–06 — empty". It is 03 now.
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`.

**On-device, and only on-device:**

- `expo-notifications` is already native in the installed build, so **no rebuild is needed**.
- `Battery → Unrestricted` governs these exactly as it governs everything else. The `BATTERY` row says which way it is set.
- A `WEEKLY` trigger is the one thing in this app that has never been run on the phone. Confirm one actually arrives on the right weekday before trusting the other six.
