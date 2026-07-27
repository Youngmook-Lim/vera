# Hazard Assessment Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `hazard` placeholder Screen with the real Hazard Assessment module — a passive surveillance readout: an ambient SVG radar, a fixed four-entity census, and one V.E.R.A. line.

**Architecture:** A stateless `Screen` (in `index.tsx`) renders header + status pills + `<Radar>` + census card + `VeraPanel`, all from a verbatim `strings.ts` table. `Radar.tsx` is a self-contained `react-native-svg` + `react-native-reanimated` component (following `field/Compass.tsx`): static rings/crosshairs, a rotating gradient-wedge sweep, four drifting/pulsing entity blips, and a glowing center. The `hazard` `ModuleDef`, tile, and `Icon` in `index.tsx` are unchanged — only the `Screen` is replaced.

**Tech Stack:** React Native + Expo (TypeScript), `react-native-svg`, `react-native-reanimated`, Zustand store, Jest 29 + React Testing Library v14 (async).

## Global Constraints

- **Copy verbatim** from `STR.en`/`STR.ko` in `design/The Facility.dc.html` (hazard keys: lines 955–963 en, 1096–1104 ko). Do not reword; Korean is provisional (Phase 5 native-speaker pass).
- **Hex values verbatim** from the mock (`design/The Facility.dc.html` lines 425–482); use `palette`/`font`/`ms` from `src/core/theme.ts` for tokens.
- **SVG + Reanimated, not Skia** for the radar (decided in the spec; only `organism` uses Skia).
- **No** user interaction beyond the back arrow, **no** session state, **no** persistence, **no** network/sensors. The only added liveness is ambient blip drift.
- Verify with `npm test` and `npx tsc --noEmit`. Jest pinned to 29; RTL v14 is fully async (`await render(...)`, `await fireEvent.press(...)`, no global `screen`).
- Commit messages: **no** Claude/model co-author footer.
- Spec: `docs/superpowers/specs/2026-07-27-hazard-module-design.md`.

---

### Task 1: Hazard strings (en + ko census table)

**Files:**
- Create: `src/modules/hazard/strings.ts`
- Test: `src/modules/hazard/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>` from `src/core/i18n.ts` (`type Strings<T> = Record<'en' | 'ko', T>`).
- Produces:
  - `export type HazardScheme = 'benign' | 'monitoring' | 'escalated' | 'known'`
  - `export type HazardStrings = typeof en` — flat keys `title, sweep, unauthorized, sector, you, youNote, detected, vera` (all `string`) plus `entities: { id: string; desc: string; tag: string; scheme: HazardScheme }[]`
  - `export const hazardStrings: Strings<HazardStrings>`

- [ ] **Step 1: Write the failing test**

Create `src/modules/hazard/strings.test.ts`:

```ts
import { hazardStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(hazardStrings.ko).sort()).toEqual(Object.keys(hazardStrings.en).sort());
});

test('en and ko census lists align (length + scheme per row)', () => {
  expect(hazardStrings.ko.entities).toHaveLength(hazardStrings.en.entities.length);
  hazardStrings.en.entities.forEach((e, i) => {
    expect(hazardStrings.ko.entities[i].scheme).toBe(e.scheme);
  });
});

test('copy ported verbatim from the prototype', () => {
  expect(hazardStrings.en.unauthorized).toBe('4 UNAUTHORIZED');
  expect(hazardStrings.en.entities[0].desc).toBe('Claims to be the refrigerator. Unverified.');
  expect(hazardStrings.en.entities[2].desc).toBe('Reading over your shoulder. Currently.');
  expect(hazardStrings.en.vera).toBe('Four entities. One is reading over your shoulder. Do not turn around — it complicates the paperwork.');
  expect(hazardStrings.ko.entities[3].tag).toBe('기지 개체');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/hazard/strings.test.ts`
Expected: FAIL — `Cannot find module './strings'`.

- [ ] **Step 3: Write the strings module**

Create `src/modules/hazard/strings.ts` (the `·` characters are U+00B7 middle dots; en uses curly quotes `“ ”` and an em dash `—` — copy exactly):

```ts
import type { Strings } from '../../core/i18n';

export type HazardScheme = 'benign' | 'monitoring' | 'escalated' | 'known';
type Entity = { id: string; desc: string; tag: string; scheme: HazardScheme };

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. `sweep` is the mock's static
// header code (identical in both languages).
const en = {
  title: 'HAZARD ASSESSMENT',
  sweep: 'SWEEP 50640-H04',
  unauthorized: '4 UNAUTHORIZED',
  sector: 'SECTOR · YOUR APARTMENT',
  you: 'YOU · AUTHORIZED*',
  youNote: '*AUTHORIZATION SUBJECT TO REVIEW',
  detected: 'DETECTED ENTITIES',
  vera: 'Four entities. One is reading over your shoulder. Do not turn around — it complicates the paperwork.',
  entities: [
    { id: 'H-01 · STATIONARY, HUMMING', desc: 'Claims to be the refrigerator. Unverified.', tag: 'BENIGN', scheme: 'benign' },
    { id: 'H-02 · RECURRING FOOTSTEPS, ABOVE', desc: 'Alleged “upstairs neighbor.” No neighbor on file.', tag: 'MONITORING', scheme: 'monitoring' },
    { id: 'H-03 · PROXIMATE, SILENT', desc: 'Reading over your shoulder. Currently.', tag: 'ESCALATED', scheme: 'escalated' },
    { id: 'H-04 · GELATINOUS, FAMILIAR', desc: 'Specimen-03. It lives here. Flagged anyway.', tag: 'KNOWN', scheme: 'known' },
  ] as Entity[],
};

export type HazardStrings = typeof en;

const ko: HazardStrings = {
  title: '위험 평가',
  sweep: 'SWEEP 50640-H04',
  unauthorized: '미승인 4',
  sector: '구역 · 귀하의 아파트',
  you: '귀하 · 승인됨*',
  youNote: '*승인은 재심사 대상입니다',
  detected: '감지된 개체',
  vera: '개체 넷. 하나는 귀하의 어깨 너머로 읽고 있습니다. 돌아보지 마십시오 — 서류 작업이 복잡해집니다.',
  entities: [
    { id: 'H-01 · 정지 상태, 웅웅거림', desc: '냉장고라고 주장합니다. 미확인.', tag: '무해', scheme: 'benign' },
    { id: 'H-02 · 반복적 발소리, 위층', desc: '“위층 이웃”으로 추정. 등록된 이웃 없음.', tag: '관찰 중', scheme: 'monitoring' },
    { id: 'H-03 · 근접, 무음', desc: '귀하의 어깨 너머로 읽는 중. 지금.', tag: '상부 보고', scheme: 'escalated' },
    { id: 'H-04 · 젤라틴질, 낯익음', desc: '표본-03. 여기 삽니다. 그래도 표시됨.', tag: '기지 개체', scheme: 'known' },
  ] as Entity[],
};

export const hazardStrings: Strings<HazardStrings> = { en, ko };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/hazard/strings.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/hazard/strings.ts src/modules/hazard/strings.test.ts
git commit -m "feat: hazard module strings (en+ko census table)"
```

---

### Task 2: Radar (SVG sweep + drifting blips)

**Files:**
- Create: `src/modules/hazard/Radar.tsx`
- Test: `src/modules/hazard/__tests__/Radar.test.tsx`

**Interfaces:**
- Consumes: `react-native-svg`, `react-native-reanimated`.
- Produces: `export function Radar(): JSX.Element` — takes **no props**, renders a 230×230 `<Svg>`, owns its own animations and cancels them on unmount.

Reference pattern: `src/modules/field/Compass.tsx` (`Animated.createAnimatedComponent`, `useAnimatedProps`, `withRepeat`, `cancelAnimation` in a cleanup effect).

- [ ] **Step 1: Write the failing test**

Create `src/modules/hazard/__tests__/Radar.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { Radar } from '../Radar';

test('renders without throwing', async () => {
  const r = await render(<Radar />);
  expect(r).toBeTruthy();
});

test('unmounts cleanly (animations cancelled)', async () => {
  const { unmount } = await render(<Radar />);
  await unmount();
  expect(true).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/hazard/__tests__/Radar.test.tsx`
Expected: FAIL — `Cannot find module '../Radar'`.

- [ ] **Step 3: Write the Radar component**

Create `src/modules/hazard/Radar.tsx`:

```tsx
import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 230;
const C = SIZE / 2; // 115 — radar center
const R = 112; // sweep working radius

// Detected-entity blips: base position (from the mock's dot offsets), color,
// and a phase constant so each drifts/pulses out of sync from one clock.
const BLIPS = [
  { bx: 59.5, by: 55.5, color: '#ff5a48', phase: 0 },
  { bx: 161.5, by: 81.5, color: '#ff5a48', phase: 1.7 },
  { bx: 141.5, by: 161.5, color: '#ff5a48', phase: 3.1 },
  { bx: 77.5, by: 153.5, color: '#4fd08a', phase: 4.6 },
];

// A quarter wedge (12 o'clock → 3 o'clock) filled with the sweep gradient.
const WEDGE = `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 0 1 ${C + R} ${C} Z`;

function Blip({ drift, bx, by, color, phase }: { drift: SharedValue<number>; bx: number; by: number; color: string; phase: number }) {
  const props = useAnimatedProps(() => {
    const t = drift.value + phase;
    return {
      cx: bx + 8 * Math.sin(t),
      cy: by + 8 * Math.cos(t * 0.8),
      opacity: 0.55 + 0.45 * Math.sin(t * 1.3),
    };
  });
  return (
    <>
      {/* static soft glow rim behind the blip */}
      <Circle cx={bx} cy={by} r={9} fill={color} opacity={0.14} />
      <AnimatedCircle animatedProps={props} r={3.5} fill={color} />
    </>
  );
}

export function Radar() {
  const rot = useSharedValue(0); // sweep rotation, degrees
  const drift = useSharedValue(0); // shared phase for blip drift/pulse, radians

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 4400, easing: Easing.linear }), -1, false);
    drift.value = withRepeat(withTiming(Math.PI * 2, { duration: 6000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(rot);
      cancelAnimation(drift);
    };
  }, [rot, drift]);

  const sweepProps = useAnimatedProps(() => ({ rotation: rot.value }));

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <RadialGradient id="haz-bg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#1d1416" />
          <Stop offset="72%" stopColor="#131011" />
        </RadialGradient>
        <RadialGradient id="haz-you" cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="72%" stopColor="#f4b43a" />
        </RadialGradient>
        <LinearGradient id="haz-sweep" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#d63a2a" stopOpacity={0.24} />
          <Stop offset="100%" stopColor="#d63a2a" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* dish + rings */}
      <Circle cx={C} cy={C} r={114} fill="url(#haz-bg)" stroke="#2c2222" strokeWidth={1} />
      <Circle cx={C} cy={C} r={87} fill="none" stroke="#241a1c" strokeWidth={1} />
      <Circle cx={C} cy={C} r={59} fill="none" stroke="#241a1c" strokeWidth={1} strokeDasharray="3 4" />
      {/* crosshairs */}
      <Line x1={C} y1={1} x2={C} y2={SIZE - 1} stroke="#241a1c" strokeWidth={1} />
      <Line x1={1} y1={C} x2={SIZE - 1} y2={C} stroke="#241a1c" strokeWidth={1} />

      {/* rotating sweep */}
      <AnimatedG originX={C} originY={C} animatedProps={sweepProps}>
        <Path d={WEDGE} fill="url(#haz-sweep)" />
      </AnimatedG>

      {/* entity blips */}
      {BLIPS.map((b, i) => (
        <Blip key={i} drift={drift} bx={b.bx} by={b.by} color={b.color} phase={b.phase} />
      ))}

      {/* center: you (glow rim + core) */}
      <Circle cx={C} cy={C} r={11} fill="#f4b43a" opacity={0.18} />
      <Circle cx={C} cy={C} r={4.5} fill="url(#haz-you)" />
    </Svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/hazard/__tests__/Radar.test.tsx`
Expected: PASS (2 tests), no reanimated post-unmount warnings.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/hazard/Radar.tsx src/modules/hazard/__tests__/Radar.test.tsx
git commit -m "feat: hazard radar (svg sweep + drifting blips)"
```

---

### Task 3: Hazard Assessment Screen

**Files:**
- Modify: `src/modules/hazard/index.tsx` (replace the `Screen` function and its imports; keep `strings` [tile], `Icon`, and the `hazard` `ModuleDef` export unchanged)
- Test: `src/modules/hazard/__tests__/HazardScreen.test.tsx`

**Interfaces:**
- Consumes: `hazardStrings`, `HazardScheme` from `./strings` (Task 1); `Radar` from `./Radar` (Task 2); `VeraPanel` from `../../shell/components/VeraPanel`; `useFacilityStore` (`lang`, `setStep`); `font`, `ms`, `palette` from `../../core/theme`; `useSafeAreaInsets`.
- Produces: the replaced `Screen` used by `hazard.Screen` (already wired through `registry.ts` → `ScreenRouter`).

Reference pattern for header/back/`VeraPanel` layout: `src/modules/field/index.tsx`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/hazard/__tests__/HazardScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { hazardStrings } from '../strings';
import { hazard } from '../index';

const Screen = hazard.Screen;
const t = hazardStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'hazard', lang: 'en' });
});

test('renders header, status pills, and the you-note', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.title)).toBeTruthy();
  expect(getByText(t.unauthorized)).toBeTruthy();
  expect(getByText(t.sector)).toBeTruthy();
  expect(getByText(t.youNote)).toBeTruthy();
});

test('renders all four census entities with ids, descriptions, and tags', async () => {
  const { getByText } = await render(<Screen />);
  for (const e of t.entities) {
    expect(getByText(e.id)).toBeTruthy();
    expect(getByText(e.desc)).toBeTruthy();
    expect(getByText(e.tag)).toBeTruthy();
  }
});

test('renders the V.E.R.A. transmission line', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.vera)).toBeTruthy();
});

test('back arrow returns to the facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'hazard', lang: 'ko' });
  const { getByText } = await render(<Screen />);
  expect(getByText(hazardStrings.ko.title)).toBeTruthy();
  expect(getByText(hazardStrings.ko.entities[0].id)).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/modules/hazard/__tests__/HazardScreen.test.tsx`
Expected: FAIL — the current placeholder `Screen` renders `PlaceholderScreen`, so `getByText(t.unauthorized)` / entity rows are not found.

- [ ] **Step 3: Replace the Screen in `index.tsx`**

Overwrite `src/modules/hazard/index.tsx` with (the tile `strings`, `Icon`, and `hazard` `ModuleDef` are preserved verbatim; only imports and `Screen` change):

```tsx
import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Radar } from './Radar';
import { hazardStrings, type HazardScheme } from './strings';

const strings = {
  en: { title: 'HAZARD ASSESSMENT', sub: 'entity census', tag: '4 ⚠' },
  ko: { title: '위험 평가', sub: '개체 조사', tag: '4 ⚠' },
} as const;

// Mock: 13px red-bordered rounded square.
function Icon() {
  return <View style={{ width: 13, height: 13, borderWidth: 1.5, borderColor: palette.accent.red, borderRadius: 3 }} />;
}

// Census tag pill colors per scheme (from the mock's four entity rows).
const TAG_STYLES: Record<HazardScheme, { text: string; border: string; bg: string }> = {
  benign: { text: '#8a8168', border: '#2c2a22', bg: 'transparent' },
  monitoring: { text: '#c98a17', border: '#f4b43a66', bg: '#f4b43a14' },
  escalated: { text: '#ff5a48', border: '#d63a2a66', bg: '#d63a2a14' },
  known: { text: '#4fd08a', border: '#4fd08a66', bg: '#4fd08a14' },
};

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = hazardStrings[lang];

  // The one interactive-free flourish on the pill: a slow opacity pulse.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.45, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={{ flex: 1, backgroundColor: '#131011', paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2a2020' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a6868' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c5656' }}>{t.sweep}</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
        {/* status pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#d63a2a66', backgroundColor: '#d63a2a14', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 }, pulseStyle]}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#ff5a48' }} />
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#ff5a48' }}>{t.unauthorized}</Text>
          </Animated.View>
          <View style={{ borderWidth: 1, borderColor: '#2c2222', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 }}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#8a8168' }}>{t.sector}</Text>
          </View>
        </View>

        {/* radar + "you" label */}
        <View style={{ marginTop: 20, width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
          <Radar />
          <Text style={{ position: 'absolute', top: 125, left: 0, right: 0, textAlign: 'center', fontFamily: font('mono', 600, lang), fontSize: ms(7), letterSpacing: ms(7) * 0.1, color: '#8a8168' }}>{t.you}</Text>
        </View>
        <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.14, color: '#6c5656' }}>{t.youNote}</Text>

        {/* detected entities */}
        <Text style={{ marginTop: 18, alignSelf: 'flex-start', fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#6c5656' }}>{t.detected}</Text>
        <View style={{ marginTop: 8, width: '100%', backgroundColor: '#1c1617', borderWidth: 1, borderColor: '#2c2222', borderRadius: 12, overflow: 'hidden' }}>
          {t.entities.map((e, i) => {
            const s = TAG_STYLES[e.scheme];
            return (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderBottomWidth: i < t.entities.length - 1 ? 1 : 0, borderBottomColor: '#241a1c' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), color: '#8a8168' }}>{e.id}</Text>
                  <Text style={{ marginTop: 3, fontFamily: font('display', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.4, color: '#c9c2ae' }}>{e.desc}</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: s.border, backgroundColor: s.bg, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 20 }}>
                  <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.06, color: s.text }}>{e.tag}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* V.E.R.A. */}
        <View style={{ marginTop: 14, width: '100%' }}>
          <VeraPanel line={t.vera} lang={lang} accent="#ff6a1a" />
        </View>
      </ScrollView>
    </View>
  );
}

export const hazard: ModuleDef = {
  id: 'hazard',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'red' }),
  Screen,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/modules/hazard/__tests__/HazardScreen.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/hazard/index.tsx src/modules/hazard/__tests__/HazardScreen.test.tsx
git commit -m "feat: hazard assessment module screen (radar + census)"
```

---

### Task 4: Full verification + mark Phase 4 complete

**Files:**
- Modify: `CLAUDE.md` (build-progress list)

**Interfaces:** none (docs + verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green, including the three new hazard suites.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Update the Phase 4 checkbox in `CLAUDE.md`**

In the "Build progress" list, change the Phase 4 line from unchecked to checked:

Old:
```
- [ ] **Phase 4 — Modules, one at a time:** results ✅ → incinerator ✅ → organism ✅ → field ✅ → hazard (replace placeholder Screens).
```
New:
```
- [x] **Phase 4 — Modules, one at a time:** results ✅ → incinerator ✅ → organism ✅ → field ✅ → hazard ✅ (all placeholder Screens replaced).
```

- [ ] **Step 4: Update the hazard note in `CLAUDE.md`**

At the end of that same Phase 4 bullet, replace the forward-looking hazard note with a completion note:

Old:
```
**`hazard` (optic eye + radar) is the last module** — reassess Skia-vs-SVG for it.
```
New:
```
`hazard` done (last module — **SVG + Reanimated**, not Skia: radar sweep + drifting blips + a fixed 4-entity census; passive screen, no user interaction, no optic eye per the pixel-final design — plan: `docs/superpowers/plans/2026-07-27-phase-4-hazard-module.md`). **Phase 4 complete.**
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark hazard module complete (phase 4 done)"
```

---

## Notes for the implementer

- **On-device visual check (optional, not test-gated):** the radar's rotating sweep and blip drift can only be seen on the dev build (`npx expo start`), not in jest (reanimated/svg are jest-rendered but not animated). The tests only assert the radar renders and unmounts cleanly.
- If `useAnimatedProps` returning `{ rotation }` on `AnimatedG` does not visibly rotate on-device, the fallback is to wrap the sweep `<Svg>` layer in an `Animated.View` with a `rotate` transform driven by `useAnimatedStyle` — but try the `AnimatedG` form first (it mirrors `Compass.tsx`'s animated-SVG-prop approach).
- Do not touch the tile `strings`, `Icon`, or the `registry.ts` entry — the tile already ships and the router already routes `hazard` to `hazard.Screen`.
```
