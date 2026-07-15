# Phase 1: Scaffold + Theme + Shell Skeleton — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo app with fonts, design tokens, the `step` state machine, the module-registry contract, and a pixel-faithful launcher home (`facility`) whose tiles route to placeholder screens.

**Architecture:** Shell + module registry (see `docs/architecture.md`). One Zustand store holds a single `step` value; conditional rendering IS the router (no navigation library). Modules self-register: a folder in `src/modules/` exporting `{ id, layout, Icon, tile, Screen }` plus one registry line. V.E.R.A.'s lines come from `src/vera/getTransmission(context)` — an authored corpus now, maybe an LLM later, callers never know.

**Tech Stack:** React Native + Expo (TypeScript), Zustand, react-native-reanimated, expo-font (+ @expo-google-fonts packages, self-hosted Pretendard OTFs), jest-expo + @testing-library/react-native.

## Global Constraints

- **Design fidelity is final intent.** Every hex value, size, and copy string below is copied verbatim from `design/README.md` and the prototype `design/The Facility.dc.html`. Do not "improve" them.
- **No navigation library.** Routing = conditional render on `store.step`.
- **Type scale:** the 388px-wide mock maps ~1:1 to device dp for **layout**, but **font sizes scale ×1.1** (design/README.md "Label style"). Always size text via the `ms()` helper; use raw mock values for padding/radii/heights.
- **Fonts bundled as assets; no CDN at runtime.** Space Grotesk + IBM Plex Mono via `@expo-google-fonts/*` npm packages (bundled, not fetched), Pretendard as local OTFs.
- **Phase 1 must run in Expo Go.** Do NOT install `@shopify/react-native-skia` or `react-native-mmkv` yet — they require a dev build and nothing in phase 1 uses them (mmkv arrives with the phase 2 enrollment gate, skia with phase 4 modules).
- **No first-run gate yet.** The store boots straight to `step: 'facility'`; phase 2 adds the enrolled check.
- **No `demo: miss a day` link.** It's a prototype review affordance; production notes say remove it (missed-day is phase 3).
- **Native-adjacent deps via `npx expo install`** (picks SDK-compatible versions); pure-JS deps via `npm i`. Never pin versions by hand.
- **Commits:** conventional prefix (`feat:`/`chore:`/`test:`), no AI attribution lines (user rule).
- **Korean copy** is a strong first pass carried over from the prototype; new ko strings authored here get the same "needs native-speaker comedy pass before wide sharing" caveat — do not block on it.

## File Structure (end state of phase 1)

```
App.tsx                                 # font loading → ScreenRouter
app.json                                # name "The Facility", slug "the-facility"
jest.setup.ts                           # reanimated setUpTests + safe-area mock
assets/fonts/Pretendard-{Medium,SemiBold,Bold}.otf
src/
  core/
    theme.ts                            # palette, tagSchemes, ms(), font()
    i18n.ts                             # Lang type + Strings<T> helper
    store.ts                            # Zustand: step machine + lang
  vera/
    index.ts                            # getTransmission(context) seam
  shell/
    strings.ts                          # shell copy, en/ko
    ScreenRouter.tsx                    # conditional render on step
    FacilityScreen.tsx                  # launcher home
    PlaceholderScreen.tsx               # dark "under construction" screen
    components/
      VeraPanel.tsx                     # dark transmission card, pulsing LIVE dot
  modules/
    types.ts                            # ModuleDef / RegistryEntry contract
    registry.ts                         # ordered entries incl. 2 locked slots
    results/index.tsx                   # tile data + placeholder Screen
    incinerator/index.tsx
    field/index.tsx
    organism/index.tsx
    hazard/index.tsx
```

Tests live in `__tests__/` folders next to the code they test.

---

### Task 1: Expo scaffold + test toolchain

**Files:**
- Create: entire Expo `blank-typescript` template at repo root (App.tsx, app.json, index.ts, tsconfig.json, babel.config.js if the template emits one, package.json, .gitignore)
- Create: `jest.setup.ts`, `src/__tests__/smoke.test.ts`
- Modify: `app.json` (name/slug), `package.json` (jest config)

**Interfaces:**
- Consumes: nothing (repo currently has only `design/`, `docs/`, `README.md`)
- Produces: a running Expo project where `npm test` and `npx tsc --noEmit` pass; deps available to all later tasks: `zustand`, `react-native-reanimated`, `react-native-safe-area-context`, `expo-font`, `expo-status-bar`, `@expo-google-fonts/space-grotesk`, `@expo-google-fonts/ibm-plex-mono`

- [ ] **Step 1: Commit this plan file**

```bash
git add docs/superpowers/plans/2026-07-15-phase-1-shell-skeleton.md
git commit -m "docs: add phase 1 implementation plan"
```

- [ ] **Step 2: Scaffold the template in a scratch dir and merge it in**

The repo root is non-empty (`design/`, `docs/`, `README.md`), so scaffold elsewhere and copy in, keeping the repo's README:

```bash
SCRATCH=$(mktemp -d)
npx create-expo-app@latest "$SCRATCH/the-facility" --template blank-typescript --no-install
rsync -a --exclude README.md "$SCRATCH/the-facility/" /Users/youngmooklim/repos/the-facility/
cd /Users/youngmooklim/repos/the-facility && npm install
```

Expected: `App.tsx`, `app.json`, `index.ts`, `tsconfig.json`, `package.json`, `.gitignore` now at repo root; `git status` shows them untracked and shows NO changes to `README.md`, `design/`, `docs/`.

- [ ] **Step 3: Set app identity in `app.json`**

In the `expo` object set:

```json
"name": "The Facility",
"slug": "the-facility"
```

(leave every other generated field untouched).

- [ ] **Step 4: Install runtime deps**

```bash
npx expo install react-native-reanimated react-native-safe-area-context expo-font
npm i zustand @expo-google-fonts/space-grotesk @expo-google-fonts/ibm-plex-mono
```

Note: on current Expo SDKs, `babel-preset-expo` auto-configures the Reanimated plugin — do not hand-edit babel config. Verify with `npx expo-doctor` at the end of this task.

- [ ] **Step 5: Install test toolchain**

```bash
npm i -D jest jest-expo @types/jest @testing-library/react-native react-test-renderer
```

If `@testing-library/react-native` errors about the `react-test-renderer` version at test time, pin it to the exact `react` version from `package.json` (`npm i -D react-test-renderer@<react version>`).

- [ ] **Step 6: Configure jest in `package.json`**

Add at the top level:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

and to `"scripts"`: `"test": "jest"`.

- [ ] **Step 7: Create `jest.setup.ts`**

```ts
require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
```

- [ ] **Step 8: Write the smoke test**

`src/__tests__/smoke.test.ts`:

```ts
test('jest toolchain is wired', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 9: Verify toolchain**

```bash
npx tsc --noEmit
npm test
npx expo-doctor
```

Expected: tsc silent; jest `1 passed`; expo-doctor all checks pass (warnings about missing icons/splash assets are acceptable at this stage — the template ships defaults).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo app with test toolchain"
```

---

### Task 2: Design tokens + bundled fonts

**Files:**
- Create: `src/core/theme.ts`, `src/core/i18n.ts` (Lang type only — Task 3 finishes it), `assets/fonts/Pretendard-Medium.otf`, `assets/fonts/Pretendard-SemiBold.otf`, `assets/fonts/Pretendard-Bold.otf`
- Modify: `App.tsx` (font loading + temporary type-specimen screen)
- Test: `src/core/__tests__/theme.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `palette` — `{ dark: {...}, light: {...}, accent: {...} }` const object of hex strings
  - `tagSchemes: Record<'amber'|'orange'|'red'|'blue'|'green', { text: string; border: string; bg: string }>` and `type TagScheme`
  - `ms(px: number): number` — mock-px → dp for font sizes (×1.1, half-dp precision)
  - `font(role: 'display' | 'mono', weight: 500 | 600 | 700, lang?: Lang): string` — returns a loaded fontFamily name
  - `type Lang = 'en' | 'ko'` from `src/core/i18n.ts`
  - Font families loaded app-wide: `SpaceGrotesk_500Medium/600SemiBold/700Bold`, `IBMPlexMono_500Medium/600SemiBold`, `Pretendard-Medium/SemiBold/Bold`

- [ ] **Step 1: Download Pretendard static OTFs (self-hosted, per design README)**

```bash
SCRATCH=$(mktemp -d)
curl -L -o "$SCRATCH/pretendard.zip" https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
unzip -q "$SCRATCH/pretendard.zip" -d "$SCRATCH/pretendard"
mkdir -p assets/fonts
for w in Medium SemiBold Bold; do
  find "$SCRATCH/pretendard" -name "Pretendard-$w.otf" -exec cp {} assets/fonts/ \;
done
ls -la assets/fonts
```

Expected: the three OTFs present, each ~1–2 MB. (If the release URL 404s, use the latest release from https://github.com/orioncactus/pretendard/releases and the same static OTF names.)

- [ ] **Step 2: Create `src/core/i18n.ts` (Lang type only for now)**

```ts
export type Lang = 'en' | 'ko';
```

- [ ] **Step 3: Write the failing theme test**

`src/core/__tests__/theme.test.ts`:

```ts
import { font, ms, palette, tagSchemes } from '../theme';

test('ms scales mock px by 1.1 at half-dp precision', () => {
  expect(ms(10)).toBe(11);
  expect(ms(9)).toBe(10);
  expect(ms(8.5)).toBe(9.5);
  expect(ms(13)).toBe(14.5);
});

test('font maps role/weight to loaded families, Korean to Pretendard', () => {
  expect(font('display', 700)).toBe('SpaceGrotesk_700Bold');
  expect(font('display', 500, 'en')).toBe('SpaceGrotesk_500Medium');
  expect(font('mono', 500)).toBe('IBMPlexMono_500Medium');
  expect(font('mono', 700)).toBe('IBMPlexMono_600SemiBold'); // Plex Mono capped at 600
  expect(font('display', 700, 'ko')).toBe('Pretendard-Bold');
  expect(font('mono', 600, 'ko')).toBe('Pretendard-SemiBold');
});

test('token spot checks match design/README.md', () => {
  expect(palette.dark.bg).toBe('#14130f');
  expect(palette.light.bg).toBe('#ecebe4');
  expect(palette.accent.amber).toBe('#f4b43a');
  expect(tagSchemes.green.text).toBe('#2c9a63');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- theme`
Expected: FAIL — cannot find module `../theme`.

- [ ] **Step 5: Create `src/core/theme.ts`**

```ts
import type { Lang } from './i18n';

// Design tokens from design/README.md — final design intent, do not tweak.
export const palette = {
  // dark surfaces (V.E.R.A.'s domain)
  dark: {
    bg: '#14130f',
    bgAlt: '#17171a',
    card: '#1c1b17',
    cardHeader: '#201f1b',
    border: '#2c2a22',
    incineratorBg: '#120d0a',
    hazardBg: '#131011',
    fieldBg: '#0c1012',
    trayBg: '#131211',
    text: '#f2e7d3',
    textDim: '#8a8578',
    textFaint: '#77726a',
  },
  // light enamel (bureaucracy)
  light: {
    bg: '#ecebe4',
    card: '#faf9f6',
    cardAlt: '#f4f3ee',
    border: '#e4e1d7',
    borderStrong: '#dcd9cf',
    ink: '#17171a',
    inkSoft: '#3f3d37',
    textDim: '#8a8578',
    textFaint: '#b3aea1',
    vitrineBg: '#e7e5dd',
    vitrineBorder: '#c7c3b6',
    vitrineText: '#a49f92',
  },
  accent: {
    amber: '#f4b43a',
    orange: '#ff6a1a',
    red: '#d63a2a',
    redBright: '#ff5a48',
    green: '#4fd08a',
    blue: '#2f6fff',
    cyan: '#38c8c8',
    cyanBright: '#38f0e0',
  },
} as const;

// Tile tag pills on the facility grid (text / border / background per accent).
export const tagSchemes = {
  amber: { text: '#c98a17', border: '#f4b43a66', bg: '#f4b43a1c' },
  orange: { text: '#c2571a', border: '#ff6a1a66', bg: '#ff6a1a1c' },
  red: { text: '#c0281a', border: '#d63a2a66', bg: '#d63a2a1a' },
  blue: { text: '#2f6fff', border: '#2f6fff66', bg: '#2f6fff14' },
  green: { text: '#2c9a63', border: '#4fd08a88', bg: '#4fd08a22' },
} as const;
export type TagScheme = keyof typeof tagSchemes;

// The 388px mock maps ~1:1 to device dp for layout, but type scales ×1.1
// (design/README.md "Label style"). Use for font sizes only.
export const ms = (px: number) => Math.round(px * 1.1 * 2) / 2;

const display = {
  500: 'SpaceGrotesk_500Medium',
  600: 'SpaceGrotesk_600SemiBold',
  700: 'SpaceGrotesk_700Bold',
} as const;
const mono = {
  500: 'IBMPlexMono_500Medium',
  600: 'IBMPlexMono_600SemiBold',
  700: 'IBMPlexMono_600SemiBold',
} as const;
const hangul = {
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
} as const;

export type FontWeight = 500 | 600 | 700;

// RN has no CSS-style fallback chains, so localized text passes lang and
// Korean renders entirely in Pretendard (its Latin glyphs are fine).
// Pure-ASCII telemetry (timestamps, ids) omits lang and stays Plex Mono.
export const font = (role: 'display' | 'mono', weight: FontWeight, lang: Lang = 'en'): string =>
  lang === 'ko' ? hangul[weight] : role === 'display' ? display[weight] : mono[weight];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- theme`
Expected: PASS (3 tests).

- [ ] **Step 7: Load fonts in `App.tsx` with a temporary type specimen**

Replace `App.tsx` entirely:

```tsx
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { font, ms, palette } from './src/core/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: palette.dark.bg }} />;

  // Temporary type specimen — Task 8 replaces this with ScreenRouter.
  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, justifyContent: 'center', padding: 24, gap: 12 }}>
      <StatusBar style="light" />
      <Text style={{ fontFamily: font('display', 700), fontSize: ms(16), color: palette.dark.text }}>
        PERSONAL ENRICHMENT PROGRAM
      </Text>
      <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: palette.accent.amber }}>
        REC 00:00:09 · LIVE TRANSMISSION
      </Text>
      <Text style={{ fontFamily: font('display', 500, 'ko'), fontSize: ms(13), color: palette.dark.text }}>
        역량 강화 센터 — 준수 상태를 유지하십시오
      </Text>
    </View>
  );
}
```

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit
npm test
```

Expected: both pass. Optionally `npx expo start` and confirm on a device in Expo Go: three specimen lines render in three visibly different faces (grotesk display, mono, Hangul), no font-fallback boxes.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add design tokens and bundled fonts"
```

---

### Task 3: i18n core + shell strings

**Files:**
- Modify: `src/core/i18n.ts`
- Create: `src/shell/strings.ts`
- Test: `src/shell/__tests__/strings.test.ts`

**Interfaces:**
- Consumes: `Lang` from `src/core/i18n.ts`
- Produces:
  - `type Strings<T> = Record<Lang, T>` in `src/core/i18n.ts`
  - `shellStrings: Strings<ShellStrings>` — keys: `center, prefsWord, day01, goodStanding, live, pressComply, complySub, activeEvals, pendingAlloc, budgetPending, underConstruction, underConstructionBody` (all `string`)

- [ ] **Step 1: Write the failing test**

`src/shell/__tests__/strings.test.ts`:

```ts
import { shellStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(shellStrings.ko).sort()).toEqual(Object.keys(shellStrings.en).sort());
});

test('copy matches the prototype STR tables verbatim', () => {
  expect(shellStrings.en.center).toBe('ENRICHMENT CENTER');
  expect(shellStrings.en.complySub).toBe('daily · do not miss · infractions are permanent');
  expect(shellStrings.ko.center).toBe('역량 강화 센터');
  expect(shellStrings.ko.goodStanding).toBe('양호 상태');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- strings`
Expected: FAIL — cannot find module `../strings`.

- [ ] **Step 3: Extend `src/core/i18n.ts`**

```ts
export type Lang = 'en' | 'ko';

export type Strings<T> = Record<Lang, T>;
```

- [ ] **Step 4: Create `src/shell/strings.ts`**

All copy verbatim from `STR.en` / `STR.ko` in `design/The Facility.dc.html`, except the two `underConstruction*` keys, which are new phase-1 copy for placeholder screens (in V.E.R.A.'s voice; ko needs the standard native-speaker pass later):

```ts
import type { Strings } from '../core/i18n';

const en = {
  center: 'ENRICHMENT CENTER',
  prefsWord: 'PREFERENCES',
  day01: 'DAY 01',
  goodStanding: 'GOOD STANDING',
  live: 'LIVE TRANSMISSION',
  pressComply: 'PRESS TO REMAIN COMPLIANT',
  complySub: 'daily · do not miss · infractions are permanent',
  activeEvals: 'ACTIVE EVALUATIONS',
  pendingAlloc: 'PENDING ALLOCATION',
  budgetPending: 'BUDGET PENDING',
  underConstruction: 'UNDER CONSTRUCTION',
  underConstructionBody:
    'This chamber is not yet ready. Your eagerness has been noted and will be used against you.',
};

export type ShellStrings = typeof en;

const ko: ShellStrings = {
  center: '역량 강화 센터',
  prefsWord: '환경설정',
  day01: '1일차',
  goodStanding: '양호 상태',
  live: '실시간 송출',
  pressComply: '준수 상태를 유지하려면 누르십시오',
  complySub: '매일 · 누락 금지 · 위반은 영구히 기록됩니다',
  activeEvals: '활성 평가',
  pendingAlloc: '배정 대기',
  budgetPending: '예산 대기',
  underConstruction: '공사 중',
  underConstructionBody:
    '이 구역은 아직 준비되지 않았습니다. 귀하의 열의는 기록되었으며, 추후 불리하게 사용될 예정입니다.',
};

export const shellStrings: Strings<ShellStrings> = { en, ko };
```

(The `const ko: ShellStrings` annotation makes missing/extra keys a compile error — the runtime test is a belt-and-braces check.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- strings`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/i18n.ts src/shell
git commit -m "feat: add i18n core and shell strings"
```

---

### Task 4: Zustand store — the `step` state machine

**Files:**
- Create: `src/core/store.ts`
- Test: `src/core/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `Lang` from `src/core/i18n.ts`
- Produces:
  - `STEPS` const tuple and `type Step` — `'intake' | 'baseline' | 'consent' | 'assigned' | 'permission' | 'facility' | 'settings' | 'daily' | 'missed' | 'results' | 'incinerator' | 'field' | 'organism' | 'hazard' | 'notiflog'`
  - `useFacilityStore` — Zustand hook with state `{ step: Step; lang: Lang }` and actions `setStep(step: Step): void`, `setLang(lang: Lang): void`
  - Test convention for later tasks: reset with `useFacilityStore.setState({ step: 'facility', lang: 'en' })` in `beforeEach`

- [ ] **Step 1: Write the failing test**

`src/core/__tests__/store.test.ts`:

```ts
import { STEPS, useFacilityStore } from '../store';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

test('boots to facility (phase 2 adds the enrollment gate)', () => {
  expect(useFacilityStore.getState().step).toBe('facility');
  expect(useFacilityStore.getState().lang).toBe('en');
});

test('setStep reaches every known step', () => {
  for (const step of STEPS) {
    useFacilityStore.getState().setStep(step);
    expect(useFacilityStore.getState().step).toBe(step);
  }
});

test('setLang switches language', () => {
  useFacilityStore.getState().setLang('ko');
  expect(useFacilityStore.getState().lang).toBe('ko');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- store`
Expected: FAIL — cannot find module `../store`.

- [ ] **Step 3: Create `src/core/store.ts`**

```ts
import { create } from 'zustand';
import type { Lang } from './i18n';

// The prototype routes every screen on this single value; conditional
// rendering on `step` IS the router (docs/architecture.md).
export const STEPS = [
  'intake',
  'baseline',
  'consent',
  'assigned',
  'permission',
  'facility',
  'settings',
  'daily',
  'missed',
  'results',
  'incinerator',
  'field',
  'organism',
  'hazard',
  'notiflog',
] as const;
export type Step = (typeof STEPS)[number];

interface FacilityState {
  step: Step;
  lang: Lang;
  setStep: (step: Step) => void;
  setLang: (lang: Lang) => void;
}

// Phase 2 replaces the initial step with the first-run gate
// (enrolled → 'facility', else 'intake') backed by mmkv.
export const useFacilityStore = create<FacilityState>((set) => ({
  step: 'facility',
  lang: 'en',
  setStep: (step) => set({ step }),
  setLang: (lang) => set({ lang }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- store`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core
git commit -m "feat: add facility store with step state machine"
```

---

### Task 5: Module registry + placeholder module screens

**Files:**
- Create: `src/modules/types.ts`, `src/modules/registry.ts`, `src/shell/PlaceholderScreen.tsx`, `src/modules/field/index.tsx`, `src/modules/organism/index.tsx`, `src/modules/hazard/index.tsx`, `src/modules/results/index.tsx`, `src/modules/incinerator/index.tsx`
- Test: `src/modules/__tests__/registry.test.tsx`

**Interfaces:**
- Consumes: `useFacilityStore` (Task 4), `shellStrings` (Task 3), `font/ms/palette/TagScheme` (Task 2)
- Produces:
  - `type ModuleId = 'results' | 'incinerator' | 'field' | 'organism' | 'hazard'`
  - `interface TileData { title: string; sub: string; tag: string; tagScheme: TagScheme }`
  - `interface ModuleDef { id: ModuleId; layout: 'square' | 'wide'; Icon: ComponentType; tile: (lang: Lang) => TileData; Screen: ComponentType }`
  - `interface LockedSlot { id: string; locked: true; opacity: number }`
  - `registry: RegistryEntry[]` (ordered: field, organism, hazard, results, incinerator, 2 locked slots) and `isLocked(e): e is LockedSlot`
  - `PlaceholderScreen({ title: string })` — dark screen, back arrow (accessibilityLabel `"back"`) → `setStep('facility')`

- [ ] **Step 1: Write the failing tests**

`src/modules/__tests__/registry.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import { isLocked, registry } from '../registry';
import type { ModuleDef } from '../types';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

const active = registry.filter((e): e is ModuleDef => !isLocked(e));

test('registry lists the five evaluations in home-grid order plus two locked slots', () => {
  expect(active.map((m) => m.id)).toEqual(['field', 'organism', 'hazard', 'results', 'incinerator']);
  expect(registry.filter(isLocked)).toHaveLength(2);
});

test('only the incinerator tile is wide', () => {
  expect(active.filter((m) => m.layout === 'wide').map((m) => m.id)).toEqual(['incinerator']);
});

test('tiles localize', () => {
  const field = active.find((m) => m.id === 'field')!;
  expect(field.tile('en')).toEqual({ title: 'FIELD TRIAL', sub: 'proceed as directed', tag: 'ACTIVE', tagScheme: 'amber' });
  expect(field.tile('ko').title).toBe('현장 시험');
});

test('placeholder back arrow returns to facility', () => {
  useFacilityStore.setState({ step: 'field' });
  render(<PlaceholderScreen title="FIELD TRIAL" />);
  fireEvent.press(screen.getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- registry`
Expected: FAIL — cannot find module `../registry`.

- [ ] **Step 3: Create `src/modules/types.ts`**

```ts
import type { ComponentType } from 'react';
import type { Lang } from '../core/i18n';
import type { TagScheme } from '../core/theme';

export type ModuleId = 'results' | 'incinerator' | 'field' | 'organism' | 'hazard';

export interface TileData {
  title: string;
  sub: string;
  tag: string;
  tagScheme: TagScheme;
}

// The contract from docs/architecture.md: a new toy = a new folder in
// modules/ exporting one of these + one registry line. Nothing else changes.
export interface ModuleDef {
  id: ModuleId;
  layout: 'square' | 'wide'; // wide spans both home-grid columns
  Icon: ComponentType; // rendered inside the 32×32 dark icon box
  tile: (lang: Lang) => TileData;
  Screen: ComponentType;
}

// "Budget pending" vitrines on the home grid are registry entries too.
export interface LockedSlot {
  id: string;
  locked: true;
  opacity: number;
}

export type RegistryEntry = ModuleDef | LockedSlot;
```

- [ ] **Step 4: Create `src/shell/PlaceholderScreen.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { shellStrings } from './strings';

// Stand-in for screens that arrive in later phases. Matches the module
// header pattern from the prototype (back arrow → facility).
export function PlaceholderScreen({ title }: { title: string }) {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = shellStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2a2820',
        }}
      >
        <Pressable
          hitSlop={12}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8168' }}>◂</Text>
        </Pressable>
        <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{title}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
        <Text
          style={{
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.accent.amber,
          }}
        >
          {t.underConstruction}
        </Text>
        <Text
          style={{
            fontFamily: font('display', 500, lang),
            fontSize: ms(13),
            lineHeight: ms(13) * 1.6,
            color: palette.dark.text,
            textAlign: 'center',
          }}
        >
          {t.underConstructionBody}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Create the five module folders**

Tile copy is verbatim from the prototype `STR` tables; icons reproduce the mock's icon-box contents (three are emoji in the mock itself; field and hazard are drawn). Each Screen is a placeholder until phase 4.

`src/modules/field/index.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
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

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const field: ModuleDef = {
  id: 'field',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'amber' }),
  Screen,
};
```

`src/modules/organism/index.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'SUPPORT ORGANISM', sub: 'specimen-03', tag: 'HUNGRY' },
  ko: { title: '지원 유기체', sub: '표본-03', tag: '공복' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🐼</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const organism: ModuleDef = {
  id: 'organism',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'orange' }),
  Screen,
};
```

`src/modules/hazard/index.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'HAZARD ASSESSMENT', sub: 'entity census', tag: '4 ⚠' },
  ko: { title: '위험 평가', sub: '개체 조사', tag: '4 ⚠' },
} as const;

// Mock: 13px red-bordered rounded square.
function Icon() {
  return <View style={{ width: 13, height: 13, borderWidth: 1.5, borderColor: palette.accent.red, borderRadius: 3 }} />;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const hazard: ModuleDef = {
  id: 'hazard',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'red' }),
  Screen,
};
```

`src/modules/results/index.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'RESULTS PENDING', sub: '#8,442,105', tag: 'QUEUED' },
  ko: { title: '결과 대기', sub: '#8,442,105', tag: '대기열' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 14, color: '#b9b09a' }}>⌛</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const results: ModuleDef = {
  id: 'results',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'blue' }),
  Screen,
};
```

`src/modules/incinerator/index.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'THE INCINERATOR', sub: 'disposal services', tag: 'READY' },
  ko: { title: '소각로', sub: '폐기 처리', tag: '준비됨' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🔥</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const incinerator: ModuleDef = {
  id: 'incinerator',
  layout: 'wide',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'green' }),
  Screen,
};
```

- [ ] **Step 6: Create `src/modules/registry.ts`**

```ts
import { field } from './field';
import { hazard } from './hazard';
import { incinerator } from './incinerator';
import { organism } from './organism';
import { results } from './results';
import type { LockedSlot, RegistryEntry } from './types';

// Home-grid order from the mock: field, organism, hazard, results,
// incinerator (wide row), then two dashed "budget pending" vitrines.
export const registry: RegistryEntry[] = [
  field,
  organism,
  hazard,
  results,
  incinerator,
  { id: 'slot-6', locked: true, opacity: 0.85 },
  { id: 'slot-7', locked: true, opacity: 0.65 },
];

export const isLocked = (e: RegistryEntry): e is LockedSlot => 'locked' in e;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- registry`
Expected: PASS (4 tests).

- [ ] **Step 8: Verify types and full suite**

```bash
npx tsc --noEmit
npm test
```

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add src/modules src/shell/PlaceholderScreen.tsx
git commit -m "feat: add module registry with placeholder evaluation screens"
```

---

### Task 6: V.E.R.A. seam + transmission panel

**Files:**
- Create: `src/vera/index.ts`, `src/shell/components/VeraPanel.tsx`
- Test: `src/vera/__tests__/vera.test.ts`, `src/shell/components/__tests__/VeraPanel.test.tsx`

**Interfaces:**
- Consumes: `Lang` (Task 2/3), `shellStrings` (Task 3), theme (Task 2)
- Produces:
  - `interface TransmissionContext { screen: 'facility'; lang: Lang }` (the `screen` union widens as later phases add screens)
  - `getTransmission(ctx: TransmissionContext): string`
  - `VeraPanel({ line, lang, rec? })` — dark card: LIVE header with 1.4s pulsing amber dot, REC timestamp, 3px orange left border, transmission line

- [ ] **Step 1: Write the failing tests**

`src/vera/__tests__/vera.test.ts`:

```ts
import { getTransmission } from '..';

test('returns the authored facility line per language', () => {
  expect(getTransmission({ screen: 'facility', lang: 'en' })).toBe(
    'You made it. I never doubted you. That is a lie, but a supportive one.',
  );
  expect(getTransmission({ screen: 'facility', lang: 'ko' })).toBe(
    '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  );
});
```

`src/shell/components/__tests__/VeraPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { VeraPanel } from '../VeraPanel';

test('renders the transmission line, LIVE label, and REC stamp', () => {
  render(<VeraPanel line="Testing is mandatory." lang="en" />);
  expect(screen.getByText('Testing is mandatory.')).toBeTruthy();
  expect(screen.getByText('LIVE TRANSMISSION')).toBeTruthy();
  expect(screen.getByText('REC 00:00:09')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- vera`
Expected: both files FAIL — cannot find module.

- [ ] **Step 3: Create `src/vera/index.ts`**

```ts
import type { Lang } from '../core/i18n';

export interface TransmissionContext {
  screen: 'facility'; // widens as later phases add screens
  lang: Lang;
}

// v1: authored corpus (from the prototype's STR tables). If a live LLM ever
// lands, it goes behind this same signature — callers never know
// (docs/architecture.md "V.E.R.A.'s brain").
const corpus = {
  facility: {
    en: 'You made it. I never doubted you. That is a lie, but a supportive one.',
    ko: '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  },
} as const;

export function getTransmission(ctx: TransmissionContext): string {
  return corpus[ctx.screen][ctx.lang];
}
```

- [ ] **Step 4: Create `src/shell/components/VeraPanel.tsx`**

Mock reference: facility screen card — bg `#17171a`, header row bg `#201f1b` with amber pulsing dot (`fpulse` 1.4s), body `border-left: 3px solid #ff6a1a`, line `font: 500 13px/1.6` color `#f2e7d3`.

```tsx
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { shellStrings } from '../strings';

export function VeraPanel({ line, lang, rec = 'REC 00:00:09' }: { line: string; lang: Lang; rec?: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    // 700ms there + reverse = the mock's 1.4s fpulse cycle
    pulse.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const t = shellStrings[lang];

  return (
    <View style={{ backgroundColor: palette.dark.bgAlt, borderRadius: 14, overflow: 'hidden', elevation: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 9,
          paddingHorizontal: 13,
          backgroundColor: palette.dark.cardHeader,
          borderBottomWidth: 1,
          borderBottomColor: '#000',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Animated.View
            style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }, dotStyle]}
          />
          <Text
            style={{
              fontFamily: font('mono', 600, lang),
              fontSize: ms(8.5),
              letterSpacing: ms(8.5) * 0.1,
              color: palette.accent.amber,
            }}
          >
            {t.live}
          </Text>
        </View>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(8.5), color: palette.dark.textFaint }}>{rec}</Text>
      </View>
      <View
        style={{
          paddingTop: 14,
          paddingHorizontal: 15,
          paddingBottom: 15,
          borderLeftWidth: 3,
          borderLeftColor: palette.accent.orange,
        }}
      >
        <Text
          style={{
            fontFamily: font('display', 500, lang),
            fontSize: ms(13),
            lineHeight: ms(13) * 1.6,
            color: palette.dark.text,
          }}
        >
          {line}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- vera`
Expected: PASS (2 files).

- [ ] **Step 6: Commit**

```bash
git add src/vera src/shell/components
git commit -m "feat: add V.E.R.A. transmission seam and panel"
```

---

### Task 7: FacilityScreen — the launcher home

**Files:**
- Create: `src/shell/FacilityScreen.tsx`
- Test: `src/shell/__tests__/FacilityScreen.test.tsx`

**Interfaces:**
- Consumes: `useFacilityStore` (Task 4), `shellStrings` (Task 3), `registry`/`isLocked` (Task 5), `getTransmission` + `VeraPanel` (Task 6), theme (Task 2)
- Produces: `FacilityScreen()` — no props; reads everything from the store and registry

Visual reference: `design/screenshots/06-facility.png` and the `data-screen-label="Facility"` block (lines 281–353) of `design/The Facility.dc.html`. Layout values below are the mock's px (1:1 dp); font sizes go through `ms()`.

- [ ] **Step 1: Write the failing tests**

`src/shell/__tests__/FacilityScreen.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { FacilityScreen } from '../FacilityScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

test('renders identity, transmission, tiles, and locked vitrines', () => {
  render(<FacilityScreen />);
  expect(screen.getByText(/SUBJECT #50640/)).toBeTruthy();
  expect(screen.getByText('You made it. I never doubted you. That is a lie, but a supportive one.')).toBeTruthy();
  for (const title of ['FIELD TRIAL', 'SUPPORT ORGANISM', 'HAZARD ASSESSMENT', 'RESULTS PENDING', 'THE INCINERATOR']) {
    expect(screen.getByText(title)).toBeTruthy();
  }
  expect(screen.getAllByText('BUDGET PENDING')).toHaveLength(2);
});

test('tiles, comply card, and gear route via setStep', () => {
  render(<FacilityScreen />);
  fireEvent.press(screen.getByText('FIELD TRIAL'));
  expect(useFacilityStore.getState().step).toBe('field');

  useFacilityStore.setState({ step: 'facility' });
  fireEvent.press(screen.getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('daily');

  useFacilityStore.setState({ step: 'facility' });
  fireEvent.press(screen.getByText('PREFERENCES'));
  expect(useFacilityStore.getState().step).toBe('settings');
});

test('renders Korean when lang is ko', () => {
  useFacilityStore.setState({ lang: 'ko' });
  render(<FacilityScreen />);
  expect(screen.getByText('현장 시험')).toBeTruthy();
  expect(screen.getByText('역량 강화 센터')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FacilityScreen`
Expected: FAIL — cannot find module `../FacilityScreen`.

- [ ] **Step 3: Create `src/shell/FacilityScreen.tsx`**

```tsx
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, tagSchemes } from '../core/theme';
import { isLocked, registry } from '../modules/registry';
import type { LockedSlot, ModuleDef, TileData } from '../modules/types';
import { getTransmission } from '../vera';
import { VeraPanel } from './components/VeraPanel';
import { shellStrings } from './strings';
import type { Lang } from '../core/i18n';

function TagPill({ tile, lang }: { tile: TileData; lang: Lang }) {
  const c = tagSchemes[tile.tagScheme];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 20,
      }}
    >
      <Text
        style={{
          fontFamily: font('mono', 600, lang),
          fontSize: ms(7.5),
          letterSpacing: ms(7.5) * 0.06,
          color: c.text,
        }}
      >
        {tile.tag}
      </Text>
    </View>
  );
}

function IconBox({ Icon }: { Icon: ModuleDef['Icon'] }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: palette.light.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon />
    </View>
  );
}

const tileFrame = {
  backgroundColor: palette.light.card,
  borderWidth: 1,
  borderColor: palette.light.border,
  borderRadius: 16,
} as const;

function TileTitle({ tile, lang }: { tile: TileData; lang: Lang }) {
  return (
    <View>
      <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), lineHeight: ms(13) * 1.15, color: palette.light.ink }}>
        {tile.title}
      </Text>
      <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: palette.light.textDim }}>
        {tile.sub}
      </Text>
    </View>
  );
}

function SquareTile({ def, lang, onPress }: { def: ModuleDef; lang: Lang; onPress: () => void }) {
  const tile = def.tile(lang);
  return (
    <Pressable
      onPress={onPress}
      style={{ ...tileFrame, flex: 1, paddingVertical: 15, paddingHorizontal: 14, height: 126, justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <IconBox Icon={def.Icon} />
        <TagPill tile={tile} lang={lang} />
      </View>
      <TileTitle tile={tile} lang={lang} />
    </Pressable>
  );
}

function WideTile({ def, lang, onPress }: { def: ModuleDef; lang: Lang; onPress: () => void }) {
  const tile = def.tile(lang);
  return (
    <Pressable onPress={onPress} style={{ ...tileFrame, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <IconBox Icon={def.Icon} />
      <View style={{ flex: 1 }}>
        <TileTitle tile={tile} lang={lang} />
      </View>
      <TagPill tile={tile} lang={lang} />
    </Pressable>
  );
}

function LockedVitrine({ slot, label, lang }: { slot: LockedSlot; label: string; lang: Lang }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.light.vitrineBg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: palette.light.vitrineBorder,
        borderRadius: 16,
        height: 92,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: slot.opacity,
      }}
    >
      <Text style={{ fontSize: 15, color: palette.light.vitrineText }}>🔒</Text>
      <Text
        style={{
          fontFamily: font('mono', 600, lang),
          fontSize: ms(7.5),
          letterSpacing: ms(7.5) * 0.08,
          color: palette.light.vitrineText,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function FacilityScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = shellStrings[lang];

  const active = registry.filter((e): e is ModuleDef => !isLocked(e));
  const squares = active.filter((m) => m.layout === 'square');
  const wides = active.filter((m) => m.layout === 'wide');
  const locked = registry.filter(isLocked);
  const squareRows: ModuleDef[][] = [];
  for (let i = 0; i < squares.length; i += 2) squareRows.push(squares.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      {/* header (sticky in the mock → fixed above the scroll here) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 11,
          paddingBottom: 9,
          borderBottomWidth: 1,
          borderBottomColor: palette.light.borderStrong,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }} />
          <Text
            style={{
              fontFamily: font('mono', 600, lang),
              fontSize: ms(9),
              letterSpacing: ms(9) * 0.06,
              color: palette.light.inkSoft,
            }}
          >
            {t.center}
          </Text>
        </View>
        <Pressable
          onPress={() => setStep('settings')}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>
            {t.prefsWord}
          </Text>
          <Text style={{ fontSize: ms(13), color: palette.light.textDim }}>⚙</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
        {/* identity row */}
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              backgroundColor: palette.light.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: palette.accent.amber }} />
            <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.accent.amber }} />
          </View>
          <View style={{ flex: 1 }}>
            {/* "Dana" is the mock's sample designation — phase 2 wires the baseline form's value */}
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(16), color: palette.light.ink }}>Dana</Text>
            <Text
              style={{
                marginTop: 4,
                fontFamily: font('mono', 500, lang),
                fontSize: ms(9),
                letterSpacing: ms(9) * 0.04,
                color: palette.light.textDim,
              }}
            >
              SUBJECT #50640 · {t.day01}
            </Text>
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#2f6fff55',
              backgroundColor: '#2f6fff12',
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontFamily: font('mono', 600, lang),
                fontSize: ms(8.5),
                letterSpacing: ms(8.5) * 0.06,
                color: palette.accent.blue,
              }}
            >
              ● {t.goodStanding}
            </Text>
          </View>
        </View>

        {/* V.E.R.A. transmission */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View
            style={{
              width: 14,
              height: 14,
              backgroundColor: palette.light.ink,
              transform: [{ rotate: '45deg' }],
              marginLeft: 22,
              marginBottom: -7,
            }}
          />
          <VeraPanel line={getTransmission({ screen: 'facility', lang })} lang={lang} />
        </View>

        {/* daily comply card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Pressable
            onPress={() => setStep('daily')}
            style={{
              backgroundColor: palette.light.ink,
              borderRadius: 15,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              elevation: 8,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text
                style={{
                  fontFamily: font('display', 700, lang),
                  fontSize: ms(14),
                  letterSpacing: ms(14) * 0.02,
                  color: '#ffffff',
                }}
              >
                {t.pressComply}
              </Text>
              <Text style={{ marginTop: 5, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>
                {t.complySub}
              </Text>
            </View>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: palette.accent.orange,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 17 }}>▶</Text>
            </View>
          </Pressable>
        </View>

        {/* active evaluations grid (registry-driven) */}
        <Text
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.light.textDim,
          }}
        >
          {t.activeEvals}
        </Text>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {squareRows.map((row) => (
            <View key={row[0].id} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((def) => (
                <SquareTile key={def.id} def={def} lang={lang} onPress={() => setStep(def.id)} />
              ))}
            </View>
          ))}
          {wides.map((def) => (
            <WideTile key={def.id} def={def} lang={lang} onPress={() => setStep(def.id)} />
          ))}
        </View>

        {/* pending allocation vitrines */}
        <Text
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 10,
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.light.textFaint,
          }}
        >
          {t.pendingAlloc}
        </Text>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          {locked.map((slot) => (
            <LockedVitrine key={slot.id} slot={slot} label={t.budgetPending} lang={lang} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- FacilityScreen`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify types and full suite**

```bash
npx tsc --noEmit
npm test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/shell
git commit -m "feat: add facility launcher home screen"
```

---

### Task 8: ScreenRouter + app entry, device verification

**Files:**
- Create: `src/shell/ScreenRouter.tsx`
- Modify: `App.tsx` (replace the Task 2 type specimen with the router)
- Test: `src/shell/__tests__/ScreenRouter.test.tsx`

**Interfaces:**
- Consumes: everything above
- Produces: `ScreenRouter()` — renders the screen for `store.step` plus a mood-matched status bar; `App` = fonts → `SafeAreaProvider` → `ScreenRouter`

- [ ] **Step 1: Write the failing test**

`src/shell/__tests__/ScreenRouter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

test('facility step renders the launcher home', () => {
  render(<ScreenRouter />);
  expect(screen.getByText(/SUBJECT #50640/)).toBeTruthy();
});

test('module steps render their (placeholder) screens', () => {
  useFacilityStore.setState({ step: 'field' });
  render(<ScreenRouter />);
  expect(screen.getByText('FIELD TRIAL')).toBeTruthy();
  expect(screen.getByText('UNDER CONSTRUCTION')).toBeTruthy();
});

test('not-yet-built shell steps fall back to a placeholder', () => {
  useFacilityStore.setState({ step: 'settings' });
  render(<ScreenRouter />);
  expect(screen.getByText('SETTINGS')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ScreenRouter`
Expected: FAIL — cannot find module `../ScreenRouter`.

- [ ] **Step 3: Create `src/shell/ScreenRouter.tsx`**

```tsx
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useFacilityStore } from '../core/store';
import { isLocked, registry } from '../modules/registry';
import type { ModuleDef } from '../modules/types';
import { FacilityScreen } from './FacilityScreen';
import { PlaceholderScreen } from './PlaceholderScreen';

// Conditional rendering IS the router (docs/architecture.md): instant swaps
// on a single step value, no navigation library.
export function ScreenRouter() {
  const step = useFacilityStore((s) => s.step);

  // Light-enamel screens get dark status icons; V.E.R.A.'s dark screens, light.
  const bar = <StatusBar style={step === 'facility' ? 'dark' : 'light'} />;

  if (step === 'facility') {
    return (
      <>
        {bar}
        <FacilityScreen />
      </>
    );
  }

  const mod = registry.find((e): e is ModuleDef => !isLocked(e) && e.id === step);
  return (
    <>
      {bar}
      {mod ? <mod.Screen /> : <PlaceholderScreen title={step.toUpperCase()} />}
      {/* non-module steps (settings, daily, enrollment, …) arrive in phases 2–3 */}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ScreenRouter`
Expected: PASS (3 tests).

- [ ] **Step 5: Point `App.tsx` at the router**

Replace the type-specimen return (keep the font loading exactly as is):

```tsx
import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from './src/core/theme';
import { ScreenRouter } from './src/shell/ScreenRouter';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: palette.dark.bg }} />;

  return (
    <SafeAreaProvider>
      <ScreenRouter />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 6: Full automated verification**

```bash
npx tsc --noEmit
npm test
```

Expected: all suites pass (smoke, theme, strings, store, registry, vera, VeraPanel, FacilityScreen, ScreenRouter).

- [ ] **Step 7: Manual device verification (Expo Go)**

Run `npx expo start`, open in Expo Go on the phone, and check against `design/screenshots/06-facility.png`:

- Boots straight to the light-enamel facility screen; dark status-bar icons.
- Header: amber dot + ENRICHMENT CENTER; PREFERENCES ⚙ opens a dark placeholder titled SETTINGS; its ◂ returns home.
- Identity row: dark avatar with amber optic ring, "Dana", "SUBJECT #50640 · DAY 01", blue GOOD STANDING pill.
- V.E.R.A. card: speech-tail diamond, pulsing amber LIVE dot (~1.4s), orange left border, correct line.
- Comply card routes to a DAILY placeholder.
- Grid: field/organism/hazard/results squares (correct tags and colors), wide incinerator row, two dashed BUDGET PENDING vitrines at different opacities.
- Every tile opens its placeholder (title matches tile) and ◂ returns home. No stuck screens.
- No font-fallback glyph boxes anywhere.

Fix anything that deviates from the screenshot before committing.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire step router into app entry"
```

---

## Out of scope for phase 1 (per build order in docs/architecture.md)

- Enrollment flow + first-run gate + mmkv persistence → phase 2
- Daily loop mechanics, streak/standing, missed-day, notifications → phase 3
- Real module screens (Skia centerpieces, sensors, Overpass) → phase 4
- Settings, transmission log, Korean comedy pass, EAS build → phase 5
- Device-locale language default (`expo-localization`) → phase 2 (baseline step owns language)
