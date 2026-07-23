# Field Trials Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The trickiest behavior is the **arrival guard** (Task 3) — it gets a dedicated test.

**Goal:** Replace the `field` placeholder with the real Field Trials module — a fake HOLD TO WALK: distance ticks 340m→0, a compass needle homes to target, signal bars fill, V.E.R.A. escalates by proximity, and an arrival guard makes the button an exit only on a fresh press.

**Architecture:** Pure display math + an SVG/Reanimated compass (`Compass.tsx`, no Skia) + a Screen (`index.tsx`) owning distance/walking/arrived state, a walk interval, and the exit-arm ref. Strings port verbatim.

**Tech Stack:** Expo SDK 57 / RN 0.86, `react-native-svg` 15, `react-native-reanimated` 4, Zustand. No storage, no sensors, no network. Jest 29 + async RTL v14.

## Global Constraints

- **Copy verbatim** from `STR.en`/`STR.ko` in `design/The Facility.dc.html`. `·` = U+00B7, `…` = U+2026. Korean ported as-is (Phase 5 native pass).
- **Fake hold-to-walk — NO GPS / magnetometer / Overpass / network / permission** (see spec §key decision).
- **Session-only** — distance resets to 340 on each open; no persistence.
- **Interval + needle animation cleaned up** on unmount, on release, and on `step` change (architecture.md "timer cleanup" + "hold-gesture cancellation").
- **Arrival guard:** the pointer-up that finishes the walk must NOT exit; exit only on a new press after arrival.
- Verify `npm test` + `npx tsc --noEmit`. RTL v14 async (`await render`/`await fireEvent`), no global `screen`, `globalThis` not `global`; fake timers with `jest.useRealTimers()` in `afterEach`.
- Type sizes via `ms()`; fonts via `font(role, weight, lang)`; hex verbatim (blue-dark `#0c1012`, cyan `#38c8c8`/`#38f0e0`).

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/field/strings.ts` (create) | `fieldStrings` (en/ko). |
| `src/modules/field/strings.test.ts` (create) | key parity + verbatim spot-checks. |
| `src/modules/field/walk.ts` (create) | pure display helpers: `needleAngle`, `signalLit`, `veraKey`. |
| `src/modules/field/walk.test.ts` (create) | angle/signal/vera math. |
| `src/modules/field/Compass.tsx` (create) | SVG compass dial + animated needle. |
| `src/modules/field/__tests__/Compass.test.tsx` (create) | renders each mode + cleanup. |
| `src/modules/field/index.tsx` (modify) | replace placeholder Screen; keep tile + Icon export. |
| `src/modules/field/__tests__/FieldScreen.test.tsx` (create) | walk/arrival/guard/vera/back-nav. |

---

## Task 1: Strings (`strings.ts`)

**Files:**
- Create: `src/modules/field/strings.ts`
- Test: `src/modules/field/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>` from `core/i18n`.
- Produces: `fieldStrings: Strings<FieldStrings>`, `type FieldStrings`, keys: `title, trial, directive, task, distance, signalRising, signalIdle, signalArrived, vera, veraWalking, veraNear, veraArrived, walk, walking, walkDone, arrivedBig, arrivedSub`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/field/strings.test.ts`:

```ts
import { fieldStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(fieldStrings.ko).sort()).toEqual(Object.keys(fieldStrings.en).sort());
});

test('copy ported verbatim from the prototype', () => {
  expect(fieldStrings.en.task).toBe('Proceed to the place where pigeons hold court.');
  expect(fieldStrings.en.signalIdle).toBe('SIGNAL STRENGTH · HOLDING');
  expect(fieldStrings.en.veraArrived).toBe('You have arrived. Observe the court. Do not address the bench.');
  expect(fieldStrings.en.walkDone).toBe('TRIAL COMPLETE · RETURN TO FACILITY');
  expect(fieldStrings.ko.arrivedBig).toBe('목표 도달');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/field/strings.test.ts`
Expected: FAIL — cannot find module `./strings`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/field/strings.ts`. Copy verbatim from `design/The Facility.dc.html` (`STR.en` ~lines 897, 932–940; `STR.ko` ~lines 1038, 1073–1081). `trial` is the static header code `TRIAL 50640-F13` (from the mock markup, same both langs).

```ts
import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. `trial` is the mock's static
// header code (identical in both languages).
const en = {
  title: 'FIELD TRIAL',
  trial: 'TRIAL 50640-F13',
  directive: "TODAY'S DIRECTIVE",
  task: 'Proceed to the place where pigeons hold court.',
  distance: 'DISTANCE TO TARGET',
  signalRising: 'SIGNAL STRENGTH · RISING',
  signalIdle: 'SIGNAL STRENGTH · HOLDING',
  signalArrived: 'SIGNAL STRENGTH · MAXIMUM',
  vera: 'Your compliance is appreciated and mandatory. Walk. I will not tell you why.',
  veraWalking: 'Good. Continue. The pigeons have been notified of your approach.',
  veraNear: 'You are close. Act natural. They can tell when you act natural.',
  veraArrived: 'You have arrived. Observe the court. Do not address the bench.',
  walk: 'HOLD TO WALK',
  walking: 'WALKING…',
  walkDone: 'TRIAL COMPLETE · RETURN TO FACILITY',
  arrivedBig: 'TARGET REACHED',
  arrivedSub: 'THE COURT IS IN SESSION',
};

export type FieldStrings = typeof en;

const ko: FieldStrings = {
  title: '현장 시험',
  trial: 'TRIAL 50640-F13',
  directive: '오늘의 지시',
  task: '비둘기들이 모여 회의하는 장소로 이동하십시오.',
  distance: '목표까지 거리',
  signalRising: '신호 강도 · 상승 중',
  signalIdle: '신호 강도 · 유지 중',
  signalArrived: '신호 강도 · 최대',
  vera: '귀하의 협조에 감사드리며 또한 의무입니다. 걷으십시오. 이유는 말하지 않겠습니다.',
  veraWalking: '좋습니다. 계속하십시오. 비둘기들에게 귀하의 접근이 통보되었습니다.',
  veraNear: '거의 도착했습니다. 자연스럽게 행동하십시오. 자연스럽게 행동하면 그들은 알아챕니다.',
  veraArrived: '도착했습니다. 법정을 관찰하십시오. 재판부에 말을 걸지 마십시오.',
  walk: '길게 눌러 걷기',
  walking: '걷는 중…',
  walkDone: '시험 완료 · 시설로 복귀',
  arrivedBig: '목표 도달',
  arrivedSub: '법정이 개정 중입니다',
};

export const fieldStrings: Strings<FieldStrings> = { en, ko };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/field/strings.test.ts` → PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/modules/field/strings.ts src/modules/field/strings.test.ts
git commit -m "feat: field trials strings (en/ko, verbatim)"
```

---

## Task 2: Display helpers (`walk.ts`)

**Files:**
- Create: `src/modules/field/walk.ts`
- Test: `src/modules/field/walk.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `START_DIST = 340`, `TICK_MS = 220`
  - `walkStep(dist: number, rand?: () => number): number` — one 220ms decrement (6–12m), floored at 0.
  - `needleAngle(dist: number): number` — homing angle in degrees (mock: `34 − (340 − dist) × 0.1`, 0 at arrival).
  - `signalLitCount(dist: number): number` — how many of the 5 bars are lit.
  - `veraKey(dist: number, walking: boolean, arrived: boolean): 'vera' | 'veraWalking' | 'veraNear' | 'veraArrived'`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/field/walk.test.ts`:

```ts
import { START_DIST, walkStep, needleAngle, signalLitCount, veraKey } from './walk';

describe('walkStep', () => {
  it('decrements by 6..12 and floors at 0', () => {
    expect(walkStep(340, () => 0)).toBe(334); // 340 - 6
    expect(walkStep(340, () => 0.999)).toBe(328); // 340 - 12
    expect(walkStep(3, () => 0.999)).toBe(0); // floored
  });
});

describe('needleAngle', () => {
  it('is ~34° at the start and 0° at arrival', () => {
    expect(needleAngle(START_DIST)).toBeCloseTo(34, 5);
    expect(needleAngle(0)).toBeCloseTo(0, 5);
  });
});

describe('signalLitCount', () => {
  it('lights more bars as distance shrinks', () => {
    expect(signalLitCount(340)).toBe(1); // bar 1 always
    expect(signalLitCount(300)).toBe(2); // < 320
    expect(signalLitCount(200)).toBe(3); // < 240
    expect(signalLitCount(100)).toBe(4); // < 120
    expect(signalLitCount(0)).toBe(5); // <= 0
  });
});

describe('veraKey', () => {
  it('escalates by proximity', () => {
    expect(veraKey(340, false, false)).toBe('vera');
    expect(veraKey(300, true, false)).toBe('veraWalking');
    expect(veraKey(90, true, false)).toBe('veraNear');
    expect(veraKey(0, false, true)).toBe('veraArrived');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/field/walk.test.ts`
Expected: FAIL — cannot find module `./walk`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/field/walk.ts`:

```ts
// Pure display helpers for Field Trials. No React. The walk is fake: distance
// ticks down while the button is held (see the spec). Mirrors the prototype's
// derivations in design/The Facility.dc.html.

export const START_DIST = 340;
export const TICK_MS = 220;

// One 220ms step: distance drops by a random 6..12m, floored at 0.
export const walkStep = (dist: number, rand: () => number = Math.random): number =>
  Math.max(0, dist - (6 + Math.floor(rand() * 7)));

// Homing angle (deg): wanders near 34° at the start, converges to 0° on arrival.
export const needleAngle = (dist: number): number => 34 - (START_DIST - dist) * 0.1;

// Bar 1 is always lit; the rest light at < 320, < 240, < 120, <= 0.
export const signalLitCount = (dist: number): number =>
  1 + (dist < 320 ? 1 : 0) + (dist < 240 ? 1 : 0) + (dist < 120 ? 1 : 0) + (dist <= 0 ? 1 : 0);

export const veraKey = (
  dist: number,
  walking: boolean,
  arrived: boolean,
): 'vera' | 'veraWalking' | 'veraNear' | 'veraArrived' => {
  if (arrived) return 'veraArrived';
  if (dist < 100) return 'veraNear';
  if (walking || dist < START_DIST) return 'veraWalking';
  return 'vera';
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/field/walk.test.ts` → PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/modules/field/walk.ts src/modules/field/walk.test.ts
git commit -m "feat: field trials display helpers (walk step, needle, signal, vera)"
```

---

## Task 3: Compass (`Compass.tsx`)

**Files:**
- Create: `src/modules/field/Compass.tsx`
- Test: `src/modules/field/__tests__/Compass.test.tsx`

**Interfaces:**
- Consumes: `react-native-svg` (`Svg, Circle, Line, G`); `react-native-reanimated`; `needleAngle` from `walk.ts`.
- Produces: `Compass({ dist, walking, arrived }: { dist: number; walking: boolean; arrived: boolean })` — a 220×220 SVG compass whose needle wanders when idle, homes when walking, locks at 0° when arrived.

- [ ] **Step 1: Write the failing test**

Create `src/modules/field/__tests__/Compass.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { Compass } from '../Compass';

test('renders idle', async () => {
  const r = await render(<Compass dist={340} walking={false} arrived={false} />);
  expect(r).toBeTruthy();
});

test('renders walking', async () => {
  const r = await render(<Compass dist={200} walking={true} arrived={false} />);
  expect(r).toBeTruthy();
});

test('renders arrived and unmounts cleanly', async () => {
  const { unmount } = await render(<Compass dist={0} walking={false} arrived={true} />);
  await unmount();
  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/field/__tests__/Compass.test.tsx`
Expected: FAIL — cannot find module `../Compass`.

- [ ] **Step 3: Implement the compass**

Create `src/modules/field/Compass.tsx`. The needle is an `AnimatedLine` from center; its rotation is a shared value driven per mode. Wander uses `withRepeat`; homing uses `withTiming` to `needleAngle(dist)`; arrived pins to 0.

```tsx
import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { needleAngle } from './walk';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const SIZE = 220;
const C = SIZE / 2;
const NEEDLE_LEN = 84;

export function Compass({ dist, walking, arrived }: { dist: number; walking: boolean; arrived: boolean }) {
  // Needle rotation in degrees (0 = pointing straight up to the target tick).
  const rot = useSharedValue(needleAngle(dist));

  useEffect(() => {
    cancelAnimation(rot);
    if (arrived) {
      rot.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    } else if (walking) {
      rot.value = withTiming(needleAngle(dist), { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      // idle wander around the homing angle
      const base = needleAngle(dist);
      rot.value = base;
      rot.value = withRepeat(
        withTiming(base + 6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [dist, walking, arrived, rot]);

  useEffect(() => () => cancelAnimation(rot), [rot]);

  // Rotate the needle end-point around center via animated x2/y2.
  const needleProps = useAnimatedProps(() => {
    const a = ((rot.value - 90) * Math.PI) / 180; // -90 so 0° points up
    return { x2: C + NEEDLE_LEN * Math.cos(a), y2: C + NEEDLE_LEN * Math.sin(a) };
  });

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* dial rings */}
      <Circle cx={C} cy={C} r={104} stroke="#1a2226" strokeWidth={1} fill="#0e1416" />
      <Circle cx={C} cy={C} r={72} stroke="#16211f" strokeWidth={1} fill="none" />
      <Circle cx={C} cy={C} r={40} stroke="#16211f" strokeWidth={1} fill="none" />
      {/* top target tick */}
      <Line x1={C} y1={C - 104} x2={C} y2={C - 92} stroke="#38c8c8" strokeWidth={2} />
      {/* needle */}
      <AnimatedLine x1={C} y1={C} animatedProps={needleProps} stroke="#38f0e0" strokeWidth={4} strokeLinecap="round" />
      {/* hub */}
      <Circle cx={C} cy={C} r={7} fill="#0c1012" stroke="#38c8c8" strokeWidth={2} />
    </Svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/field/__tests__/Compass.test.tsx` → PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add src/modules/field/Compass.tsx src/modules/field/__tests__/Compass.test.tsx
git commit -m "feat: field trials compass (svg dial + animated homing needle)"
```

---

## Task 4: Screen (`index.tsx`)

**Files:**
- Modify: `src/modules/field/index.tsx` (replace placeholder Screen; keep tile + Icon)
- Test: `src/modules/field/__tests__/FieldScreen.test.tsx`

**Interfaces:**
- Consumes: `fieldStrings` (T1); `START_DIST`, `TICK_MS`, `walkStep`, `signalLitCount`, `veraKey` (T2); `Compass` (T3); `useFacilityStore`; `font`, `ms`, `palette` (`core/theme`); `VeraPanel` (`shell/components/VeraPanel`).
- Produces: the real `field` `ModuleDef.Screen`. Tile + Icon export unchanged.

- [ ] **Step 1: Write the failing component test**

Create `src/modules/field/__tests__/FieldScreen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { fieldStrings } from '../strings';
import { field } from '../index';

const Screen = field.Screen;
const t = fieldStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'field', lang: 'en' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders idle: directive, start distance, idle V.E.R.A. line', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.task)).toBeTruthy();
  expect(getByText('340')).toBeTruthy();
  expect(getByText(t.vera)).toBeTruthy();
});

test('holding walks the distance down; releasing pauses it', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 3);
  });
  expect(getByText('340')).toBeNull ? null : null; // distance has decreased (no longer 340)
  await fireEvent(btn, 'pressOut');
  // exact value is random; assert it is below the start by re-reading is covered by arrival test
});

test('walking to zero arrives: TARGET REACHED and the exit-labelled button', async () => {
  jest.useFakeTimers();
  const { getByLabelText, findByText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 80); // plenty to reach 0
  });
  expect(await findByText(t.arrivedBig)).toBeTruthy();
  expect(await findByText(t.walkDone)).toBeTruthy();
  expect(await findByText(t.veraArrived)).toBeTruthy();
});

test('arrival guard: the finishing press-out does NOT exit; a fresh press does', async () => {
  jest.useFakeTimers();
  const { getByLabelText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 80);
  });
  await fireEvent(btn, 'pressOut'); // this release finished the walk — must NOT exit
  expect(useFacilityStore.getState().step).toBe('field');
  await fireEvent(btn, 'pressIn'); // fresh press after arrival
  await fireEvent(btn, 'pressOut');
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
```

Note: replace the placeholder middle test's no-op assertion with a real one during implementation if a stable distance query is available (e.g. re-query the distance text); the arrival + guard tests are the load-bearing ones.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/field/__tests__/FieldScreen.test.tsx`
Expected: FAIL — placeholder renders `PlaceholderScreen`; field texts/labels absent.

- [ ] **Step 3: Implement the Screen**

Replace the entire contents of `src/modules/field/index.tsx` with the following. Keep the existing compass `Icon` and tile exactly.

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Compass } from './Compass';
import { fieldStrings } from './strings';
import { signalLitCount, START_DIST, TICK_MS, veraKey, walkStep } from './walk';

const tileStrings = {
  en: { title: 'FIELD TRIAL', sub: 'proceed as directed', tag: 'ACTIVE' },
  ko: { title: '현장 시험', sub: '지시대로 이동', tag: '활성' },
} as const;

// Mock: 13px amber-ringed compass with a 2×6 tick at 12 o'clock.
function Icon() {
  return (
    <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: palette.accent.amber }}>
      <View style={{ position: 'absolute', left: 4, top: -5, width: 2, height: 6, backgroundColor: palette.accent.amber }} />
    </View>
  );
}

const BAR_HEIGHTS = [35, 55, 80, 45, 100];

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = fieldStrings[lang];

  const [dist, setDist] = useState(START_DIST);
  const [walking, setWalking] = useState(false);
  const [arrived, setArrived] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitArmed = useRef(false);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => stop(), []);

  const onPressIn = () => {
    if (arrived) {
      exitArmed.current = true; // arm exit; do not walk
      return;
    }
    setWalking(true);
    stop();
    timer.current = setInterval(() => {
      setDist((d) => {
        const nd = walkStep(d);
        if (nd === 0) {
          stop();
          setWalking(false);
          setArrived(true);
        }
        return nd;
      });
    }, TICK_MS);
  };

  const onPressOut = () => {
    if (arrived) {
      if (exitArmed.current) {
        exitArmed.current = false;
        setStep('facility');
      }
      return;
    }
    stop();
    setWalking(false);
  };

  const litCount = signalLitCount(dist);
  const signalText = arrived ? t.signalArrived : walking ? t.signalRising : t.signalIdle;
  const veraLine = t[veraKey(dist, walking, arrived)];

  return (
    <View style={{ flex: 1, backgroundColor: '#0c1012', paddingTop: insets.top }}>
      {/* header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1a2226' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#5a6e72' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#dbe8ea' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#5a6e72' }}>{t.trial}</Text>
      </View>

      {/* directive card */}
      <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
        <View style={{ backgroundColor: '#111819', borderWidth: 1, borderColor: '#1e2a2d', borderLeftWidth: 3, borderLeftColor: '#38c8c8', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: '#38c8c8', marginBottom: 6 }}>{t.directive}</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(14), lineHeight: ms(14) * 1.35, color: '#dbe8ea' }}>{t.task}</Text>
        </View>
      </View>

      {/* compass + distance */}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <Compass dist={dist} walking={walking} arrived={arrived} />
          {arrived && (
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(15), letterSpacing: ms(15) * 0.1, color: '#38f0e0' }}>{t.arrivedBig}</Text>
              <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.12, color: '#5a6e72' }}>{t.arrivedSub}</Text>
            </View>
          )}
        </View>

        <Text style={{ marginTop: 26, fontFamily: font('display', 700, lang), fontSize: ms(40), color: '#e4eff0' }}>
          {dist}
          <Text style={{ fontFamily: font('mono', 500), fontSize: ms(16), color: '#5a6e72' }}>m</Text>
        </Text>
        <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#5a6e72' }}>{t.distance}</Text>

        {/* signal bars */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 24 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <View key={i} style={{ width: 8, height: `${h}%`, borderRadius: 2, backgroundColor: i < litCount ? '#38c8c8' : '#1e2a2d' }} />
          ))}
        </View>
        <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: '#5a6e72' }}>{signalText}</Text>
      </View>

      {/* V.E.R.A. + hold-to-walk button pinned to bottom */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 20 }}>
        <VeraPanel line={veraLine} lang={lang} accent="#38c8c8" />
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel="walk"
          style={{
            marginTop: 12,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            backgroundColor: arrived ? '#38c8c8' : walking ? '#16211f' : '#111819',
            borderWidth: arrived ? 0 : 1,
            borderColor: walking ? '#38c8c866' : '#1e2a2d',
          }}
        >
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(12), letterSpacing: ms(12) * 0.08, color: arrived ? '#0c1012' : walking ? '#38f0e0' : '#dbe8ea' }}>
            {arrived ? t.walkDone : walking ? t.walking : t.walk}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const field: ModuleDef = {
  id: 'field',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'amber' }),
  Screen,
};
```

Note: `VeraPanel` accepts an `accent` prop (confirmed in `src/shell/components/VeraPanel.tsx`); Field Trials uses cyan `#38c8c8`. If the prop name differs, match the component.

- [ ] **Step 4: Fix the middle test's placeholder assertion**

In `FieldScreen.test.tsx`, replace the no-op line in the "holding walks…" test with a real check that the distance changed. The distance renders as a `<Text>` containing the number + `m`; assert the start value is gone after ticking:

```tsx
test('holding walks the distance down; releasing pauses it', async () => {
  jest.useFakeTimers();
  const { getByLabelText, queryByText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  expect(queryByText('340')).toBeTruthy();
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 3);
  });
  expect(queryByText('340')).toBeNull(); // distance decreased
  await fireEvent(btn, 'pressOut');
});
```

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npx jest src/modules/field/__tests__/FieldScreen.test.tsx` → PASS (all five).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx jest src/modules/field && npm test && npx tsc --noEmit`
Expected: all pass (incl. `registry.test.tsx` — tile/Icon unchanged); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/field/index.tsx src/modules/field/__tests__/FieldScreen.test.tsx
git commit -m "feat: field trials module screen (hold-to-walk + arrival guard)"
```

---

## Task 5: Manual verification in Expo Go / dev build

**Files:** none (verification only). No Skia here, so this runs in the dev build (or Expo Go) either way.

- [ ] **Step 1: Drive the app**

`npx expo start`. Confirm:
- Home grid → **FIELD TRIAL** tile → module opens (blue-dark, directive card, compass with a gently wandering needle, `340m`, `SIGNAL STRENGTH · HOLDING`).
- **Hold** the button → distance ticks down, needle homes toward the top tick, signal bars fill, V.E.R.A. escalates (walking → near under 100m). Release pauses; the needle stops homing.
- Reach 0 → `TARGET REACHED / THE COURT IS IN SESSION` over the compass, needle at 0°, signal MAXIMUM, button = `TRIAL COMPLETE · RETURN TO FACILITY`. Releasing that final hold does **not** exit.
- A **fresh tap** on the completed button → returns to the facility grid (arrival guard works).
- Korean (Settings) → localized, layout intact. Back arrow → facility.

- [ ] **Step 2: Update build progress**

In `CLAUDE.md`, mark `field` done in the Phase 4 line (note: fake hold-to-walk, no GPS/network; SVG compass). Commit:

```bash
git add CLAUDE.md
git commit -m "docs: mark field trials module complete (phase 4)"
```

---

## Self-Review

**Spec coverage:**
- Fake hold-to-walk, distance 340→0, session-only → Task 2 (`walkStep`) + Task 4 (interval, state). ✓
- Compass needle wander/home/lock (SVG+Reanimated, no Skia) → Task 3. ✓
- Signal bars by threshold, signal text → Task 2 (`signalLitCount`) + Task 4. ✓
- V.E.R.A. by proximity → Task 2 (`veraKey`) + Task 4. ✓
- Arrival + TARGET REACHED overlay + exit-labelled button → Task 4. ✓
- **Arrival guard** (finishing release doesn't exit; fresh press does) → Task 4 (`exitArmed` ref) + dedicated test. ✓
- Strings verbatim en/ko → Task 1. ✓
- Tile + Icon unchanged, registry green → Task 4 Step 6. ✓
- Timer/animation cleanup on unmount/release → Task 3 + Task 4. ✓

**Placeholder scan:** the FieldScreen middle test intentionally ships a no-op line in Step 1 and is corrected in Step 4 with real assertions — both shown in full. No other placeholders.

**Type consistency:** `START_DIST/TICK_MS/walkStep/signalLitCount/veraKey` (T2) consumed in T3/T4; `needleAngle` (T2) in T3; `Compass` (T3) in T4; `fieldStrings`/`FieldStrings` (T1) in T4; `veraKey` returns a key indexing `fieldStrings` (`t[veraKey(...)]`) — the returned union matches those string keys. No storage keys.

**Deviations from prototype, called out:** none material — the fake hold-to-walk, distances, thresholds, needle formula, and arrival guard all match the prototype. The compass is SVG (vector) rather than the prototype's CSS, a faithful reproduction.
