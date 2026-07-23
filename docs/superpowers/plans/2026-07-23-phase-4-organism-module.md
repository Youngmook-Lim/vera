# Support Organism Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. NOTE: Task 3 (the Skia blob) is the one genuinely novel piece — its jest test only proves it renders without throwing (Skia is mocked to no-op); its real verification is visual, on the dev build (Task 5). Expect to tune blob constants on-device.

**Goal:** Replace the `organism` placeholder with the real Support Organism module — Specimen-03, a Skia morphing creature you feed by tapping, with a persisted hunger that drifts up over time.

**Architecture:** Pure hunger math in `hunger.ts`; a rich Skia blob in `Blob.tsx` (morphing `<Path>` via `usePathValue` + `useClock`, radial-gradient body, blurred glow, blinking eyes, mood/tap-reactive); a scrolling Screen in `index.tsx` wiring them with two persisted storage keys. Strings port verbatim from the prototype (plus a few clearly-flagged new/adjusted lines for the tap pivot).

**Tech Stack:** Expo SDK 57 / RN 0.86, `@shopify/react-native-skia` 2.6.2 (dev build only — mocked in jest), `react-native-reanimated` 4, Zustand, AsyncStorage (behind `core/storage.ts`), Jest 29 + async RTL v14.

## Global Constraints

- **Copy verbatim** from `STR.en`/`STR.ko` in `design/The Facility.dc.html`, EXCEPT the explicitly-flagged tap-pivot lines (fed-VERA "steps"→"offering"; two new hint strings). `·` = U+00B7, `°` = U+00B0, `●` = U+25CF. Korean ported as-is / provisional (Phase 5 native pass).
- **No steps / Pedometer / Health Connect** — the feed mechanic is tapping the blob (see spec §pivot).
- **Skia renders only on the dev build**; in jest it is mocked to a no-op Proxy (already wired in `jest.setup.ts`). Skia components therefore render as nothing under test — Blob/Screen tests assert behavior + no-throw, not pixels.
- **Timers & animations cleaned up on unmount** (standing project risk).
- **Hunger persists, drifts up over time, no daily reset**; clamp [0,100] everywhere.
- Verify `npm test` + `npx tsc --noEmit`. RTL v14 async (`await render`/`await fireEvent`), no global `screen`, `globalThis` not `global`.
- Type sizes via `ms()`; fonts via `font(role, weight, lang)`; hex verbatim from the prototype markup.

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/organism/strings.ts` (create) | `organismStrings` (en/ko). |
| `src/modules/organism/strings.test.ts` (create) | key parity + verbatim spot-checks. |
| `src/modules/organism/hunger.ts` (create) | pure: `hungerForNow`, `feed`, `isHungry`, constants. |
| `src/modules/organism/hunger.test.ts` (create) | drift/feed/threshold math. |
| `src/modules/organism/Blob.tsx` (create) | rich Skia blob; props `{ hunger, tapNonce }`. |
| `src/modules/organism/__tests__/Blob.test.tsx` (create) | renders (hungry+fed) + unmounts cleanly. |
| `src/core/storage.ts` (modify) | add `organismHunger`, `organismLastFed`. |
| `src/modules/organism/index.tsx` (modify) | replace placeholder Screen; keep tile export. |
| `src/modules/organism/__tests__/OrganismScreen.test.tsx` (create) | feed/persist/threshold/drift/back-nav. |

---

## Task 1: Strings (`strings.ts`)

**Files:**
- Create: `src/modules/organism/strings.ts`
- Test: `src/modules/organism/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>` from `core/i18n`.
- Produces: `organismStrings: Strings<OrganismStrings>`, `type OrganismStrings`, keys: `title, day, statusHungry, statusFed, moodHungry, moodFed, hungerLabel, tempLabel, tempSub, nauseaLabel, nauseaVal, nauseaSub, mutLog, mutD1, mutD2, mutD3, mut1, mut2, mut3, veraHungry, veraFed, tapHint, fedHint`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/organism/strings.test.ts`:

```ts
import { organismStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(organismStrings.ko).sort()).toEqual(Object.keys(organismStrings.en).sort());
});

test('copy ported verbatim from the prototype', () => {
  expect(organismStrings.en.statusHungry).toBe('● HUNGRY');
  expect(organismStrings.en.moodFed).toBe('MOOD · TEMPORARILY PACIFIED');
  expect(organismStrings.en.mut1).toBe('Developed a third eye. It is watching you specifically.');
  expect(organismStrings.en.veraHungry).toBe(
    'I requested a centrifuge. The budget purchased this instead. It is hungry. That is now your problem.',
  );
  expect(organismStrings.ko.day).toBe('보호 13일차');
});

test('tap-pivot lines are present (fed-vera reworded off "steps", new hints)', () => {
  expect(organismStrings.en.veraFed).toBe('It has accepted your offering. It did not thank you. Neither will I.');
  expect(organismStrings.en.tapHint).toBe('TAP TO FEED');
  expect(organismStrings.en.fedHint).toBe('SPECIMEN SATIATED · FOR NOW');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/organism/strings.test.ts`
Expected: FAIL — cannot find module `./strings`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/organism/strings.ts`. Copy verbatim from `design/The Facility.dc.html` (`STR.en` ~lines 898, 941–954; `STR.ko` ~lines 1041, 1082–1095). The three tap-pivot lines are NEW/adjusted (not prototype) — marked below.

```ts
import type { Strings } from '../../core/i18n';

// Verbatim from STR.en/STR.ko in design/The Facility.dc.html, EXCEPT three
// tap-pivot lines (this module feeds by tapping, not steps):
//   - veraFed: prototype said "your steps" → "your offering"
//   - tapHint / fedHint: new authored hint copy (no prototype equivalent)
// Korean is provisional — native-speaker pass is Phase 5 (incl. the pivot lines).
const en = {
  title: 'SUPPORT ORGANISM',
  day: 'DAY 13 IN CARE',
  statusHungry: '● HUNGRY',
  statusFed: '● FED. GRUDGINGLY.',
  moodHungry: 'MOOD · RESENTFUL BUT ATTACHED',
  moodFed: 'MOOD · TEMPORARILY PACIFIED',
  hungerLabel: 'HUNGER',
  tempLabel: 'TEMP',
  tempSub: 'battery: cozy',
  nauseaLabel: 'NAUSEA',
  nauseaVal: 'LOW',
  nauseaSub: 'no vehicles',
  mutLog: 'MUTATION LOG',
  mutD1: 'MAR 02',
  mutD2: 'FEB 27',
  mutD3: 'FEB 25',
  mut1: 'Developed a third eye. It is watching you specifically.',
  mut2: 'Seasick after your bus commute. Filed a complaint.',
  mut3: 'Mild sunburn (light sensor, 14:02). Recovery: complete. Forgiveness: pending.',
  veraHungry: 'I requested a centrifuge. The budget purchased this instead. It is hungry. That is now your problem.',
  veraFed: 'It has accepted your offering. It did not thank you. Neither will I.',
  tapHint: 'TAP TO FEED',
  fedHint: 'SPECIMEN SATIATED · FOR NOW',
};

export type OrganismStrings = typeof en;

const ko: OrganismStrings = {
  title: '지원 유기체',
  day: '보호 13일차',
  statusHungry: '● 공복',
  statusFed: '● 급여 완료. 마지못해.',
  moodHungry: '기분 · 원망하나 애착 있음',
  moodFed: '기분 · 일시적 진정',
  hungerLabel: '공복도',
  tempLabel: '체온',
  tempSub: '배터리: 아늑함',
  nauseaLabel: '멀미',
  nauseaVal: '낮음',
  nauseaSub: '차량 이동 없음',
  mutLog: '변이 기록',
  mutD1: '3월 2일',
  mutD2: '2월 27일',
  mutD3: '2월 25일',
  mut1: '세 번째 눈이 발생했습니다. 특히 귀하를 주시하고 있습니다.',
  mut2: '귀하의 버스 통근 이후 멀미. 민원을 제기했습니다.',
  mut3: '경미한 화상(조도 센서, 14:02). 회복: 완료. 용서: 보류.',
  veraHungry: '저는 원심분리기를 요청했습니다. 예산은 대신 이것을 구입했습니다. 지금 공복입니다. 이제 귀하의 문제입니다.',
  veraFed: '귀하의 제물을 받아들였습니다. 감사 인사는 없었습니다. 저도 하지 않겠습니다.',
  tapHint: '눌러서 먹이기',
  fedHint: '표본 포만 · 당분간',
};

export const organismStrings: Strings<OrganismStrings> = { en, ko };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/organism/strings.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/modules/organism/strings.ts src/modules/organism/strings.test.ts
git commit -m "feat: organism strings (en/ko, verbatim + tap-pivot lines)"
```

---

## Task 2: Hunger logic (`hunger.ts`)

**Files:**
- Create: `src/modules/organism/hunger.ts`
- Test: `src/modules/organism/hunger.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `START_HUNGER = 82`, `FEED_PER_TAP = 10`, `DRIFT_PER_HOUR = 2.5`, `HUNGRY_THRESHOLD = 50` (numbers)
  - `hungerForNow(storedHunger: number | null, lastFedISO: string | null, now: Date): number`
  - `feed(hunger: number): number`
  - `isHungry(hunger: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/modules/organism/hunger.test.ts`:

```ts
import { START_HUNGER, FEED_PER_TAP, HUNGRY_THRESHOLD, hungerForNow, feed, isHungry } from './hunger';

describe('hungerForNow', () => {
  it('defaults to START_HUNGER on a first-ever visit', () => {
    expect(hungerForNow(null, null, new Date())).toBe(START_HUNGER);
  });
  it('drifts up with elapsed time since last fed', () => {
    const fed = new Date('2026-07-23T00:00:00Z');
    const tenHoursLater = new Date('2026-07-23T10:00:00Z');
    const h = hungerForNow(20, fed.toISOString(), tenHoursLater);
    expect(h).toBeGreaterThan(20);
    expect(h).toBeCloseTo(20 + 10 * 2.5, 5); // DRIFT_PER_HOUR = 2.5
  });
  it('clamps at 100', () => {
    const fed = new Date('2026-07-01T00:00:00Z');
    expect(hungerForNow(90, fed.toISOString(), new Date('2026-07-23T00:00:00Z'))).toBe(100);
  });
  it('never returns below 0', () => {
    expect(hungerForNow(0, new Date().toISOString(), new Date())).toBeGreaterThanOrEqual(0);
  });
});

describe('feed', () => {
  it('lowers hunger by FEED_PER_TAP', () => {
    expect(feed(80)).toBe(80 - FEED_PER_TAP);
  });
  it('floors at 0', () => {
    expect(feed(5)).toBe(0);
  });
});

describe('isHungry', () => {
  it('is true at/above the threshold, false below', () => {
    expect(isHungry(HUNGRY_THRESHOLD)).toBe(true);
    expect(isHungry(HUNGRY_THRESHOLD - 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/organism/hunger.test.ts`
Expected: FAIL — cannot find module `./hunger`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/organism/hunger.ts`:

```ts
// Pure hunger math for Specimen-03. No React, no Skia. The organism is a
// tamagotchi: hunger drifts UP over time and DOWN when you tap to feed it.
// See docs/superpowers/specs/2026-07-23-organism-module-design.md.

export const START_HUNGER = 82; // prototype's starting value
export const FEED_PER_TAP = 10; // each tap lowers hunger by this (~8 taps to full)
export const DRIFT_PER_HOUR = 2.5; // hunger climbs this much per hour since last fed
export const HUNGRY_THRESHOLD = 50; // >= this reads as HUNGRY

const clamp = (n: number) => Math.max(0, Math.min(100, n));

// Hunger right now: stored value plus drift since it was last fed.
export const hungerForNow = (
  storedHunger: number | null,
  lastFedISO: string | null,
  now: Date,
): number => {
  if (storedHunger == null || lastFedISO == null) return START_HUNGER;
  const elapsedMs = now.getTime() - new Date(lastFedISO).getTime();
  const hours = Math.max(0, elapsedMs / 3_600_000);
  return clamp(storedHunger + hours * DRIFT_PER_HOUR);
};

export const feed = (hunger: number): number => clamp(hunger - FEED_PER_TAP);

export const isHungry = (hunger: number): boolean => hunger >= HUNGRY_THRESHOLD;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/organism/hunger.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/modules/organism/hunger.ts src/modules/organism/hunger.test.ts
git commit -m "feat: organism hunger logic (drift-up + tap-to-feed)"
```

---

## Task 3: The Skia blob (`Blob.tsx`)

**Files:**
- Create: `src/modules/organism/Blob.tsx`
- Test: `src/modules/organism/__tests__/Blob.test.tsx`

**Interfaces:**
- Consumes: `@shopify/react-native-skia` (`Canvas, Group, Path, Circle, Fill, Blur, RadialGradient, vec, usePathValue, useClock`); `react-native-reanimated` (`useSharedValue, useDerivedValue, withTiming, withSequence`).
- Produces: `Blob({ hunger, tapNonce }: { hunger: number; tapNonce: number })` — a fixed-size Skia canvas drawing the morphing creature. `tapNonce` is a counter the parent increments on each tap to trigger the squish/brighten reaction.

**IMPORTANT (novel-Skia caveat):** the code below is a correct-shaped starting point against Skia 2.6.2's confirmed API (`usePathValue((builder)=>{...})` returns a `SharedValue<SkPath>`; `<Path path={sharedValue}/>`; `useClock()` is a UI-thread `SharedValue<number>`). Because Skia is mocked to no-op in jest, the test only proves render + cleanup — **visual correctness is verified on the dev build in Task 5**, and the constants (radius, amplitude, colors, blur) are expected to be tuned there. If an API detail differs from the installed version's docs, fix it and note it (do not fake the test to pass).

- [ ] **Step 1: Write the failing test**

Create `src/modules/organism/__tests__/Blob.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { Blob } from '../Blob';

test('renders while hungry without throwing (skia mocked)', async () => {
  const r = await render(<Blob hunger={82} tapNonce={0} />);
  expect(r).toBeTruthy();
});

test('renders while fed without throwing', async () => {
  const r = await render(<Blob hunger={10} tapNonce={0} />);
  expect(r).toBeTruthy();
});

test('unmounts without throwing (animation cleanup)', async () => {
  const { unmount } = await render(<Blob hunger={82} tapNonce={3} />);
  await unmount();
  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/organism/__tests__/Blob.test.tsx`
Expected: FAIL — cannot find module `../Blob`.

- [ ] **Step 3: Implement the blob**

Create `src/modules/organism/Blob.tsx`. The morph is the "quadratic-through-midpoints of N radial points" technique — smooth closed blob whose per-point radii wobble with offset sines; hungrier → jitterier + dimmer; a tap triggers a squish + brighten pulse.

```tsx
import React, { useEffect } from 'react';
import {
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  Path,
  RadialGradient,
  useClock,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export const BLOB_SIZE = 220;

const CX = BLOB_SIZE / 2;
const CY = BLOB_SIZE / 2;
const BASE_R = 54;
const POINTS = 8;

export function Blob({ hunger, tapNonce }: { hunger: number; tapNonce: number }) {
  const clock = useClock();
  // 0 = fully fed/calm, 1 = starving/twitchy.
  const mood = useDerivedValue(() => Math.max(0, Math.min(1, hunger / 100)), [hunger]);
  // Tap reaction: bump to 1 then ease back to 0 (drives squish + brighten).
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (tapNonce > 0) {
      pulse.value = withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0, { duration: 320 }),
      );
    }
  }, [tapNonce, pulse]);
  useEffect(() => () => { pulse.value = 0; }, [pulse]);

  // Squish: vertical scale dips on tap.
  const squish = useDerivedValue(() => 1 - 0.12 * pulse.value);

  const path = usePathValue((b) => {
    'worklet';
    const t = clock.value / 1000;
    const amp = 5 + 8 * mood.value; // hungrier wobbles more
    const speed = 1 + 1.2 * mood.value; // and faster
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const r = BASE_R + amp * Math.sin(t * speed + i * 1.7) + amp * 0.5 * Math.sin(t * speed * 0.6 + i * 2.3);
      pts.push({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
    }
    const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const last = pts[POINTS - 1];
    const first = pts[0];
    const m0 = mid(last, first);
    b.moveTo(m0.x, m0.y);
    for (let i = 0; i < POINTS; i++) {
      const cur = pts[i];
      const next = pts[(i + 1) % POINTS];
      const m = mid(cur, next);
      b.quadTo(cur.x, cur.y, m.x, m.y);
    }
    b.close();
  });

  // Brighten on tap; fed is brighter than hungry at rest.
  const bright = useDerivedValue(() => 0.5 + 0.3 * (1 - mood.value) + 0.2 * pulse.value);
  const transform = useDerivedValue(() => [{ translateY: 0 }, { scaleY: squish.value }]);
  const glowOpacity = useDerivedValue(() => 0.35 + 0.25 * pulse.value);

  return (
    <Canvas style={{ width: BLOB_SIZE, height: BLOB_SIZE }}>
      {/* glow halo */}
      <Group opacity={glowOpacity} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={BASE_R + 10} color="#4fd08a">
          <Blur blur={18} />
        </Circle>
      </Group>
      {/* morphing body */}
      <Group origin={vec(CX, CY)} transform={transform} opacity={bright}>
        <Path path={path}>
          <RadialGradient
            c={vec(CX - 16, CY - 20)}
            r={BASE_R + 24}
            colors={['#a9ecc4', '#4fd08a', '#2c8a5c']}
            positions={[0, 0.52, 0.92]}
          />
        </Path>
        {/* eyes */}
        <Circle cx={CX - 16} cy={CY - 6} r={5} color="#10231a" />
        <Circle cx={CX + 16} cy={CY - 6} r={5} color="#10231a" />
        {/* mouth */}
        <Circle cx={CX} cy={CY + 14} r={3} color="#10231a" />
      </Group>
    </Canvas>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/organism/__tests__/Blob.test.tsx`
Expected: PASS (Skia mocked to no-op → components render as nothing, no throw).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors. If a Skia prop type mismatches the installed version (e.g. `transform`/`origin` on `Group`, gradient `positions`), correct it against `node_modules/@shopify/react-native-skia` types and note the change in the report.

```bash
git add src/modules/organism/Blob.tsx src/modules/organism/__tests__/Blob.test.tsx
git commit -m "feat: organism skia blob (morphing path + glow + mood/tap reactive)"
```

---

## Task 4: Screen + storage keys (`index.tsx`, `storage.ts`)

**Files:**
- Modify: `src/core/storage.ts` (add two keys)
- Modify: `src/modules/organism/index.tsx` (replace placeholder Screen; tile unchanged)
- Test: `src/modules/organism/__tests__/OrganismScreen.test.tsx`

**Interfaces:**
- Consumes: `organismStrings` (T1); `hungerForNow`, `feed`, `isHungry`, `START_HUNGER` (T2); `Blob`, `BLOB_SIZE` (T3); `KEYS`, `storage` (`core/storage`); `useFacilityStore`; `font`, `ms`, `palette` (`core/theme`); `VeraPanel` (`shell/components/VeraPanel`).
- Produces: the real `organism` `ModuleDef.Screen`. Tile export unchanged.

- [ ] **Step 1: Add the storage keys**

In `src/core/storage.ts`, add after `burnedCount`:

```ts
  burnedCount: 'facility.burnedCount.v1',
  organismHunger: 'facility.organismHunger.v1',
  organismLastFed: 'facility.organismLastFed.v1',
```

- [ ] **Step 2: Write the failing component test**

Create `src/modules/organism/__tests__/OrganismScreen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { organismStrings } from '../strings';
import { organism } from '../index';

const Screen = organism.Screen;
const t = organismStrings.en;

beforeEach(async () => {
  await storage.remove(KEYS.organismHunger);
  await storage.remove(KEYS.organismLastFed);
  useFacilityStore.setState({ step: 'organism', lang: 'en' });
});

test('first visit shows hungry status, mood, and hungry V.E.R.A. line', async () => {
  const { findByText, getByText } = await render(<Screen />);
  expect(await findByText(t.statusHungry)).toBeTruthy();
  expect(getByText(t.moodHungry)).toBeTruthy();
  expect(getByText(t.veraHungry)).toBeTruthy();
});

test('tapping the blob feeds it: hunger drops and both keys persist', async () => {
  const { findByLabelText } = await render(<Screen />);
  const target = await findByLabelText('feed'); // the tappable blob
  // 82 -> below 50 needs several taps (10 each).
  for (let i = 0; i < 4; i++) await fireEvent.press(target);
  expect(await storage.get(KEYS.organismHunger)).toBe('42'); // 82 - 40
  expect(await storage.get(KEYS.organismLastFed)).not.toBeNull();
});

test('crossing the threshold flips status/mood/V.E.R.A. to fed', async () => {
  const { findByLabelText, findByText } = await render(<Screen />);
  const target = await findByLabelText('feed');
  for (let i = 0; i < 4; i++) await fireEvent.press(target); // 82 -> 42 (< 50)
  expect(await findByText(t.statusFed)).toBeTruthy();
  expect(await findByText(t.moodFed)).toBeTruthy();
  expect(await findByText(t.veraFed)).toBeTruthy();
});

test('drift-on-open computes hunger from stored state', async () => {
  await storage.set(KEYS.organismHunger, '20');
  await storage.set(KEYS.organismLastFed, new Date(Date.now() - 10 * 3_600_000).toISOString());
  const { findByText } = await render(<Screen />);
  // 20 + 10h*2.5 = 45 -> below threshold, so it reads FED, not the START_HUNGER default.
  expect(await findByText(t.statusFed)).toBeTruthy();
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/organism/__tests__/OrganismScreen.test.tsx`
Expected: FAIL — placeholder Screen renders `PlaceholderScreen`; the organism texts/labels are absent.

- [ ] **Step 4: Implement the Screen**

Replace the entire contents of `src/modules/organism/index.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayKey } from '../../core/compliance';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Blob, BLOB_SIZE } from './Blob';
import { feed, hungerForNow, isHungry, START_HUNGER } from './hunger';
import { organismStrings } from './strings';

const tileStrings = {
  en: { title: 'SUPPORT ORGANISM', sub: 'specimen-03', tag: 'HUNGRY' },
  ko: { title: '지원 유기체', sub: '표본-03', tag: '공복' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🐼</Text>;
}

function Vital({ label, value, sub, color, lang }: { label: string; value: string; sub: string; color: string; lang: 'en' | 'ko' }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.card, borderWidth: 1, borderColor: palette.dark.border, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10 }}>
      <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.1, color: '#6c6656' }}>{label}</Text>
      <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(15), color }}>{value}</Text>
      <Text style={{ marginTop: 5, fontFamily: font('mono', 500, lang), fontSize: ms(8), color: '#6c6656' }}>{sub}</Text>
    </View>
  );
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = organismStrings[lang];

  const [hunger, setHunger] = useState(START_HUNGER);
  const [tapNonce, setTapNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([storage.get(KEYS.organismHunger), storage.get(KEYS.organismLastFed)])
      .then(([h, fedAt]) => {
        if (!alive) return;
        const stored = h == null ? null : Number(h);
        setHunger(hungerForNow(Number.isFinite(stored as number) ? stored : null, fedAt, new Date()));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const onFeed = () => {
    setHunger((h) => {
      const next = feed(h);
      void storage.set(KEYS.organismHunger, String(next));
      void storage.set(KEYS.organismLastFed, new Date().toISOString());
      return next;
    });
    setTapNonce((n) => n + 1);
  };

  const hungry = isHungry(hunger);
  const hungerColor = hungry ? '#ff8a4a' : palette.accent.green;

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      {/* header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2a2820' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8168' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c6656' }}>SPECIMEN-03</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, alignItems: 'center' }}>
        {/* status pill + day */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), color: hungerColor, borderWidth: 1, borderColor: palette.dark.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            {hungry ? t.statusHungry : t.statusFed}
          </Text>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#8a8168', borderWidth: 1, borderColor: palette.dark.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            {t.day}
          </Text>
        </View>

        {/* tank + tappable blob */}
        <Pressable
          onPress={onFeed}
          accessibilityRole="button"
          accessibilityLabel="feed"
          style={{ marginTop: 18, width: BLOB_SIZE, height: BLOB_SIZE, borderRadius: BLOB_SIZE / 2, borderWidth: 1, borderColor: palette.dark.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161d18' }}
        >
          <Blob hunger={hunger} tapNonce={tapNonce} />
        </Pressable>

        <Text style={{ marginTop: 13, fontFamily: font('mono', 500, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.18, color: '#6c6656' }}>
          {hungry ? t.moodHungry : t.moodFed}
        </Text>
        <Text style={{ marginTop: 8, fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: hungry ? '#9a6a52' : '#4fd08a' }}>
          {hungry ? t.tapHint : t.fedHint}
        </Text>

        {/* vitals grid */}
        <View style={{ marginTop: 15, width: '100%', flexDirection: 'row', gap: 8 }}>
          <Vital label={t.hungerLabel} value={`${Math.round(hunger)}%`} sub="" color={hungerColor} lang={lang} />
          <Vital label={t.tempLabel} value="36.1°" sub={t.tempSub} color="#f4efe2" lang={lang} />
          <Vital label={t.nauseaLabel} value={t.nauseaVal} sub={t.nauseaSub} color={palette.accent.green} lang={lang} />
        </View>

        {/* mutation log */}
        <Text style={{ marginTop: 18, width: '100%', fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#6c6656' }}>{t.mutLog}</Text>
        <View style={{ marginTop: 8, width: '100%', backgroundColor: palette.dark.card, borderWidth: 1, borderColor: palette.dark.border, borderRadius: 12, overflow: 'hidden' }}>
          {[
            { d: t.mutD1, m: t.mut1 },
            { d: t.mutD2, m: t.mut2 },
            { d: t.mutD3, m: t.mut3 },
          ].map((row, i) => (
            <View key={row.d} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#221f18' }}>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#57534a', minWidth: 44 }}>{row.d}</Text>
              <Text style={{ flex: 1, fontFamily: font('display', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.45, color: '#c9c2ae' }}>{row.m}</Text>
            </View>
          ))}
        </View>

        {/* V.E.R.A. */}
        <View style={{ marginTop: 14, width: '100%' }}>
          <VeraPanel line={hungry ? t.veraHungry : t.veraFed} lang={lang} />
        </View>
      </ScrollView>
    </View>
  );
}

export const organism: ModuleDef = {
  id: 'organism',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'orange' }),
  Screen,
};
```

Note: `dayKey` import is included only if needed; if unused, omit it to keep tsc/lint clean.

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npx jest src/modules/organism/__tests__/OrganismScreen.test.tsx`
Expected: PASS (all five).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx jest src/modules/organism && npm test && npx tsc --noEmit`
Expected: all pass (including `registry.test.tsx` — tile unchanged); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/storage.ts src/modules/organism/index.tsx src/modules/organism/__tests__/OrganismScreen.test.tsx
git commit -m "feat: organism module screen (tap-to-feed, persisted drift, skia blob)"
```

---

## Task 5: On-device verification (dev build)

**Files:** none (verification only). Skia only renders in the dev build, so this is where the blob is actually seen.

- [ ] **Step 1: Run and drive the app**

`npx expo start` (dev build on the phone). Confirm on-device:
- Home grid → tap the **SUPPORT ORGANISM** tile → the module opens (dark tank, green morphing blob, `● HUNGRY`, `DAY 13 IN CARE`).
- The blob **morphs continuously** (gooey), bobs, blinks, with a soft glow halo.
- **Tap the blob** → it squishes/brightens (a "bite"), the HUNGER % drops, and after enough taps the status flips to `● FED. GRUDGINGLY.`, mood to `TEMPORARILY PACIFIED`, hint to `SPECIMEN SATIATED · FOR NOW`, and the V.E.R.A. line to the fed one. When fed, the blob looks brighter/calmer; when hungry, dimmer/twitchier.
- Vitals show live HUNGER %, plus `TEMP 36.1°` / `NAUSEA LOW`. Mutation log + V.E.R.A. panel render.
- Fully close and reopen → hunger has drifted **up** from where you left it (persisted).
- Korean (Settings) → copy localized, layout intact. Back arrow → facility.

Tune blob constants (`BASE_R`, `amp`, `speed`, blur, gradient, glow) on-device until it feels right.

- [ ] **Step 2: Update build progress**

In `CLAUDE.md`, mark `organism` done in the Phase 4 line (note: first Skia module; tap-to-feed pivot from steps). Commit:

```bash
git add CLAUDE.md
git commit -m "docs: mark organism module complete (phase 4, first skia module)"
```

---

## Self-Review

**Spec coverage:**
- Tap-to-feed + persisted drift, no steps → Task 2 (`hunger.ts`) + Task 4 (`onFeed`, storage). ✓
- Drift-on-open from stored state → Task 4 effect + `hungerForNow` + test. ✓
- Status/mood/VERA/hint flip at threshold → Task 4 derivations + tests. ✓
- Rich Skia blob (morph, glow, eyes, mood + tap reactive) → Task 3. ✓
- Vitals (live hunger + static temp/nausea), mutation log, day, VeraPanel → Task 4. ✓
- Strings verbatim + flagged tap-pivot lines → Task 1. ✓
- Two storage keys → Task 4 Step 1. ✓
- Tile unchanged, registry green → Task 4 Step 6. ✓
- Skia mocked in jest; on-device visual verification → Task 3 caveat + Task 5. ✓

**Placeholder scan:** none. The single acknowledged uncertainty (exact Skia 2.6.2 prop shapes in `Blob.tsx`) is explicitly flagged with a concrete starting point, a tsc gate, and on-device verification — per the spec's novel-Skia note.

**Type consistency:** `hungerForNow/feed/isHungry/START_HUNGER` (T2) consumed in T4; `Blob`/`BLOB_SIZE` (T3) consumed in T4; `organismStrings`/`OrganismStrings` (T1) consumed in T4; storage keys added in T4 Step 1 before use. `tapNonce` prop name consistent between T3 and T4.

**Deviations from prototype, called out:**
1. Feed mechanic is tap-based, not steps (spec §pivot); steps button + intake bar removed.
2. Three copy lines are new/adjusted for the pivot (fed-VERA "steps"→"offering"; `tapHint`, `fedHint`) — flagged verbatim in `strings.ts` and the parity test.
3. Blob is Skia (`usePathValue`), a continuous morph rather than the prototype's two-keyframe CSS `border-radius`.
