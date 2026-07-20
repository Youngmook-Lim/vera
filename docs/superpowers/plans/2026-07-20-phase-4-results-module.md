# Results Pending Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `results` placeholder Screen with the real Results Pending module — a live-ticking queue-position satire with drift-on-open, per the design spec.

**Architecture:** Pure functions in `queue.ts` (deterministic per-day starting number + the 1.1s ticker step) drive a stateless-logic React `Screen` that mirrors `src/shell/daily`'s build style (`react-native-reanimated` + plain Views, **no Skia**). Strings port verbatim from the prototype. One new storage key (`lastSeenQueue`) makes the "since yesterday" delta real.

**Tech Stack:** React Native + Expo (TypeScript), Zustand store, `react-native-reanimated`, AsyncStorage (behind `core/storage.ts`), Jest 29 + async React Testing Library v14.

## Global Constraints

- **Copy verbatim:** all user-facing copy comes from `STR.en`/`STR.ko` in `design/The Facility.dc.html`; all hex values from `design/README.md` / the prototype markup. Do not "improve" either.
- **Korean is provisional:** ported as-is; the native-speaker comedy pass is Phase 5. (Note: prototype `rVera` ko contains `기늀하지`, a likely-corrupted `기뻐하지` — copy verbatim, flag for the Phase 5 pass, do not silently change.)
- **Stay Expo Go-runnable:** no Skia, no new native modules, no new dependencies. This module needs none.
- **Verify with** `npm test` and `npx tsc --noEmit` before every commit.
- **RTL v14 is fully async:** `await render(...)`, `await fireEvent.press(...)`; no global `screen`.
- **Timer cleanup is mandatory** on unmount (the queue ticker is the explicit risk called out in `docs/architecture.md`).
- **Type sizes use `ms(px)`**; fonts use `font(role, weight, lang)` — both from `core/theme.ts`.

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/results/queue.ts` (create) | Pure logic: constants, `queueForDay`, `nextTick`, `formatQueue`, types. No React, no I/O. |
| `src/modules/results/queue.test.ts` (create) | Unit tests for `queue.ts`. |
| `src/modules/results/strings.ts` (create) | `resultsStrings` (screen copy, en/ko) ported verbatim. |
| `src/modules/results/strings.test.ts` (create) | en/ko key-parity test. |
| `src/core/storage.ts` (modify) | Add `lastSeenQueue` key. |
| `src/modules/results/index.tsx` (modify) | Replace placeholder `Screen` with the real one; keep the existing tile untouched. |
| `src/modules/results/__tests__/ResultsScreen.test.tsx` (create) | Component tests (render, back nav, up-jump, delta, cleanup). |

---

## Task 1: Pure queue logic (`queue.ts`)

**Files:**
- Create: `src/modules/results/queue.ts`
- Test: `src/modules/results/queue.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `QUEUE_BASE = 8442105`, `QUEUE_FLOOR = 8000000`, `FIRST_DELTA = -1204` (all `number` consts)
  - `type QueueEvent = 'none' | 'up'`
  - `interface TickState { queue: number; delta: number; event: QueueEvent; tick: number }`
  - `queueForDay(enrolledAt: string | null, dayKey: string): number` — deterministic net-neutral jitter around `QUEUE_BASE`, floored at `QUEUE_FLOOR`.
  - `nextTick(s: TickState, rand?: () => number): TickState` — one 1.1s ticker step.
  - `formatQueue(n: number): string` — grouped thousands, e.g. `"8,442,105"`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/results/queue.test.ts`:

```ts
import {
  QUEUE_BASE,
  QUEUE_FLOOR,
  FIRST_DELTA,
  queueForDay,
  nextTick,
  formatQueue,
  type TickState,
} from './queue';

describe('queueForDay', () => {
  it('is deterministic for the same inputs', () => {
    expect(queueForDay('2026-07-01', '2026-07-20')).toBe(queueForDay('2026-07-01', '2026-07-20'));
  });

  it('jitters around the base (net-neutral), staying within ±250k of base', () => {
    const v = queueForDay('2026-07-01', '2026-07-20');
    expect(Math.abs(v - QUEUE_BASE)).toBeLessThanOrEqual(250000);
  });

  it('never drops below the floor across a year of days', () => {
    for (let d = 1; d <= 365; d++) {
      const key = `2026-${String(((d - 1) % 12) + 1).padStart(2, '0')}-${String((d % 28) + 1).padStart(2, '0')}`;
      expect(queueForDay('2026-01-01', key)).toBeGreaterThanOrEqual(QUEUE_FLOOR);
    }
  });

  it('produces both improved and worsened day-to-day deltas over a range of days', () => {
    const deltas: number[] = [];
    for (let d = 1; d < 40; d++) {
      const a = queueForDay('2026-01-01', `2026-01-${String(d).padStart(2, '0')}`);
      const b = queueForDay('2026-01-01', `2026-01-${String(d + 1).padStart(2, '0')}`);
      deltas.push(b - a);
    }
    expect(deltas.some((x) => x > 0)).toBe(true);
    expect(deltas.some((x) => x < 0)).toBe(true);
  });

  it('handles a null enrolledAt without throwing', () => {
    expect(() => queueForDay(null, '2026-07-20')).not.toThrow();
  });
});

describe('nextTick', () => {
  const base: TickState = { queue: QUEUE_BASE, delta: FIRST_DELTA, event: 'none', tick: 0 };

  it('drops by 1..4 on a normal tick and keeps event none', () => {
    const s = nextTick(base, () => 0); // rand=0 -> drop of 1
    expect(base.queue - s.queue).toBe(1);
    expect(s.delta).toBe(FIRST_DELTA - 1);
    expect(s.event).toBe('none');
    expect(s.tick).toBe(1);
  });

  it('jumps up by 2000..5999 on every 9th tick and sets event=up', () => {
    let s: TickState = { ...base, tick: 8 };
    s = nextTick(s, () => 0); // tick 9 -> jump of exactly 2000
    expect(s.queue - QUEUE_BASE).toBe(2000);
    expect(s.delta).toBe(FIRST_DELTA + 2000);
    expect(s.event).toBe('up');
    expect(s.tick).toBe(9);
  });

  it('resets event to none on the tick after a jump', () => {
    const afterJump: TickState = { queue: QUEUE_BASE, delta: FIRST_DELTA, event: 'up', tick: 9 };
    const s = nextTick(afterJump, () => 0); // tick 10 -> tick%9===1
    expect(s.event).toBe('none');
  });

  it('never lets the queue fall below the floor', () => {
    const low: TickState = { queue: QUEUE_FLOOR, delta: 0, event: 'none', tick: 1 };
    const s = nextTick(low, () => 0.999); // biggest drop
    expect(s.queue).toBe(QUEUE_FLOOR);
  });
});

describe('formatQueue', () => {
  it('groups thousands', () => {
    expect(formatQueue(8442105)).toBe('8,442,105');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/results/queue.test.ts`
Expected: FAIL — cannot find module `./queue`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/results/queue.ts`:

```ts
// Pure logic for Results Pending. No React, no I/O — see the design spec
// docs/superpowers/specs/2026-07-20-results-module-design.md.
//
// The queue is fiction: a net-neutral daily jitter around a fixed base (so it
// goes nowhere forever — "EST. WAIT 4,331 YEARS" stays true), plus the
// prototype's live 1.1s ticker while the screen is open. Never reaches zero.

export const QUEUE_BASE = 8442105;
export const QUEUE_FLOOR = 8000000;
export const FIRST_DELTA = -1204;
const JITTER_AMP = 200000; // ±, keeps every day comfortably above the floor

export type QueueEvent = 'none' | 'up';

export interface TickState {
  queue: number;
  delta: number;
  event: QueueEvent;
  tick: number;
}

// Deterministic FNV-1a hash of a string -> unit interval [0, 1).
const hashUnit = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

// Starting number for a given day: base ± jitter, keyed on (enrolledAt, day) so
// it is stable within a day and independent day-to-day (no trend), floored.
export const queueForDay = (enrolledAt: string | null, dayKey: string): number => {
  const jitter = Math.round((hashUnit(`${enrolledAt ?? 'anon'}|${dayKey}`) * 2 - 1) * JITTER_AMP);
  return Math.max(QUEUE_FLOOR, QUEUE_BASE + jitter);
};

// One 1.1s ticker step (ported from the prototype's startQueue). rand is
// injectable for deterministic tests.
export const nextTick = (s: TickState, rand: () => number = Math.random): TickState => {
  const tick = s.tick + 1;
  if (tick % 9 === 0) {
    const jump = 2000 + Math.floor(rand() * 4000);
    return { queue: s.queue + jump, delta: s.delta + jump, event: 'up', tick };
  }
  const drop = 1 + Math.floor(rand() * 4);
  const event: QueueEvent = tick % 9 === 1 ? 'none' : s.event === 'up' ? 'none' : s.event;
  return { queue: Math.max(QUEUE_FLOOR, s.queue - drop), delta: s.delta - drop, event, tick };
};

export const formatQueue = (n: number): string => n.toLocaleString('en-US');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/results/queue.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/modules/results/queue.ts src/modules/results/queue.test.ts
git commit -m "feat: results queue logic (drift-on-open + live ticker)"
```

---

## Task 2: Screen strings (`strings.ts`)

**Files:**
- Create: `src/modules/results/strings.ts`
- Test: `src/modules/results/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>` from `src/core/i18n.ts`.
- Produces: `resultsStrings: Strings<ResultsStrings>` and `type ResultsStrings`, with keys:
  `title, caseLabel, rPosition, rWait, rEnrolled, rProcessed, rResult, rSince, rLiveUp, rVera, rVeraUp`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/results/strings.test.ts`:

```ts
import { resultsStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(resultsStrings.ko).sort()).toEqual(Object.keys(resultsStrings.en).sort());
});

test('copy is ported verbatim from the prototype', () => {
  expect(resultsStrings.en.rPosition).toBe('YOUR POSITION IN QUEUE');
  expect(resultsStrings.en.rWait).toBe('EST. WAIT · 4,331 YEARS');
  expect(resultsStrings.en.rVeraUp).toBe(
    'Your position worsened just now. Someone was prioritized. It was not you.',
  );
  expect(resultsStrings.ko.rSince).toBe('어제 이후');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/results/strings.test.ts`
Expected: FAIL — cannot find module `./strings`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/results/strings.ts`. Copy verbatim from `design/The Facility.dc.html` (`STR.en` ~lines 900–906, `STR.ko` ~lines 1041–1047). `·` is U+00B7. **Keep the ko `rVera` `기늀하지` verbatim** (flagged in Global Constraints for the Phase 5 pass).

```ts
import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. (ko rVera "기늀하지" is a
// likely-corrupted "기뻐하지"; left verbatim per the copy rule, flag in Phase 5.)
const en = {
  title: 'RESULTS PENDING',
  caseLabel: 'CASE #8442105',
  rPosition: 'YOUR POSITION IN QUEUE',
  rWait: 'EST. WAIT · 4,331 YEARS',
  rEnrolled: 'ENROLLED',
  rProcessed: '0.02% PROCESSED',
  rResult: 'RESULT',
  rSince: 'SINCE YESTERDAY',
  rLiveUp: 'LIVE · QUEUE ADJUSTED',
  rVera: 'Your position improved. Do not celebrate. Yesterday it worsened, and I did not console you.',
  rVeraUp: 'Your position worsened just now. Someone was prioritized. It was not you.',
};

export type ResultsStrings = typeof en;

const ko: ResultsStrings = {
  title: '결과 대기',
  caseLabel: 'CASE #8442105',
  rPosition: '대기열 내 귀하의 순위',
  rWait: '예상 대기 · 4,331년',
  rEnrolled: '등록',
  rProcessed: '0.02% 처리됨',
  rResult: '결과',
  rSince: '어제 이후',
  rLiveUp: '실시간 · 대기열 조정됨',
  rVera: '귀하의 순위가 상승했습니다. 기늀하지 마십시오. 어제는 하락했고, 저는 위로하지 않았습니다.',
  rVeraUp: '귀하의 순위가 방금 하락했습니다. 누군가 우선 처리되었습니다. 귀하는 아니었습니다.',
};

export const resultsStrings: Strings<ResultsStrings> = { en, ko };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/results/strings.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/modules/results/strings.ts src/modules/results/strings.test.ts
git commit -m "feat: results screen strings (en/ko, verbatim)"
```

---

## Task 3: Results Screen + storage key (`index.tsx`, `storage.ts`)

**Files:**
- Modify: `src/core/storage.ts` (add `lastSeenQueue` key)
- Modify: `src/modules/results/index.tsx` (replace placeholder `Screen`; keep tile as-is)
- Test: `src/modules/results/__tests__/ResultsScreen.test.tsx`

**Interfaces:**
- Consumes: `queueForDay`, `nextTick`, `formatQueue`, `FIRST_DELTA`, `TickState` (Task 1); `resultsStrings` (Task 2); `dayKey` (`core/compliance`); `useFacilityStore`, `KEYS`, `storage`, `font`, `ms`, `palette` (core); `VeraPanel` (shell).
- Produces: the real `results` `ModuleDef.Screen`. The tile export is unchanged.

- [ ] **Step 1: Add the storage key**

In `src/core/storage.ts`, add one line to the `KEYS` object (after `forfeited`):

```ts
  forfeited: 'facility.forfeited.v1',
  lastSeenQueue: 'facility.lastSeenQueue.v1',
```

- [ ] **Step 2: Write the failing component test**

Create `src/modules/results/__tests__/ResultsScreen.test.tsx`:

```ts
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { dayKey } from '../../../core/compliance';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { queueForDay } from '../queue';
import { resultsStrings } from '../strings';
import { results } from '../index';

const Screen = results.Screen;

beforeEach(async () => {
  await storage.remove(KEYS.lastSeenQueue);
  useFacilityStore.setState({ step: 'results', lang: 'en', enrolledAt: '2026-07-01' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders the position label and back arrow returns to facility', async () => {
  const { getByText, getByLabelText } = await render(<Screen />);
  expect(getByText(resultsStrings.en.rPosition)).toBeTruthy();
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('the 9th tick jumps the position up and V.E.R.A. switches to the worsened line', async () => {
  jest.useFakeTimers();
  const { getByText, queryByText } = await render(<Screen />);
  expect(getByText(resultsStrings.en.rVera)).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(9 * 1100);
  });
  expect(getByText(resultsStrings.en.rVeraUp)).toBeTruthy();
  expect(queryByText(resultsStrings.en.rVera)).toBeNull();
});

test('shows the real since-yesterday delta from the last visit', async () => {
  jest.useFakeTimers();
  const start = queueForDay('2026-07-01', dayKey(new Date()));
  await storage.set(KEYS.lastSeenQueue, String(start - 5000)); // improved by 5,000
  const { getByText } = await render(<Screen />);
  await act(async () => {}); // flush the storage read microtask
  expect(getByText((t) => t.includes('5,000') && t.includes(resultsStrings.en.rSince))).toBeTruthy();
  expect(await storage.get(KEYS.lastSeenQueue)).toBe(String(start));
});

test('clears the ticker on unmount', async () => {
  jest.useFakeTimers();
  const clearSpy = jest.spyOn(global, 'clearInterval');
  const { unmount } = await render(<Screen />);
  unmount();
  expect(clearSpy).toHaveBeenCalled();
  clearSpy.mockRestore();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/results/__tests__/ResultsScreen.test.tsx`
Expected: FAIL — the placeholder `Screen` renders `PlaceholderScreen`, so `rPosition`/`rVera` are not present.

- [ ] **Step 4: Implement the Screen**

Replace the entire contents of `src/modules/results/index.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { dayKey } from '../../core/compliance';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { FIRST_DELTA, formatQueue, nextTick, queueForDay, type TickState } from './queue';
import { resultsStrings } from './strings';

// Home-grid tile — unchanged from the placeholder.
const tileStrings = {
  en: { title: 'RESULTS PENDING', sub: '#8,442,105', tag: 'QUEUED' },
  ko: { title: '결과 대기', sub: '#8,442,105', tag: '대기열' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 14, color: '#b9b09a' }}>⌛</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = resultsStrings[lang];

  // Starting number is deterministic per day (drift-on-open) and known
  // synchronously; delta is refined from the previous visit once storage reads.
  const [state, setState] = useState<TickState>(() => ({
    queue: queueForDay(enrolledAt, dayKey(new Date())),
    delta: FIRST_DELTA,
    event: 'none',
    tick: 0,
  }));

  useEffect(() => {
    const start = queueForDay(enrolledAt, dayKey(new Date()));
    let alive = true;
    void storage
      .get(KEYS.lastSeenQueue)
      .then((raw) => {
        if (!alive) return;
        const last = raw == null ? NaN : Number(raw);
        if (Number.isFinite(last)) setState((s) => ({ ...s, delta: start - last }));
        return storage.set(KEYS.lastSeenQueue, String(start));
      })
      .catch(() => {});
    const id = setInterval(() => setState((s) => nextTick(s)), 1100);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enrolledAt]);

  const up = state.event === 'up';
  const numberColor = up ? '#ff8a6a' : '#f4efe2';
  const deltaImproved = state.delta <= 0;
  const deltaColor = deltaImproved ? palette.accent.green : '#ff6a5a';
  const deltaText =
    (up ? `${t.rLiveUp} · ` : '') + formatQueue(Math.abs(state.delta)) + ' ' + t.rSince;

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#2a2820',
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8168' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c6656' }}>{t.caseLabel}</Text>
      </View>

      {/* readout */}
      <View style={{ alignItems: 'center', paddingHorizontal: 26, paddingTop: 56 }}>
        <Text
          style={{
            fontFamily: font('mono', 500, lang),
            fontSize: ms(9.5),
            letterSpacing: ms(9.5) * 0.24,
            color: '#6c6656',
          }}
        >
          {t.rPosition}
        </Text>
        <Text
          style={{
            marginTop: 24,
            fontFamily: font('display', 700, lang),
            fontSize: ms(52),
            letterSpacing: ms(52) * 0.01,
            color: numberColor,
            textShadowColor: up ? '#ff6a1a44' : '#f4b43a33',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 34,
          }}
        >
          {formatQueue(state.queue)}
        </Text>
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: ms(12), color: deltaColor }}>{deltaImproved ? '▼' : '▲'}</Text>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(10), color: deltaColor }}>{deltaText}</Text>
        </View>
        <Text style={{ marginTop: 10, fontFamily: font('mono', 500, lang), fontSize: ms(9.5), color: '#8a8168' }}>
          {t.rWait}
        </Text>

        {/* progress + labels (authored constants) */}
        <View style={{ marginTop: 40, width: '100%', height: 6, backgroundColor: '#221f18', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: '2%', height: '100%', backgroundColor: palette.accent.orange }} />
        </View>
        <View style={{ marginTop: 8, width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
          {[t.rEnrolled, t.rProcessed, t.rResult].map((label) => (
            <Text key={label} style={{ fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: '#57534a' }}>
              {label}
            </Text>
          ))}
        </View>

        {/* history (authored constants) */}
        <View style={{ marginTop: 34, width: '100%', gap: 7 }}>
          {[
            { date: 'Mar 02', text: '▼ 1,204', color: '#8a8168' },
            { date: 'Mar 01', text: '▲ 3,991', color: '#ff6a5a' },
            { date: 'Feb 28', text: '▼ 812', color: '#8a8168' },
          ].map((row) => (
            <View key={row.date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(10), color: '#6c6656' }}>{row.date}</Text>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(10), color: row.color }}>{row.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* V.E.R.A. transmission */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={up ? t.rVeraUp : t.rVera} lang={lang} />
      </View>
    </View>
  );
}

export const results: ModuleDef = {
  id: 'results',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'blue' }),
  Screen,
};
```

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npx jest src/modules/results/__tests__/ResultsScreen.test.tsx`
Expected: PASS (all four tests).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx jest src/modules/results && npm test && npx tsc --noEmit`
Expected: all tests pass (including the existing `registry.test.tsx` — the tile is unchanged); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/storage.ts src/modules/results/index.tsx src/modules/results/__tests__/ResultsScreen.test.tsx
git commit -m "feat: results pending module screen (live queue + drift-on-open)"
```

---

## Task 4: Manual verification in Expo Go

**Files:** none (verification only).

- [ ] **Step 1: Launch and drive the app**

Run the app (Expo Go) and confirm on-device:
- Home grid → tap the **RESULTS PENDING** tile → the module opens (dark screen, big queue number).
- The number ticks down every ~1.1s and periodically leaps up; on a leap the number flashes orange, the delta flips red with the `LIVE · QUEUE ADJUSTED` prefix, and V.E.R.A.'s line switches to the "Someone was prioritized" copy.
- Back arrow returns to the facility grid.
- Toggle language to Korean (Settings) and reopen — copy is Korean, layout intact.
- Fully close and reopen the app, revisit Results — the starting number differs from the previous visit and "SINCE YESTERDAY" reflects the change.

- [ ] **Step 2: Update build progress**

In `CLAUDE.md`, under "Build progress", note the `results` module merged (leave the other four Phase 4 modules unchecked). Commit:

```bash
git add CLAUDE.md
git commit -m "docs: mark results module complete (phase 4)"
```

---

## Self-Review

**Spec coverage:**
- Live ticker + drift-on-open → Task 1 (`nextTick`, `queueForDay`) + Task 3 (effect wiring). ✓
- Net-neutral jitter, floored, never zero → Task 1 (`queueForDay`, floor clamps in both functions) + tests. ✓
- Real "since yesterday" delta via `lastSeenQueue` → Task 3 (storage key + effect + delta test). ✓
- Authored constants (wait, progress, history) → Task 3 markup. ✓
- Strings verbatim en/ko → Task 2. ✓
- Styling per prototype (orange flash, red/green delta, scanline omitted as decorative) → Task 3. ✓ *(Note: the decorative scanline sweep is intentionally omitted — it is not behavior and adds animation cost; not in scope.)*
- Timer cleanup on unmount → Task 3 (cleanup + test). ✓
- No Skia / Expo Go → confirmed; no new deps. ✓
- Tile unchanged, registry test still green → Task 3 Step 6. ✓

**Placeholder scan:** none — every code step contains full content.

**Type consistency:** `TickState`/`QueueEvent`/`queueForDay`/`nextTick`/`formatQueue`/`FIRST_DELTA` are defined in Task 1 and consumed with matching signatures in Task 3; `lastSeenQueue` key added in Task 3 Step 1 before use. ✓

**One deviation from the spec, called out:** the spec's testing section mentioned asserting orange/red *styling*; this plan asserts the observable **V.E.R.A. line switch** on the up-jump instead (text assertions are far more robust than inline-style assertions in RTL). The behavior under test is identical.
