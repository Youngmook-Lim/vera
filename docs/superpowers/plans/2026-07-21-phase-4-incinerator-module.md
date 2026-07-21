# The Incinerator Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `incinerator` placeholder with the real module — a grievance-disposal ritual with a 2-second burn animation and a persisted, personal burned-counter.

**Architecture:** A `Chamber` component draws the flame with `react-native-svg` + `react-native-reanimated` (no Skia — stays Expo Go). The Screen owns a three-phase state machine (compose → burning → done), a multiline `TextInput`, and a burned counter persisted via `core/storage`. Strings port verbatim from the prototype.

**Tech Stack:** React Native + Expo (TypeScript), Zustand store, `react-native-svg` 15, `react-native-reanimated` 4, `expo-linear-gradient` 57 (button gradient), AsyncStorage (behind `core/storage.ts`), Jest 29 + async React Testing Library v14.

## Global Constraints

- **Copy verbatim:** all user-facing copy from `STR.en`/`STR.ko` in `design/The Facility.dc.html`; all hex from the prototype markup / `design/README.md`. `·` is U+00B7, `°` is U+00B0. Korean ported as-is (Phase 5 native pass).
- **No Skia, no dev build, no new dependencies** beyond those already installed (`react-native-svg`, `react-native-reanimated`, `expo-linear-gradient` are all present).
- **Timers and animations cleaned up on unmount** (the "burn timeout" risk in `docs/architecture.md`).
- **Burned counter starts at 0**, persists, increments per completed burn (design decision — not the prototype's 1,208 seed).
- Verify with `npm test` and `npx tsc --noEmit`. RTL v14 is async (`await render`, `await fireEvent`), no global `screen`. Use `globalThis`, never `global`, in tests. Fake timers need `jest.useRealTimers()` in `afterEach`.
- Type sizes via `ms(px)`; fonts via `font(role, weight, lang)`.

## File Structure

| File | Responsibility |
|---|---|
| `src/modules/incinerator/strings.ts` (create) | `incineratorStrings` (en/ko), verbatim copy + two `{n}` templates. |
| `src/modules/incinerator/strings.test.ts` (create) | en/ko key-parity + verbatim spot-checks. |
| `src/modules/incinerator/Chamber.tsx` (create) | SVG + Reanimated flame; `burning` prop; owns animations + cleanup. |
| `src/modules/incinerator/__tests__/Chamber.test.tsx` (create) | Renders idle + burning; unmounts cleanly. |
| `src/core/storage.ts` (modify) | Add `burnedCount` key. |
| `src/modules/incinerator/index.tsx` (modify) | Replace placeholder Screen; keep tile export unchanged. |
| `src/modules/incinerator/__tests__/IncineratorScreen.test.tsx` (create) | Phases, burn timer, guards, counter persistence, back-nav. |

---

## Task 1: Strings (`strings.ts`)

**Files:**
- Create: `src/modules/incinerator/strings.ts`
- Test: `src/modules/incinerator/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>` from `src/core/i18n.ts`.
- Produces: `incineratorStrings: Strings<IncineratorStrings>` and `type IncineratorStrings`, keys: `title, iGrievance, iPlaceholder, iChamber, iAsh, iAwaiting, iWords, iStatusBurning, iStatusDone, iBtn, iBtnBurning, iBtnAgain, iReviewLabel, iVeraCompose, iVeraBurn, iVeraDone, iBurned`. `iWords` and `iBurned` contain a `{n}` placeholder for `tmpl()`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/incinerator/strings.test.ts`:

```ts
import { incineratorStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(incineratorStrings.ko).sort()).toEqual(Object.keys(incineratorStrings.en).sort());
});

test('copy is ported verbatim from the prototype', () => {
  expect(incineratorStrings.en.iGrievance).toBe('STATE YOUR GRIEVANCE');
  expect(incineratorStrings.en.iChamber).toBe('CHAMBER · 1,400°C');
  expect(incineratorStrings.en.iVeraDone).toBe(
    'Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains.',
  );
  expect(incineratorStrings.ko.iAsh).toBe('재는 기록용으로 보관됩니다');
});

test('templated strings carry the {n} placeholder', () => {
  expect(incineratorStrings.en.iBurned).toContain('{n}');
  expect(incineratorStrings.en.iWords).toContain('{n}');
  expect(incineratorStrings.ko.iBurned).toContain('{n}');
  expect(incineratorStrings.ko.iWords).toContain('{n}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/incinerator/strings.test.ts`
Expected: FAIL — cannot find module `./strings`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/incinerator/strings.ts`. Copy verbatim from `design/The Facility.dc.html` (`STR.en` ~lines 901,919–931; `STR.ko` ~lines 1042,1060–1072). `iWords` is built from the prototype's `iWordsSuffix` with a leading `{n}`; `iBurned` from the prototype's `iBurnedText` template.

```ts
import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. iWords/iBurned add a {n} slot
// for tmpl() (the prototype built these by string concatenation).
const en = {
  title: 'THE INCINERATOR',
  iGrievance: 'STATE YOUR GRIEVANCE',
  iPlaceholder: 'type it. all of it.',
  iChamber: 'CHAMBER · 1,400°C',
  iAsh: 'ASH RETAINED FOR RECORDS',
  iAwaiting: 'AWAITING GRIEVANCE',
  iWords: '{n} WORDS · READY FOR DISPOSAL',
  iStatusBurning: 'INCINERATING · 1,400°C',
  iStatusDone: 'DISPOSED · IRRECOVERABLE',
  iBtn: 'INCINERATE',
  iBtnBurning: 'INCINERATING…',
  iBtnAgain: 'STATE ANOTHER GRIEVANCE',
  iReviewLabel: 'V.E.R.A. · PRE-COMBUSTION REVIEW',
  iVeraCompose: 'State it fully. The chamber does not accept summaries.',
  iVeraBurn: 'Incinerating. This is the only service we provide free of charge.',
  iVeraDone: 'Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains.',
  iBurned: 'DISPOSAL · {n} BURNED',
};

export type IncineratorStrings = typeof en;

const ko: IncineratorStrings = {
  title: '소각로',
  iGrievance: '불만 사항을 진술하십시오',
  iPlaceholder: '입력하십시오. 전부.',
  iChamber: '연소실 · 1,400°C',
  iAsh: '재는 기록용으로 보관됩니다',
  iAwaiting: '불만 대기 중',
  iWords: '{n}단어 · 폐기 준비 완료',
  iStatusBurning: '소각 중 · 1,400°C',
  iStatusDone: '폐기됨 · 복구 불가',
  iBtn: '소각',
  iBtnBurning: '소각 중…',
  iBtnAgain: '다른 불만 진술',
  iReviewLabel: 'V.E.R.A. · 연소 전 검토',
  iVeraCompose: '빠짐없이 진술하십시오. 연소실은 요약을 받지 않습니다.',
  iVeraBurn: '소각 중. 이것은 저희가 무료로 제공하는 유일한 서비스입니다.',
  iVeraDone: '폐기되었습니다. 복구 불가. 불만은 사라졌습니다. 그 대상은, 유감스럽게도, 남아 있습니다.',
  iBurned: '폐기 · {n}건 소각',
};

export const incineratorStrings: Strings<IncineratorStrings> = { en, ko };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/incinerator/strings.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/modules/incinerator/strings.ts src/modules/incinerator/strings.test.ts
git commit -m "feat: incinerator strings (en/ko, verbatim)"
```

---

## Task 2: Chamber flame (`Chamber.tsx`)

**Files:**
- Create: `src/modules/incinerator/Chamber.tsx`
- Test: `src/modules/incinerator/__tests__/Chamber.test.tsx`

**Interfaces:**
- Consumes: `Lang` from `core/i18n`; `font`, `ms` from `core/theme`.
- Produces: `Chamber({ burning, label, lang }: { burning: boolean; label: string; lang: Lang })` — a 250×150 bordered box with an animated radial-gradient flame and the chamber label overlaid.

- [ ] **Step 1: Write the failing test**

Create `src/modules/incinerator/__tests__/Chamber.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { Chamber } from '../Chamber';

test('renders the chamber label at idle', async () => {
  const { getByText } = await render(<Chamber burning={false} label="CHAMBER · 1,400°C" lang="en" />);
  expect(getByText('CHAMBER · 1,400°C')).toBeTruthy();
});

test('renders while burning', async () => {
  const { getByText } = await render(<Chamber burning={true} label="CHAMBER · 1,400°C" lang="en" />);
  expect(getByText('CHAMBER · 1,400°C')).toBeTruthy();
});

test('unmounts without throwing (animation cleanup)', async () => {
  const { unmount } = await render(<Chamber burning={true} label="CHAMBER · 1,400°C" lang="en" />);
  await unmount();
  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/incinerator/__tests__/Chamber.test.tsx`
Expected: FAIL — cannot find module `../Chamber`.

- [ ] **Step 3: Write minimal implementation**

Create `src/modules/incinerator/Chamber.tsx`. The outer `View` clips (rounded + `overflow:'hidden'`) so the flame `Rect` doesn't spill past the rounded corners; the flame is an `AnimatedRect` whose `height`/`y`/`opacity` come from Reanimated. Hex values from prototype markup (lines 404–407, 1308).

```tsx
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Lang } from '../../core/i18n';
import { font, ms } from '../../core/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const W = 250;
const H = 150;
const IDLE = 96;
const SURGE = 150;

// The mock's flame: a radial-gradient block anchored to the bottom that grows
// (96→150) and flickers (slow at idle, fast while burning). No Skia — SVG + a
// couple of Reanimated shared values reproduce it faithfully.
export function Chamber({ burning, label, lang }: { burning: boolean; label: string; lang: Lang }) {
  const h = useSharedValue(IDLE);
  const flick = useSharedValue(1);

  useEffect(() => {
    h.value = withTiming(burning ? SURGE : IDLE, { duration: 500, easing: Easing.out(Easing.ease) });
    cancelAnimation(flick);
    flick.value = 1;
    flick.value = withRepeat(
      withTiming(burning ? 0.8 : 0.9, { duration: burning ? 250 : 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [burning, h, flick]);

  useEffect(
    () => () => {
      cancelAnimation(h);
      cancelAnimation(flick);
    },
    [h, flick],
  );

  const flameProps = useAnimatedProps(() => ({ height: h.value, y: H - h.value, opacity: flick.value }));

  return (
    <View style={{ width: W, height: H, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#3a281e' }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="chamberBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#241612" />
            <Stop offset="1" stopColor="#160d0a" />
          </LinearGradient>
          <RadialGradient id="flame" cx="0.5" cy="1.2" rx="1.2" ry="0.9">
            <Stop offset="0" stopColor="#ffcf4a" />
            <Stop offset="0.4" stopColor="#ff6a1a" />
            <Stop offset="0.72" stopColor="#a02010" />
            <Stop offset="1" stopColor="#3a1206" />
          </RadialGradient>
          <LinearGradient id="chamberFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#160d0a" stopOpacity="1" />
            <Stop offset="1" stopColor="#160d0a" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#chamberBg)" />
        <AnimatedRect x="0" width={W} fill="url(#flame)" animatedProps={flameProps} />
        <Rect x="0" y={H - 20} width={W} height="20" fill="url(#chamberFade)" />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 14,
          textAlign: 'center',
          fontFamily: font('mono', 600, lang),
          fontSize: ms(9),
          letterSpacing: ms(9) * 0.2,
          color: '#ffcf9a',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/modules/incinerator/__tests__/Chamber.test.tsx`
Expected: PASS (all three).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/modules/incinerator/Chamber.tsx src/modules/incinerator/__tests__/Chamber.test.tsx
git commit -m "feat: incinerator chamber flame (svg + reanimated)"
```

---

## Task 3: Screen + storage key (`index.tsx`, `storage.ts`)

**Files:**
- Modify: `src/core/storage.ts` (add `burnedCount` key)
- Modify: `src/modules/incinerator/index.tsx` (replace placeholder Screen; tile unchanged)
- Test: `src/modules/incinerator/__tests__/IncineratorScreen.test.tsx`

**Interfaces:**
- Consumes: `incineratorStrings` (Task 1); `Chamber` (Task 2); `tmpl` (`core/i18n`); `KEYS`, `storage` (`core/storage`); `useFacilityStore`; `font`, `ms`, `palette` (`core/theme`); `LinearGradient` (`expo-linear-gradient`).
- Produces: the real `incinerator` `ModuleDef.Screen`. Tile export unchanged.

Note on the V.E.R.A. card: the incinerator uses the prototype's distinct **PRE-COMBUSTION REVIEW** card (left orange border, no pulsing LIVE dot), NOT the shared `VeraPanel`. This is intentional — the design spec's mention of "VeraPanel" was loose; match the mock (lines 411–415).

- [ ] **Step 1: Add the storage key**

In `src/core/storage.ts`, add one line to `KEYS` (after `lastSeenQueue`):

```ts
  lastSeenQueue: 'facility.lastSeenQueue.v1',
  burnedCount: 'facility.burnedCount.v1',
```

- [ ] **Step 2: Write the failing component test**

Create `src/modules/incinerator/__tests__/IncineratorScreen.test.tsx`:

```tsx
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { incineratorStrings } from '../strings';
import { incinerator } from '../index';

const Screen = incinerator.Screen;
const t = incineratorStrings.en;

beforeEach(async () => {
  await storage.remove(KEYS.burnedCount);
  useFacilityStore.setState({ step: 'incinerator', lang: 'en' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders compose state: grievance label, awaiting status, compose V.E.R.A. line', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.iGrievance)).toBeTruthy();
  expect(getByText(t.iAwaiting)).toBeTruthy();
  expect(getByText(t.iVeraCompose)).toBeTruthy();
});

test('empty grievance: pressing incinerate is a no-op', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText } = await render(<Screen />);
  await act(async () => {}); // flush storage read
  await fireEvent.press(getByLabelText('incinerate'));
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(getByText(t.iVeraCompose)).toBeTruthy(); // still composing
});

test('full burn: compose → burning → done, with counter increment and persistence', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText, findByText } = await render(<Screen />);
  await act(async () => {}); // flush storage read (starts at 0)
  await fireEvent.changeText(getByLabelText('grievance'), 'Craig read the email aloud');
  await fireEvent.press(getByLabelText('incinerate'));
  expect(getByText(t.iVeraBurn)).toBeTruthy(); // burning
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(await findByText(t.iVeraDone)).toBeTruthy(); // done
  expect(getByText(t.iAsh)).toBeTruthy();
  expect(await storage.get(KEYS.burnedCount)).toBe('1');
});

test('state another grievance returns to compose and clears the text', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText } = await render(<Screen />);
  await act(async () => {});
  await fireEvent.changeText(getByLabelText('grievance'), 'x');
  await fireEvent.press(getByLabelText('incinerate'));
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  await fireEvent.press(getByLabelText('incinerate')); // "state another"
  expect(getByText(t.iAwaiting)).toBeTruthy();
  expect(getByLabelText('grievance').props.value).toBe('');
});

test('header shows the persisted burned count on mount', async () => {
  await storage.set(KEYS.burnedCount, '7');
  const { findByText } = await render(<Screen />);
  expect(await findByText('DISPOSAL · 7 BURNED')).toBeTruthy();
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/incinerator/__tests__/IncineratorScreen.test.tsx`
Expected: FAIL — placeholder Screen renders `PlaceholderScreen`, so these texts/labels are absent.

- [ ] **Step 4: Implement the Screen**

Replace the entire contents of `src/modules/incinerator/index.tsx` with:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tmpl } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import type { ModuleDef } from '../types';
import { Chamber } from './Chamber';
import { incineratorStrings } from './strings';

type Phase = 'compose' | 'burning' | 'done';

// Home-grid tile — unchanged from the placeholder.
const tileStrings = {
  en: { title: 'THE INCINERATOR', sub: 'disposal services', tag: 'READY' },
  ko: { title: '소각로', sub: '폐기 처리', tag: '준비됨' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🔥</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = incineratorStrings[lang];

  const [phase, setPhase] = useState<Phase>('compose');
  const [text, setText] = useState('');
  const [burnedCount, setBurnedCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void storage
      .get(KEYS.burnedCount)
      .then((raw) => {
        if (!alive) return;
        const n = raw == null ? 0 : Number(raw);
        if (Number.isFinite(n)) setBurnedCount(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const onPress = () => {
    if (phase === 'burning') return;
    if (phase === 'done') {
      setPhase('compose');
      setText('');
      return;
    }
    if (!text.trim()) return;
    setPhase('burning');
    timer.current = setTimeout(() => {
      setBurnedCount((c) => {
        const next = c + 1;
        void storage.set(KEYS.burnedCount, String(next));
        return next;
      });
      setPhase('done');
    }, 2000);
  };

  const status =
    phase === 'burning'
      ? t.iStatusBurning
      : phase === 'done'
        ? t.iStatusDone
        : words === 0
          ? t.iAwaiting
          : tmpl(t.iWords, { n: words });
  const veraLine = phase === 'burning' ? t.iVeraBurn : phase === 'done' ? t.iVeraDone : t.iVeraCompose;
  const inputOpacity = phase === 'burning' ? 0.12 : phase === 'done' ? 0 : 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#120d0a', paddingTop: insets.top }}>
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
          borderBottomColor: '#2a1c14',
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a6a58' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#7a5a48' }}>
          {tmpl(t.iBurned, { n: burnedCount.toLocaleString('en-US') })}
        </Text>
      </View>

      {/* grievance input */}
      <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: '#9a6a52' }}>
          {t.iGrievance}
        </Text>
        <View
          style={{
            marginTop: 9,
            backgroundColor: '#1c1410',
            borderWidth: 1,
            borderColor: '#3a281e',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 11,
            minHeight: 104,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            editable={phase === 'compose'}
            multiline
            placeholder={t.iPlaceholder}
            placeholderTextColor="#6c5646"
            accessibilityLabel="grievance"
            style={{
              padding: 0,
              fontFamily: font('display', 500, lang),
              fontSize: ms(13),
              lineHeight: ms(13) * 1.5,
              color: '#f2e7d3',
              opacity: inputOpacity,
              minHeight: 82,
              textAlignVertical: 'top',
            }}
          />
          {phase === 'done' && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.18, color: '#6c5646' }}>
                {t.iAsh}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* chamber */}
      <View style={{ marginTop: 26, alignItems: 'center' }}>
        <Chamber burning={phase === 'burning'} label={t.iChamber} lang={lang} />
        <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(10), color: '#9a6a52' }}>{status}</Text>
      </View>

      {/* V.E.R.A. pre-combustion review card (distinct from VeraPanel) */}
      <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
        <View style={{ backgroundColor: '#17120e', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: '#ff6a1a' }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.16, color: '#ff8a4a', marginBottom: 5 }}>
            {t.iReviewLabel}
          </Text>
          <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12.5), lineHeight: ms(12.5) * 1.5, color: palette.dark.text }}>
            {veraLine}
          </Text>
        </View>
      </View>

      {/* incinerate button */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24 }}>
        <Pressable
          onPress={onPress}
          disabled={phase === 'burning'}
          accessibilityRole="button"
          accessibilityLabel="incinerate"
        >
          {phase === 'compose' ? (
            <LinearGradient
              colors={['#ff8a3a', '#ff6a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ borderRadius: 15, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.12, color: '#2a0d04' }}>
                🔥 {t.iBtn}
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={
                phase === 'burning'
                  ? { backgroundColor: '#3a281e', borderRadius: 15, paddingVertical: 16, alignItems: 'center' }
                  : { backgroundColor: '#1c1410', borderWidth: 1, borderColor: '#3a281e', borderRadius: 15, paddingVertical: 15, alignItems: 'center' }
              }
            >
              <Text
                style={{
                  fontFamily: font('display', 700, lang),
                  fontSize: ms(13),
                  letterSpacing: ms(13) * 0.12,
                  color: phase === 'burning' ? '#9a6a52' : '#ff8a4a',
                }}
              >
                {phase === 'burning' ? t.iBtnBurning : t.iBtnAgain}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export const incinerator: ModuleDef = {
  id: 'incinerator',
  layout: 'wide',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'green' }),
  Screen,
};
```

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npx jest src/modules/incinerator/__tests__/IncineratorScreen.test.tsx`
Expected: PASS (all six tests).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx jest src/modules/incinerator && npm test && npx tsc --noEmit`
Expected: all tests pass (including the existing `registry.test.tsx` — tile unchanged); no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/core/storage.ts src/modules/incinerator/index.tsx src/modules/incinerator/__tests__/IncineratorScreen.test.tsx
git commit -m "feat: incinerator module screen (grievance burn + persisted counter)"
```

---

## Task 4: Manual verification in Expo Go

**Files:** none (verification only).

- [ ] **Step 1: Launch and drive the app**

Run the app (Expo Go) and confirm on-device:
- Home grid → tap the wide **THE INCINERATOR** tile → the module opens (warm-dark screen, chamber with idle flame).
- Type a grievance → word count updates ("N WORDS · READY FOR DISPOSAL"); V.E.R.A. says "State it fully…".
- Press **🔥 INCINERATE** → text fades, flame surges and flickers faster for ~2s, then "ASH RETAINED FOR RECORDS" appears; status "DISPOSED · IRRECOVERABLE"; header counter increments.
- Press **STATE ANOTHER GRIEVANCE** → back to empty compose.
- Fully close and reopen the app, revisit the incinerator — the burned counter retains its value.
- Switch to Korean (Settings) and reopen — copy is Korean, layout intact.
- Back arrow returns to the facility grid.

- [ ] **Step 2: Update build progress**

In `CLAUDE.md`, under "Build progress", mark the `incinerator` module done in the Phase 4 line (leave organism/field/hazard). Commit:

```bash
git add CLAUDE.md
git commit -m "docs: mark incinerator module complete (phase 4)"
```

---

## Self-Review

**Spec coverage:**
- Three-phase state machine (compose/burning/done) + guards → Task 3 (`onPress`, phase derivations). ✓
- 2s burn timeout, cleaned up on unmount → Task 3 (`timer` ref + cleanup effect). ✓
- Flame: SVG radial gradient, grow 96→150, flicker fast/slow, cleanup → Task 2. ✓
- Text fade on burn / hidden + ASH overlay on done → Task 3 (`inputOpacity`, done overlay). ✓
- Burned counter starts at 0, persists, increments per burn → Task 3 (`burnedCount`, storage) + tests. ✓
- Live word count (`AWAITING GRIEVANCE` / `N WORDS…`) → Task 3 (`words`, `status`). ✓
- Strings verbatim en/ko + `{n}` templates → Task 1. ✓
- Button gradient (compose) + burning/done variants → Task 3 (`expo-linear-gradient`). ✓
- V.E.R.A. pre-combustion card (not VeraPanel) → Task 3, deviation from spec noted. ✓
- Tile unchanged, registry test green → Task 3 Step 6. ✓
- No Skia / Expo Go / no new deps → confirmed. ✓

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `IncineratorStrings`/`incineratorStrings` (Task 1) consumed in Task 3; `Chamber({ burning, label, lang })` (Task 2) called with matching props in Task 3; `burnedCount` key added in Task 3 Step 1 before use; `Phase` type local to Task 3. ✓

**Deviations from spec, called out:**
1. The V.E.R.A. review card is a custom PRE-COMBUSTION card, not the shared `VeraPanel` (the spec mentioned `VeraPanel` loosely; the mock uses a distinct card without the LIVE pulse). Matching the mock.
2. Component tests assert observable **V.E.R.A. line / status / ASH text** per phase (robust text assertions) rather than animation-style internals — the behavior under test is identical.
