# Daily Advice Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Module 02 sends one of the book's 232 quotes as a notification at 09:00 each morning; tapping it opens the app on that room with that exact quote dealt.

**Architecture:** A pure planner emits 90 dated notifications with their text already written into them, because Android holds and fires them while the app is not running and content cannot be chosen at delivery time. An impure executor behind a lazy `require` hands them over, at most once a day. The toggle reaches SYSTEM through a new optional `Settings` on `ModuleDef`, so the shell still names no module.

**Tech Stack:** React Native 0.86 + Expo SDK 57 (TypeScript), `expo-notifications`, Zustand, AsyncStorage, Jest 29 + React Native Testing Library v14.

**Spec:** `docs/superpowers/specs/2026-09-04-daily-advice-design.md`

## Global Constraints

- **Read the versioned docs.** Expo has changed; `AGENTS.md` requires https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- **All copy verbatim from a `T` table** — `src/shell/strings.ts` for shell copy, `src/modules/advice/strings.ts` for this module's. All hex from `palette` in `src/core/theme.ts`. Do not invent strings or colours.
- **Repo style is single quotes.** An editor formatter has previously reformatted files to double quotes; do not let it.
- **No test may make a real network request**, and no test may touch a real native module. Mock `expo-notifications` and `expo-secure-store`.
- **Verify with `npm test` and `npx tsc --noEmit`.** Both must be clean before any commit.
- **RTL v14 is fully async**: `await render(...)`, `await fireEvent.press(...)`, and `await view.unmount()`. Omitting the unmount causes overlapping `act()` and `toJSON()` returning null.
- **TDD is mandatory** (`superpowers:test-driven-development`): write the failing test, watch it fail for the right reason, then the minimal implementation.
- **Commit messages carry no Claude/model attribution** (user's global instruction).
- **Pure decision-making modules have no React in them.** Components render and dispatch, nothing more.
- `expo-notifications` is native: nothing in this plan is observable on the phone until a new `--profile development` build.

---

## File Structure

**Created**

| file | responsibility |
|---|---|
| `src/modules/advice/daily.ts` | pure: when to fire, which quote, whether a sync is due |
| `src/modules/advice/stored.ts` | pure: the module's whole persisted blob, parse and serialize |
| `src/modules/advice/notify.ts` | impure: the only file that touches `expo-notifications` |
| `src/modules/advice/Settings.tsx` | the module's own row on the SYSTEM screen |
| `src/shell/PrefRow.tsx` | one preferences row, used by the shell and by modules |

**Modified**

| file | change |
|---|---|
| `src/modules/advice/favorites.ts` | loses `parse`/`serialize` to `stored.ts` |
| `src/modules/advice/store.ts` | gains `daily`, `syncedOn`, `setDaily`, `syncIfDue` |
| `src/modules/advice/strings.ts` | four new labels |
| `src/modules/advice/index.tsx` | consumes `pendingQuote` on mount; exports `Settings` |
| `src/modules/types.ts` | `ModuleDef` gains optional `Settings` |
| `src/shell/SystemScreen.tsx` | rows become `PrefRow`; renders registry `Settings` |
| `src/core/store.ts` | `pendingQuote`, `openQuote` |
| `App.tsx` | both notification-tap paths; the daily sync after hydrate |
| `app.json` | `expo-notifications` plugin block |
| `jest.setup.ts` | global `expo-notifications` mock |
| `CLAUDE.md` | the no-notifications claim is rewritten |

---

## Task 1: The pure planner

**Files:**
- Create: `src/modules/advice/daily.ts`
- Test: `src/modules/advice/__tests__/daily.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `NOTIFY_HOUR: 9`, `PLAN_DAYS: 90`, `PlannedQuote { at: Date; index: number }`, `planDaily(now: Date, count: number, days?: number, rand?: () => number): PlannedQuote[]`, `dueForSync(syncedOn: string | null, now: Date): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/advice/__tests__/daily.test.ts`:

```ts
import { NOTIFY_HOUR, PLAN_DAYS, dueForSync, planDaily } from '../daily';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('the daily plan', () => {
  it('lays out one card a day, at nine, for the whole horizon', () => {
    const plan = planDaily(new Date(2026, 8, 4, 8, 0), 232);
    expect(plan).toHaveLength(PLAN_DAYS);
    for (const { at } of plan) {
      expect(at.getHours()).toBe(NOTIFY_HOUR);
      expect(at.getMinutes()).toBe(0);
    }
  });

  // Every entry is built from local date parts rather than by adding
  // milliseconds, so an hour gained or lost overnight still lands at nine.
  it('starts today when nine has not passed, and tomorrow when it has', () => {
    const before = planDaily(new Date(2026, 8, 4, 8, 59), 232);
    expect(before[0].at.getDate()).toBe(4);

    const after = planDaily(new Date(2026, 8, 4, 9, 0), 232);
    expect(after[0].at.getDate()).toBe(5);
  });

  it('walks forward one day at a time, across a month boundary', () => {
    const plan = planDaily(new Date(2026, 8, 29, 10, 0), 232, 4);
    expect(plan.map((p) => [p.at.getMonth(), p.at.getDate()])).toEqual([
      [8, 30], [9, 1], [9, 2], [9, 3],
    ]);
  });

  it('draws every card from inside the book', () => {
    const plan = planDaily(new Date(2026, 8, 4, 8, 0), 232, 5, seq(0, 0.5, 0.999, 0.25, 0.75));
    expect(plan.map((p) => p.index)).toEqual([0, 116, 231, 58, 174]);
  });
});

describe('whether a sync is due', () => {
  const now = new Date(2026, 8, 4, 10, 0);

  it('is due when nothing has ever been synced', () => {
    expect(dueForSync(null, now)).toBe(true);
  });

  it('is not due again the same day', () => {
    expect(dueForSync(now.toDateString(), now)).toBe(false);
  });

  it('is due again once the day turns over', () => {
    expect(dueForSync(new Date(2026, 8, 3, 23, 59).toDateString(), now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/modules/advice/__tests__/daily.test.ts`
Expected: FAIL — `Cannot find module '../daily'`.

- [ ] **Step 3: Write the implementation**

Create `src/modules/advice/daily.ts`:

```ts
// When a card is sent and which one, decided here and nowhere else. Pure — no
// expo, no React, no store. The impure half is notify.ts.
export const NOTIFY_HOUR = 9;

// Ninety days of cards handed over at once. There is no documented Android
// ceiling on pending notifications (the 64 limit is iOS, and this app is
// Android-only), so this stays well clear of an untested one rather than
// reaching for it. Three months without opening the app means the feature has
// already failed at its job.
export const PLAN_DAYS = 90;

export interface PlannedQuote {
  at: Date;
  index: number;
}

// Every `at` is built from local date PARTS, never by adding milliseconds to a
// timestamp: an hour gained or lost overnight would otherwise slide the whole
// tail of the plan to eight or ten o'clock.
export const planDaily = (
  now: Date,
  count: number,
  days: number = PLAN_DAYS,
  rand: () => number = Math.random,
): PlannedQuote[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), NOTIFY_HOUR);
  // Strictly after: a sync at 08:59 still gets this morning, one at 09:00 does
  // not, because that notification has already fired or is firing.
  const offset = today.getTime() > now.getTime() ? 0 : 1;

  const plan: PlannedQuote[] = [];
  for (let i = 0; i < days; i++) {
    plan.push({
      at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + i, NOTIFY_HOUR),
      index: Math.floor(rand() * count),
    });
  }
  return plan;
};

// A sync rewrites the whole horizon, so doing it on every launch would be
// ninety cancels and ninety native calls in the boot path for an
// identically-shaped result. The stamp is a toDateString(), the same shape and
// the same comparison the soul store's `day` uses, so neither has to reason
// about timezones.
export const dueForSync = (syncedOn: string | null, now: Date): boolean =>
  syncedOn !== now.toDateString();
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/modules/advice/__tests__/daily.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Verify nothing else broke, then commit**

```bash
npx tsc --noEmit && npm test
git add src/modules/advice/daily.ts src/modules/advice/__tests__/daily.test.ts
git commit -m "feat: the pure half of the daily card — when, and which one"
```

---

## Task 2: The stored blob

The module's AsyncStorage record now holds three unrelated things. `parse` and `serialize` move out of `favorites.ts`, which goes back to being only favorites logic.

**Files:**
- Create: `src/modules/advice/stored.ts`, `src/modules/advice/__tests__/stored.test.ts`
- Modify: `src/modules/advice/favorites.ts` (delete `parse`, `serialize`, `Blob`), `src/modules/advice/store.ts` (import from `stored`), `src/modules/advice/__tests__/favorites.test.ts` (drop the parse/serialize tests), `src/modules/advice/__tests__/store.test.ts` (import `parse` from `stored`)

**Interfaces:**
- Consumes: `Favorites` from `./favorites`.
- Produces: `Stored { favorites: Set<string>; daily: boolean; syncedOn: string | null }`, `EMPTY_STORED: Stored`, `parse(raw: string | null): Stored`, `serialize(s: Stored): string`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/advice/__tests__/stored.test.ts`:

```ts
import { EMPTY_STORED, parse, serialize } from '../stored';

describe('the module 02 record', () => {
  it('reads back everything it wrote', () => {
    const written = serialize({
      favorites: new Set(['a', 'b']),
      daily: true,
      syncedOn: 'Fri Sep 04 2026',
    });
    const read = parse(written);
    expect([...read.favorites].sort()).toEqual(['a', 'b']);
    expect(read.daily).toBe(true);
    expect(read.syncedOn).toBe('Fri Sep 04 2026');
  });

  it('starts empty on nothing, on junk, and on the wrong shape', () => {
    expect(parse(null)).toEqual(EMPTY_STORED);
    expect(parse('}{ not json')).toEqual(EMPTY_STORED);
    expect(parse('{"favorites":"a"}')).toEqual(EMPTY_STORED);
    expect(parse('{"favorites":[1,2]}').favorites.size).toBe(0);
  });

  // A record written before the daily card existed. It must open as a record
  // with the feature off, not as no record at all.
  it('opens a record from before the daily card', () => {
    const old = parse('{"favorites":["Finish the small thing before starting the next one."]}');
    expect([...old.favorites]).toEqual(['Finish the small thing before starting the next one.']);
    expect(old.daily).toBe(false);
    expect(old.syncedOn).toBeNull();
  });

  it('treats a non-boolean daily and a non-string stamp as absent', () => {
    const odd = parse('{"favorites":[],"daily":"yes","syncedOn":7}');
    expect(odd.daily).toBe(false);
    expect(odd.syncedOn).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/modules/advice/__tests__/stored.test.ts`
Expected: FAIL — `Cannot find module '../stored'`.

- [ ] **Step 3: Write the implementation**

Create `src/modules/advice/stored.ts`:

```ts
import type { Favorites } from './favorites';

// The whole of what module 02 keeps on disk, in one place. This used to live in
// favorites.ts, which was right while favorites were the only thing kept; the
// blob now holds three unrelated things and the file that owns it should not be
// named after one of them.
export interface Stored {
  favorites: Favorites;
  daily: boolean;
  syncedOn: string | null;
}

export const EMPTY_STORED: Stored = {
  favorites: new Set<string>(),
  daily: false,
  syncedOn: null,
};

interface Blob {
  favorites: string[];
  daily: boolean;
  syncedOn: string | null;
}

export const serialize = (s: Stored): string =>
  JSON.stringify({
    favorites: [...s.favorites],
    daily: s.daily,
    syncedOn: s.syncedOn,
  } satisfies Blob);

// Anything that is not the shape expected is that field absent, never a throw.
// A blob half-written by a dying process, or one written before a field
// existed, must cost the field and not the room.
export const parse = (raw: string | null): Stored => {
  if (!raw) return { ...EMPTY_STORED, favorites: new Set<string>() };
  try {
    const blob = JSON.parse(raw) as Partial<Blob>;
    return {
      favorites: new Set(
        Array.isArray(blob.favorites)
          ? blob.favorites.filter((q): q is string => typeof q === 'string')
          : [],
      ),
      daily: blob.daily === true,
      syncedOn: typeof blob.syncedOn === 'string' ? blob.syncedOn : null,
    };
  } catch {
    return { ...EMPTY_STORED, favorites: new Set<string>() };
  }
};
```

- [ ] **Step 4: Strip the moved code out of `favorites.ts`**

Delete the `Blob` interface, `serialize` and `parse` from `src/modules/advice/favorites.ts`, and delete its now-unused header comment about keying by text — move that comment onto `Stored.favorites` in `stored.ts`. `favorites.ts` keeps only `Favorites`, `toggle` and `displayOrder`.

Delete these two tests from `src/modules/advice/__tests__/favorites.test.ts` (they now live in `stored.test.ts`):
- `it('reads back what it wrote', ...)`
- `it('starts empty on nothing, on junk, and on the wrong shape', ...)`

and drop `parse, serialize` from that file's import.

- [ ] **Step 5: Point the store at the new file**

In `src/modules/advice/store.ts`, change

```ts
import { type Favorites, parse, serialize, toggle } from './favorites';
```

to

```ts
import { type Favorites, toggle } from './favorites';
import { parse, serialize } from './stored';
```

`save` currently takes `Favorites` and calls `serialize(favorites)`. Change it to take the whole record:

```ts
const save = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.advice, serialize(stored));
  } catch {
    // an unwritable disk — the card is kept for this session only
  }
};
```

and add `import { type Stored, parse, serialize } from './stored';`.

**`AdviceState` must carry all three fields in this task, not in Task 4.** The
state is data; only the actions wait. If `daily` and `syncedOn` were absent from
state while `save` writes a whole `Stored`, then `toggleFavorite` would write
`daily: false` over a record that said true — keeping a quote would silently
switch the daily card off. So:

```ts
interface AdviceState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (quote: string) => Promise<void>;
}
```

with `daily: false` and `syncedOn: null` in the initial state,
`set({ hydrated: true, ...parse(raw) })` in `hydrate`, and

```ts
  toggleFavorite: async (quote: string): Promise<void> => {
    const favorites = toggle(get().favorites, quote);
    set({ favorites });
    await save({ ...get(), favorites });
  },
```

Task 4 adds `setDaily` and `syncIfDue` on top and touches nothing else.

In `src/modules/advice/__tests__/store.test.ts`, change `import { parse } from '../favorites';` to `import { parse } from '../stored';`.

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npm test`
Expected: all suites pass. `stored.test.ts` is 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/modules/advice/stored.ts src/modules/advice/favorites.ts src/modules/advice/store.ts src/modules/advice/__tests__
git commit -m "refactor: the module 02 record gets its own file

The blob holds three unrelated things now, and the file that owns it
should not be named after one of them. favorites.ts goes back to being
favorites logic; stored.ts owns parse and serialize, and opens a record
written before the daily card as one with the feature off."
```

---

## Task 3: Install `expo-notifications` and write the executor

**Files:**
- Create: `src/modules/advice/notify.ts`, `src/modules/advice/__tests__/notify.test.ts`
- Modify: `package.json`, `package-lock.json`, `app.json`, `jest.setup.ts`

**Interfaces:**
- Consumes: `planDaily`, `PLAN_DAYS` from `./daily`; `QUOTES`, `SOURCE` from `./quotes`; `T` from `./strings`.
- Produces: `permissionState(): Promise<'granted' | 'blocked' | 'ask'>`, `requestDaily(): Promise<boolean>`, `syncDaily(enabled: boolean, lang: Lang, now: Date): Promise<void>`, `readTapTarget(): Promise<number | null>`, `onTap(handler: (index: number) => void): () => void`.

- [ ] **Step 1: Install the package**

```bash
npx expo install expo-notifications
```

Then confirm nothing else moved:

```bash
git diff --stat package.json package-lock.json
```

Expected: `package.json` gains one dependency line; `package-lock.json` gains the one package. If any other dependency moved, stop and report it — the repo's `.npmrc` pins `legacy-peer-deps=false` and a wider resolve is a signal, not noise.

- [ ] **Step 2: Add the plugin block to `app.json`**

In `expo.plugins`, after `"expo-localization"`, add:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/android-icon-monochrome.png",
    "color": "#f4b43a"
  }
]
```

The monochrome icon is the one Android already wants for a status-bar glyph — it is a silhouette, which is exactly what a notification icon must be. `#f4b43a` is `palette.amber`, verbatim.

- [ ] **Step 3: Add the global jest mock**

Append to `jest.setup.ts`:

```ts
// Native, with no jsdom counterpart. Mocked globally because App and the
// SYSTEM screen both reach it transitively, and a scheduled notification is
// something no test can observe arriving.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
```

- [ ] **Step 4: Write the failing test**

Create `src/modules/advice/__tests__/notify.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../daily';
import { permissionState, requestDaily, syncDaily } from '../notify';
import { QUOTES, SOURCE } from '../quotes';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mocked.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
});

describe('the executor', () => {
  it('hands over one card a day for the whole horizon', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  // The text has to be inside the notification before Android takes it:
  // nothing of ours is awake at nine to choose one.
  it('writes the quote and the book into every card', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('EXCELLENT ADVICE');
    expect(typeof content.data.quote).toBe('number');
    expect(content.body).toContain(QUOTES[content.data.quote]);
    expect(content.body).toContain(SOURCE.author);
  });

  it('titles the card in the reading language', async () => {
    await syncDaily(true, 'ko', new Date(2026, 8, 4, 8, 0));
    const { content } = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('훌륭한 조언');
  });

  it('makes the channel before it schedules anything', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalled();
    const channelOrder = mocked.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const scheduleOrder = mocked.scheduleNotificationAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(scheduleOrder);
  });

  it('cancels and schedules nothing when it is switched off', async () => {
    await syncDaily(false, 'en', new Date(2026, 8, 4, 8, 0));
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  // An icon is a courtesy. A phone that refuses to schedule, or a build with no
  // native module in it, must never be the reason the room fails to open.
  it('swallows a refusal from the native side', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValue(new Error('no'));
    await expect(syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0))).resolves.toBeUndefined();
  });
});

describe('the permission', () => {
  it('reads granted, refused and not-yet-asked apart', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
    expect(await permissionState()).toBe('granted');

    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await permissionState()).toBe('ask');

    // Android never re-prompts once it has been refused.
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await permissionState()).toBe('blocked');
  });

  it('asks, and reports what the subject chose', async () => {
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await requestDaily()).toBe(false);
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npx jest src/modules/advice/__tests__/notify.test.ts`
Expected: FAIL — `Cannot find module '../notify'`.

- [ ] **Step 6: Write the implementation**

Create `src/modules/advice/notify.ts`:

```ts
import type { Lang } from '../../core/i18n';
import { planDaily } from './daily';
import { QUOTES, SOURCE } from './quotes';
import { T } from './strings';

// The only file that touches expo-notifications. Everything about WHICH card
// and WHEN is decided in daily.ts, which is pure; this hands the answer to
// Android and does nothing else.
//
// Lazily required, exactly as v1's notifications.ts was: a build without the
// native module in it must degrade to doing nothing rather than throwing at
// import time and taking the whole app with it.
const CHANNEL = 'advice';

type Notifs = typeof import('expo-notifications');

const load = (): Notifs | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as Notifs;
  } catch {
    return null;
  }
};

const ensureChannel = async (N: Notifs): Promise<void> => {
  await N.setNotificationChannelAsync(CHANNEL, {
    name: 'EXCELLENT ADVICE',
    importance: N.AndroidImportance.DEFAULT,
  });
};

export type PermissionState = 'granted' | 'blocked' | 'ask';

// `blocked` is its own answer because Android never re-prompts once refused:
// the row has to say the OS settings are the only way back rather than offer a
// button that will do nothing.
export const permissionState = async (): Promise<PermissionState> => {
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

export const requestDaily = async (): Promise<boolean> => {
  const N = load();
  if (!N) return false;
  try {
    // The channel has to exist before the prompt, or the permission is granted
    // against nothing.
    await ensureChannel(N);
    const { granted } = await N.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
};

// Cancels everything pending and hands over a fresh horizon. cancelAll assumes
// this feature owns every notification the app schedules — true today, and the
// thing to revisit first if a second one is ever added.
export const syncDaily = async (enabled: boolean, lang: Lang, now: Date): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    await ensureChannel(N);
    await N.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    for (const { at, index } of planDaily(now, QUOTES.length)) {
      await N.scheduleNotificationAsync({
        content: {
          title: T[lang].label,
          // The text must be inside the notification before Android takes it:
          // nothing of ours is awake at nine to choose one.
          body: `${QUOTES[index]}\n— ${SOURCE.author}`,
          data: { quote: index },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // A card is a courtesy. A phone that refuses to schedule must never be the
    // reason the room fails to open.
  }
};

const quoteFrom = (response: unknown): number | null => {
  const data = (response as { notification?: { request?: { content?: { data?: unknown } } } })
    ?.notification?.request?.content?.data as { quote?: unknown } | undefined;
  return typeof data?.quote === 'number' ? data.quote : null;
};

// The app was not running: Android held the tap and hands it over on boot.
export const readTapTarget = async (): Promise<number | null> => {
  const N = load();
  if (!N) return null;
  try {
    return quoteFrom(await N.getLastNotificationResponseAsync());
  } catch {
    return null;
  }
};

// The app was already running. Returns its own unsubscribe.
export const onTap = (handler: (index: number) => void): (() => void) => {
  const N = load();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const index = quoteFrom(response);
      if (index != null) handler(index);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
};
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npx jest src/modules/advice/__tests__/notify.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 8: Run everything and commit**

```bash
npx tsc --noEmit && npm test
git add package.json package-lock.json app.json jest.setup.ts src/modules/advice/notify.ts src/modules/advice/__tests__/notify.test.ts
git commit -m "feat: the impure half — hand ninety cards to Android

expo-notifications is native, so the dev build on the phone cannot see
any of this until the next one. Lazily required exactly as v1's
notifications.ts was: a build without the module degrades to doing
nothing rather than throwing at import and taking the app with it."
```

---

## Task 4: The store learns about the daily card

**Files:**
- Modify: `src/modules/advice/store.ts`, `src/modules/advice/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `parse`, `serialize`, `Stored` from `./stored`; `dueForSync` from `./daily`; `syncDaily`, `requestDaily` from `./notify`.
- Produces: on `useAdviceStore` — `daily: boolean`, `syncedOn: string | null`, `setDaily(on: boolean, lang: Lang): Promise<boolean>`, `syncIfDue(lang: Lang, now?: Date): Promise<void>`. `useFavorites()` is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/modules/advice/__tests__/store.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { PLAN_DAYS } from '../daily';

const notifs = Notifications as unknown as Record<string, jest.Mock>;

describe('the daily card', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    await storage.clearAll();
    useAdviceStore.setState({
      hydrated: false, favorites: new Set(), daily: false, syncedOn: null,
    });
  });

  it('is off until it is asked for', async () => {
    await useAdviceStore.getState().hydrate();
    expect(useAdviceStore.getState().daily).toBe(false);
  });

  it('schedules the moment it is switched on, without waiting for a launch', async () => {
    const on = await useAdviceStore.getState().setDaily(true, 'en');
    expect(on).toBe(true);
    expect(useAdviceStore.getState().daily).toBe(true);
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  // Android never re-prompts. A refusal must leave the store off, or the row
  // would say ON over a phone that will never show a card.
  it('stays off when the subject refuses the permission', async () => {
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const on = await useAdviceStore.getState().setDaily(true, 'en');
    expect(on).toBe(false);
    expect(useAdviceStore.getState().daily).toBe(false);
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels everything when it is switched off', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    jest.clearAllMocks();
    await useAdviceStore.getState().setDaily(false, 'en');
    expect(useAdviceStore.getState().daily).toBe(false);
    expect(notifs.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('survives a restart, on and stamped', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    useAdviceStore.setState({ hydrated: false, favorites: new Set(), daily: false, syncedOn: null });
    await useAdviceStore.getState().hydrate();
    expect(useAdviceStore.getState().daily).toBe(true);
    expect(useAdviceStore.getState().syncedOn).toBe(new Date().toDateString());
  });

  // Ninety cancels and ninety native calls in the boot path, for an
  // identically-shaped result, on every single launch.
  it('syncs once a day, not once a launch', async () => {
    await useAdviceStore.getState().setDaily(true, 'en');
    jest.clearAllMocks();

    await useAdviceStore.getState().syncIfDue('en');
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();

    await useAdviceStore.getState().syncIfDue('en', new Date(Date.now() + 86_400_000));
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalledTimes(PLAN_DAYS);
  });

  it('does no work at all while it is switched off', async () => {
    await useAdviceStore.getState().hydrate();
    await useAdviceStore.getState().syncIfDue('en');
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notifs.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/modules/advice/__tests__/store.test.ts -t "daily card"`
Expected: FAIL — `setDaily is not a function`.

- [ ] **Step 3: Write the implementation**

Rewrite `src/modules/advice/store.ts` so `AdviceState` carries the whole record and the two new actions:

```ts
import { useEffect } from 'react';
import { create } from 'zustand';
import type { Lang } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { dueForSync } from './daily';
import { type Favorites, toggle } from './favorites';
import { requestDaily, syncDaily } from './notify';
import { type Stored, parse, serialize } from './stored';

const save = async (stored: Stored): Promise<void> => {
  try {
    await storage.set(KEYS.advice, serialize(stored));
  } catch {
    // an unwritable disk — this session keeps it and a restart does not
  }
};

interface AdviceState extends Stored {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (quote: string) => Promise<void>;
  setDaily: (on: boolean, lang: Lang) => Promise<boolean>;
  syncIfDue: (lang: Lang, now?: Date) => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useAdviceStore = create<AdviceState>((set, get) => ({
  hydrated: false,
  favorites: new Set<string>(),
  daily: false,
  syncedOn: null,

  hydrate: async (): Promise<void> => {
    if (get().hydrated) return;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      let raw: string | null = null;
      try {
        raw = await storage.get(KEYS.advice);
      } catch {
        // unreadable disk — the room opens with nothing kept
      }
      set({ hydrated: true, ...parse(raw) });
    })();

    await inFlight;
    inFlight = null;
  },

  toggleFavorite: async (quote: string): Promise<void> => {
    const favorites = toggle(get().favorites, quote);
    set({ favorites });
    await save({ ...get(), favorites });
  },

  // Returns whether it is on afterwards, which is NOT what was asked for when
  // the permission is refused. Android never re-prompts, so a refusal has to
  // leave the store off or the row would read ON over a phone that will never
  // show a card.
  setDaily: async (on: boolean, lang: Lang): Promise<boolean> => {
    if (on && !(await requestDaily())) {
      return false;
    }
    const now = new Date();
    const syncedOn = on ? now.toDateString() : null;
    set({ daily: on, syncedOn });
    await syncDaily(on, lang, now);
    await save({ ...get(), daily: on, syncedOn });
    return on;
  },

  // The boot path's entry point. A sync rewrites the whole horizon, so this
  // does nothing at all on the second launch of a day.
  syncIfDue: async (lang: Lang, now: Date = new Date()): Promise<void> => {
    const { daily, syncedOn } = get();
    if (!daily) return;
    if (!dueForSync(syncedOn, now)) return;

    const stamp = now.toDateString();
    set({ syncedOn: stamp });
    await syncDaily(true, lang, now);
    await save({ ...get(), syncedOn: stamp });
  },
}));

export const useFavorites = (): {
  favorites: Favorites;
  toggleFavorite: (quote: string) => Promise<void>;
} => {
  const favorites = useAdviceStore((s) => s.favorites);
  const toggleFavorite = useAdviceStore((s) => s.toggleFavorite);
  const hydrate = useAdviceStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { favorites, toggleFavorite };
};
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/modules/advice/__tests__/store.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Run everything and commit**

```bash
npx tsc --noEmit && npm test
git add src/modules/advice/store.ts src/modules/advice/__tests__/store.test.ts
git commit -m "feat: the module 02 store owns the daily card

A refusal leaves it off, because Android never re-prompts and a row
reading ON over a phone that will never show a card is worse than one
reading OFF. syncIfDue does nothing on the second launch of a day."
```

---

## Task 5: `ModuleDef.Settings`, and one preferences row

The SYSTEM screen must not name a module. It renders whatever the registry's modules contribute.

**Files:**
- Create: `src/shell/PrefRow.tsx`
- Modify: `src/modules/types.ts`, `src/shell/SystemScreen.tsx`, `src/shell/__tests__/SystemScreen.test.tsx`

**Interfaces:**
- Consumes: `registry`, `isModule`.
- Produces: `PrefRow({ label, value, onPress, valueColor, testID })`; `ModuleDef.Settings?: ComponentType`.

- [ ] **Step 1: Write the failing test**

This task must not assert on module 02's row — that row is Task 6's deliverable,
and a task that ends on a red test its own code cannot turn green is not
independently reviewable. Assert on the mechanism instead.

Add to `src/shell/__tests__/SystemScreen.test.tsx`:

```tsx
import { registry } from '../../modules/registry';
import { isModule } from '../../modules/types';

// The shell owns the tile, the bleed, the exit and her dot — and names no
// module. A preferences row belonging to a room is contributed by that room,
// so this asserts the shell renders whatever the registry offers rather than
// asserting on any particular room's row.
it('renders whatever preferences rows the registry offers', async () => {
  const seen = jest.fn();
  const target = registry.filter(isModule)[0];
  const previous = target.Settings;
  target.Settings = () => {
    seen();
    return null;
  };
  try {
    const view = await render(<SystemScreen />);
    expect(seen).toHaveBeenCalled();
    await view.unmount();
  } finally {
    target.Settings = previous;
  }
});

it('still shows the language row after the row extraction', async () => {
  const view = await render(<SystemScreen />);
  expect(view.getByTestId('pref-language')).toBeTruthy();
  await view.unmount();
});
```

- [ ] **Step 2: Run and watch both fail**

Run: `npx jest src/shell/__tests__/SystemScreen.test.tsx -t "preferences row"`
Expected: FAIL — the first because `Settings` is not on `ModuleDef` and nothing
renders it, the second because `pref-language` does not exist yet.

- [ ] **Step 3: Create `PrefRow`**

Create `src/shell/PrefRow.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';

// One preferences row, in one place, because modules contribute rows here too
// and a room reproducing the shell's geometry from memory is how two of them
// end up looking almost the same. The row is a SHELL surface: it wears the
// shell's amber, not the module's ink. The doorway rule governs what is behind
// a doorway, and this is in front of one.
export function PrefRow({
  label,
  value,
  onPress,
  valueColor,
  testID,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  valueColor?: string;
  testID?: string;
}) {
  const lang = useFacilityStore((s) => s.lang);
  const body = (
    <>
      <Text style={[styles.rowLabel, { fontFamily: font('mono', 500, lang) }]}>{label}</Text>
      <Text
        testID={testID}
        style={[
          styles.rowValue,
          { fontFamily: font('mono', 500, lang) },
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </>
  );

  return onPress ? (
    <Pressable style={styles.row} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.borderSoft,
  },
  rowLabel: {
    fontSize: ms(11),
    letterSpacing: ms(11) * 0.06,
    color: palette.text,
  },
  rowValue: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.16,
    color: palette.amber,
  },
});
```

- [ ] **Step 4: Add `Settings` to `ModuleDef`**

In `src/modules/types.ts`:

```ts
export interface ModuleDef {
  id: ModuleId;
  slot: '01' | '02';
  Tile: ComponentType<{ onPress: () => void }>;
  Screen: ComponentType;
  // A row this room contributes to the SYSTEM screen's PREFERENCES section.
  // Optional: most rooms have no preference to offer. It exists so the shell
  // can carry a module's setting without naming the module — the same reason
  // Cabinet and ScreenRouter read the registry instead of a list.
  Settings?: ComponentType;
}
```

- [ ] **Step 5: Rewrite the two existing rows and render the registry's**

In `src/shell/SystemScreen.tsx`, add:

```tsx
import { registry } from '../modules/registry';
import { isModule } from '../modules/types';
import { PrefRow } from './PrefRow';
```

Replace the LANGUAGE `Pressable` with:

```tsx
<PrefRow
  testID="pref-language"
  label={t.lang}
  value={lang === 'en' ? 'EN / ko' : 'en / KO'}
  onPress={() => void setLang(lang === 'en' ? 'ko' : 'en')}
/>
```

Replace the LAUNCHER `View` with (keeping its comment above it verbatim):

```tsx
<PrefRow
  testID="launcher-face"
  label={t.launcher}
  value={wears === null ? t.launcherUnread : agrees ? wears : `${wears} → ${expects}`}
  valueColor={agrees ? undefined : palette.danger}
/>
```

Then, after the launcher's `swap` line and still inside the PREFERENCES
`View`, add:

```tsx
{/* Rooms contribute their own rows. The shell names no module — the same
    promise registry.ts makes about Cabinet and ScreenRouter. */}
{registry.filter(isModule).map((m) => (m.Settings ? <m.Settings key={m.id} /> : null))}
```

Delete the now-unused `row`, `rowLabel` and `rowValue` entries from
`SystemScreen`'s own `StyleSheet` **only if nothing else in the file uses
them** — check with `grep -n "styles.row" src/shell/SystemScreen.tsx` first; the
ACCESS section may use `styles.row`.

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npm test`
Expected: all suites pass. No module supplies a `Settings` yet, so the registry
renders nothing — which is the correct state until Task 6.

- [ ] **Step 7: Commit**

```bash
git add src/shell/PrefRow.tsx src/modules/types.ts src/shell/SystemScreen.tsx src/shell/__tests__/SystemScreen.test.tsx
git commit -m "feat: rooms can contribute a preferences row

SystemScreen naming EXCELLENT ADVICE would make it the third file
hardcoding a module, against registry.ts's promise that a module is one
folder plus one line. ModuleDef gains an optional Settings and the shell
renders whatever the registry offers."
```

---

## Task 6: Module 02's row

**Files:**
- Create: `src/modules/advice/Settings.tsx`, `src/modules/advice/__tests__/settings.test.tsx`
- Modify: `src/modules/advice/strings.ts`, `src/modules/advice/index.tsx`

**Interfaces:**
- Consumes: `PrefRow` from `../../shell/PrefRow`; `permissionState` from `./notify`; `useAdviceStore`; `T`.
- Produces: `AdviceSettings` component, attached as `advice.Settings`.

- [ ] **Step 1: Add the strings**

In `src/modules/advice/strings.ts`, add to `AdviceStrings` and both tables:

```ts
  daily: string;
  on: string;
  off: string;
  blocked: string;
```

```ts
// en
  daily: 'DAILY ADVICE',
  on: 'ON',
  off: 'OFF',
  blocked: 'BLOCKED · SETTINGS',
```

```ts
// ko
  daily: '매일의 조언',
  on: '켬',
  off: '끔',
  blocked: '차단됨 · 설정',
```

- [ ] **Step 2: Write the failing test**

Create `src/modules/advice/__tests__/settings.test.tsx`:

```tsx
import React from 'react';
import * as Notifications from 'expo-notifications';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { advice } from '../index';
import { useAdviceStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;
const Settings = advice.Settings as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
  notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useFacilityStore.setState({ lang: 'en' });
  useAdviceStore.setState({ hydrated: true, favorites: new Set(), daily: false, syncedOn: null });
});

describe('the daily advice row', () => {
  it('reads OFF until it is switched on', async () => {
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-daily').props.children).toBe('OFF');
    await view.unmount();
  });

  it('reads ON once it is', async () => {
    useAdviceStore.setState({ daily: true });
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-daily').props.children).toBe('ON');
    await view.unmount();
  });

  it('switches on when the permission is given', async () => {
    const view = await render(<Settings />);
    await fireEvent.press(view.getByTestId('pref-daily'));
    await waitFor(() => expect(useAdviceStore.getState().daily).toBe(true));
    await view.unmount();
  });

  // Read at render, the way the LAUNCHER row reads the launcher's real face:
  // the store would still say `daily` after the permission was revoked in the
  // OS settings, and only asking catches that nothing is arriving.
  it('reads BLOCKED when the permission was refused, whatever the store says', async () => {
    notifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    useAdviceStore.setState({ daily: true });
    const view = await render(<Settings />);
    await waitFor(() =>
      expect(view.getByTestId('pref-daily').props.children).toBe('BLOCKED · SETTINGS'),
    );
    await view.unmount();
  });

  it('says it in the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<Settings />);
    expect(view.getByText('매일의 조언')).toBeTruthy();
    await view.unmount();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx jest src/modules/advice/__tests__/settings.test.tsx`
Expected: FAIL — `advice.Settings` is undefined.

- [ ] **Step 4: Write the implementation**

Create `src/modules/advice/Settings.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../../core/store';
import { PrefRow } from '../../shell/PrefRow';
import { type PermissionState, permissionState } from './notify';
import { useAdviceStore } from './store';
import { T } from './strings';

// This room's one preference, shown on the SYSTEM screen. The row is a shell
// surface and wears the shell's chrome (PrefRow); what it says and what it does
// belong to the room.
export function AdviceSettings() {
  const lang = useFacilityStore((s) => s.lang);
  const daily = useAdviceStore((s) => s.daily);
  const setDaily = useAdviceStore((s) => s.setDaily);
  const t = T[lang];

  // Read at render, exactly as the LAUNCHER row reads the launcher's real
  // face rather than what was last asked for: the store would still say
  // `daily` after a permission revoked in the OS settings, and only asking
  // catches that nothing is arriving.
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await permissionState();
      if (!cancelled) setPermission(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [daily]);

  const blocked = permission === 'blocked';
  const value = blocked ? t.blocked : daily ? t.on : t.off;

  return (
    <PrefRow
      testID="pref-daily"
      label={t.daily}
      value={value}
      onPress={blocked ? undefined : () => void setDaily(!daily, lang)}
    />
  );
}
```

- [ ] **Step 5: Attach it to the module**

In `src/modules/advice/index.tsx`, add `import { AdviceSettings } from './Settings';` and extend the export:

```ts
export const advice: ModuleDef = {
  id: 'mod02',
  slot: '02',
  Tile: AdviceTile,
  Screen: AdviceScreen,
  Settings: AdviceSettings,
};
```

- [ ] **Step 6: Run it and watch it pass**

Run: `npx jest src/modules/advice/__tests__/settings.test.tsx src/shell/__tests__/SystemScreen.test.tsx`
Expected: PASS — including Task 5's `pref-daily` test, which now has its row.

- [ ] **Step 7: Run everything and commit**

```bash
npx tsc --noEmit && npm test
git add src/modules/advice/Settings.tsx src/modules/advice/strings.ts src/modules/advice/index.tsx src/modules/advice/__tests__/settings.test.tsx
git commit -m "feat: module 02 offers its own row under PREFERENCES

Three states, because Android never re-prompts after a refusal. The
permission is read at render rather than trusted from the store, the way
the LAUNCHER row reads the launcher's real face — a permission revoked in
the OS settings would otherwise leave the row saying ON forever."
```

---

## Task 7: The tap

**Files:**
- Modify: `src/core/store.ts`, `src/modules/advice/index.tsx`, `App.tsx`, `src/core/__tests__/store.test.ts`, `src/modules/advice/__tests__/screen.test.tsx`

**Interfaces:**
- Consumes: `readTapTarget`, `onTap` from `src/modules/advice/notify`; `goTo` from `./deck`.
- Produces: on `useFacilityStore` — `pendingQuote: number | null`, `openQuote(index: number): void`.

- [ ] **Step 1: Write the failing tests**

Add to `src/core/__tests__/store.test.ts`:

```ts
it('opens the room on a card, and closes the drawer on the way', async () => {
  useFacilityStore.setState({ view: 'stage', cabinetOpen: true, pendingQuote: null });
  useFacilityStore.getState().openQuote(41);
  const s = useFacilityStore.getState();
  expect(s.view).toBe('mod02');
  expect(s.cabinetOpen).toBe(false);
  expect(s.pendingQuote).toBe(41);
});
```

Add to `src/modules/advice/__tests__/screen.test.tsx`:

```tsx
// The tap's whole point: the card in the notification is the card on screen.
it('deals the card the notification carried, and forgets it', async () => {
  useFacilityStore.setState({ pendingQuote: 41 });
  const view = await render(<Screen />);
  expect(view.getByTestId('advice-quote').props.children).toBe(QUOTES[41]);
  expect(useFacilityStore.getState().pendingQuote).toBeNull();
  await view.unmount();
});

// Forgotten means forgotten: walking back into the room later must not
// re-deal a card from a notification tapped hours ago.
it('deals an ordinary card when nothing was tapped', async () => {
  useFacilityStore.setState({ pendingQuote: null });
  const view = await render(<Screen />);
  expect(QUOTES).toContain(view.getByTestId('advice-quote').props.children);
  await view.unmount();
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx jest src/core/__tests__/store.test.ts -t "opens the room on a card"`
Expected: FAIL — `openQuote is not a function`.

- [ ] **Step 3: Add the store field and action**

In `src/core/store.ts`, add to the state interface (beside `view`):

```ts
  // A card a notification asked for, waiting for the room to open and take it.
  // Not persisted: a tap is a thing that just happened, and one survived across
  // a restart would re-deal a card from a notification tapped hours ago.
  pendingQuote: number | null;
  openQuote: (index: number) => void;
```

to the initial state:

```ts
  pendingQuote: null,
```

and the action:

```ts
  // The notification's way in. It closes the cabinet because the tap did not
  // come through it — and on a dormant stage there is no cabinet to come
  // through at all, which is the one door this opens that nothing else does.
  openQuote: (index: number): void => {
    set({ view: 'mod02', pendingQuote: index, cabinetOpen: false });
  },
```

- [ ] **Step 4: Consume it in the room**

In `src/modules/advice/index.tsx`, inside `AdviceScreen`, after the `deck`
state and before `card`:

```tsx
  const pendingQuote = useFacilityStore((s) => s.pendingQuote);

  // A card a notification asked for. Taken once and cleared, so walking back
  // into the room later deals an ordinary card. goTo moves the position within
  // this pass rather than starting a new one, so the counter stays truthful.
  useEffect(() => {
    if (pendingQuote == null) return;
    setDeck((d) => goTo(d, pendingQuote));
    setListing(false);
    useFacilityStore.setState({ pendingQuote: null });
  }, [pendingQuote]);
```

Add `useEffect` to the React import.

- [ ] **Step 5: Wire both delivery paths in `App.tsx`**

Inside the existing boot `useEffect`, after `hydrate()` and `greetOnce()`:

```tsx
      // The app was not running: Android held the tap and hands it over now.
      const tapped = await readTapTarget();
      if (tapped != null) useFacilityStore.getState().openQuote(tapped);

      // And the daily horizon, which does nothing on the second launch of a day.
      void useAdviceStore.getState().hydrate().then(() => {
        void useAdviceStore.getState().syncIfDue(useFacilityStore.getState().lang);
      });
```

and beside the existing `AppState` subscription:

```tsx
    // The app was already running.
    const offTap = onTap((index) => useFacilityStore.getState().openQuote(index));
```

and in the cleanup:

```tsx
    return () => {
      sub.remove();
      offTap();
    };
```

with `import { onTap, readTapTarget } from './src/modules/advice/notify';` and
`import { useAdviceStore } from './src/modules/advice/store';`.

- [ ] **Step 6: Run and watch them pass**

Run: `npx jest src/core/__tests__/store.test.ts src/modules/advice/__tests__/screen.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run everything and commit**

```bash
npx tsc --noEmit && npm test
git add src/core/store.ts src/modules/advice/index.tsx App.tsx src/core/__tests__/store.test.ts src/modules/advice/__tests__/screen.test.tsx
git commit -m "feat: a tapped card opens the room already dealt

pendingQuote is not persisted: a tap is a thing that just happened, and
one surviving a restart would re-deal a card from a notification tapped
hours ago. On a dormant stage this is the one way into a cabinet room,
because a dormant stage has no cabinet."
```

---

## Task 8: The map catches up

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite the claim that is no longer true**

The bullet reading **"`expo-notifications` is gone**, along with `@react-native-community/slider`. There are no notifications, no permission ceremony, and no background work of any kind in v2 — the daily loop that justified them was deleted." must become:

```markdown
- **`expo-notifications` is back, for module 02 only (2026-09-04)**, and it is native — the dev build on the phone cannot show a card until the next `--profile development` build. `@react-native-community/slider` is still gone. Two of the three clauses of the v2 decision fall: there are notifications, and there is a permission ceremony. **The third holds — there is still no background work of any kind** — and `docs/superpowers/specs/2026-09-04-daily-advice-design.md` §3 is the consequence of holding it: a repeating trigger cannot vary its content, and nothing of ours is awake at 09:00, so ninety cards are handed to Android with their text already written into them and the queue runs dry after ninety days of not opening the app.
```

- [ ] **Step 2: Add the narrative section**

Immediately before `**The six stores (spec §8).**`, add:

```markdown
**Module 02 sends a card at nine (2026-09-04).** One of the book's 232 highlights each morning; tapping it opens the room in shuffle mode with that exact quote dealt and its star live. Off by default, switched on from SYSTEM, which is also the user action Android requires before `POST_NOTIFICATIONS` can be asked for — and that permission gates **local** notifications too, not only push, so there was no version of this without a ceremony.

**The voice is the book's, not hers and not the building's.** v1's notifications came from `The Facility` in its own register; this one is titled `EXCELLENT ADVICE` with the quote and Kevin Kelly underneath. She is told nothing about module 02 and that does not change: putting her name on a line she never composed is the thing `systemNotice` is styled to prevent.

**Three things about the mechanism that are easy to get wrong later.** The randomness happens at **scheduling** time, not delivery — `planDaily` draws ninety cards at once and each notification carries its finished text, because Android holds and fires them while the app is not running. Every sync **rewrites** the horizon, so no quote is ever assigned to a date; draws made today are replaced tomorrow, invisibly, since the replaced ones were never seen. And the sync runs **at most once a day** (`dueForSync`, stamped with a `toDateString()` matching the soul store's `day`), because ninety cancels and ninety native calls in the boot path on every launch would produce an identically-shaped result.

**The SYSTEM row belongs to the room, not the shell.** `ModuleDef` gained an optional `Settings?: ComponentType` rather than let `SystemScreen` hardcode `EXCELLENT ADVICE` and become the third file naming a module. `PrefRow` is the shared row; it wears the shell's amber, because the doorway rule governs what is behind a doorway and this is in front of one. The row reads `getPermissionsAsync()` **at render** the way the LAUNCHER row reads the launcher's real face — the store would otherwise say ON forever after a permission revoked in the OS settings.

**And the tap is the one door that skips the cabinet.** The room works with no API key, so a tap opens module 02 on a dormant stage, which has no drawer and therefore no cabinet. `pendingQuote` is deliberately **not** persisted: a tap is a thing that just happened, and one surviving a restart would re-deal a card from a notification tapped hours ago.
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm test
git add CLAUDE.md
git commit -m "docs: the map catches up with the card at nine"
```

---

## On-device verification

Nothing below can be covered by `npm test`. It needs a fresh build:

```bash
npx eas-cli@latest build -p android --profile development --clear-cache
```

- [ ] SYSTEM shows `DAILY ADVICE  OFF`; pressing it raises the Android permission dialog.
- [ ] Granting it leaves the row reading `ON`.
- [ ] Refusing it leaves the row reading `BLOCKED · SETTINGS` and unpressable.
- [ ] Revoking the permission in Android settings, then reopening SYSTEM, flips `ON` to `BLOCKED`.
- [ ] A card arrives at 09:00. (To check sooner, temporarily set `NOTIFY_HOUR` to the next hour, rebuild, and revert.)
- [ ] Tapping the card **with the app closed** opens module 02 with that exact quote showing.
- [ ] Tapping it **with the app open on the stage** does the same.
- [ ] The star on that card works, and the quote is in the list afterwards.
- [ ] With no API key entered, the tap still opens the room, and its exit returns to the dormant stage.
- [ ] Switching the row off stops the cards.
