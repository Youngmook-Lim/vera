# Phase 2: Enrollment Flow + First-Run Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the one-time enrollment flow (intake → baseline → consent → assigned → permission) with a persisted first-run gate, so a fresh install plays enrollment once and every later launch boots straight to the facility.

**Architecture:** Five new shell screens routed by the existing `step` state machine. Persistence lands behind a new `core/storage.ts` seam (AsyncStorage today — user decision 2026-07-17 — mmkv swappable later without touching callers). The store gains enrollment fields + a `hydrate()` boot action that reads the gate before first render. V.E.R.A.'s enrollment lines extend the existing `getTransmission` corpus.

**Tech Stack:** Existing phase 1 stack + `@react-native-async-storage/async-storage`, `expo-localization`, `expo-linear-gradient`, `@react-native-community/slider`, `expo-notifications`.

## Global Constraints

- Everything in phase 1's plan still holds: copy verbatim from prototype `STR` tables, hexes from `design/README.md`, `ms()` for type / raw mock px for layout, no navigation library, commits without AI attribution.
- **Stays Expo Go-runnable.** Every new package here is included in Expo Go. Do NOT install mmkv or skia.
- **RTL v14 is async:** every test uses `await render(...)` and `await fireEvent.press(...)`; no global `screen` — use queries destructured from `render`.
- **Prototype reference:** enrollment markup is `design/The Facility.dc.html` lines 52–277; logic/actions lines 1109–1130 (`optCard`, `tick`, `declinePos`, `finishEnroll`) and 1196–1357 (`renderVals`); screenshots `design/screenshots/01-intake.png` … `05-permission.png`.
- **Storage keys** (verbatim, versioned like the prototype's): `facility.enrolled.v1`, `facility.lang.v1`, `facility.notif.v1`.
- V.E.R.A. dialogue lines live in the `src/vera` corpus, not in string tables (phase 1 convention).
- Screen transitions are instant swaps (design README) — do not add route animations.
- During enrollment, Android hardware back does nothing ("Enrollment is not optional."): consume the event without navigating.
- The permission screen's OS dialog is **drawn in-fiction** (design intent). Its Allow button additionally fires the real `expo-notifications` permission request, best-effort (`try/catch` — in Expo Go the prompt belongs to Expo Go itself; never let it block enrollment).

## File Structure (phase 2 additions)

```
src/core/storage.ts                      # async get/set/remove seam + KEYS
src/core/store.ts                        # MODIFY: enrollment fields, hydrate(), finishEnroll()
src/core/i18n.ts                         # MODIFY: add tmpl()
src/vera/index.ts                        # MODIFY: intake/baseline/assigned/permission lines
src/shell/enrollment/strings.ts          # enrollment copy, en/ko
src/shell/enrollment/IntakeScreen.tsx
src/shell/enrollment/BaselineScreen.tsx
src/shell/enrollment/ConsentScreen.tsx
src/shell/enrollment/AssignedScreen.tsx
src/shell/enrollment/PermissionScreen.tsx
src/shell/components/AmberButton.tsx     # amber CTA (4 screens)
src/shell/components/EnrollHeader.tsx    # orb + ENRICHMENT CENTER + right label, dark/light
src/shell/components/OpticEye.tsx        # V.E.R.A.'s eye (intake 150, permission 104)
src/shell/components/Scanline.tsx        # amber sweep overlay (dark screens)
src/shell/components/VeraPanel.tsx       # MODIFY: optional blinking cursor
src/shell/ScreenRouter.tsx               # MODIFY: 5 new steps, back policy, status bar moods
App.tsx                                  # MODIFY: gate first render on hydrate()
jest.setup.ts                            # MODIFY: AsyncStorage mock
CLAUDE.md                                # MODIFY (final task): check off phase 2
```

---

### Task 1: Storage seam + store enrollment state + boot hydration

**Files:**
- Create: `src/core/storage.ts`
- Modify: `src/core/store.ts`, `src/core/__tests__/store.test.ts` (replace the boot test), `App.tsx`, `jest.setup.ts`
- Test: `src/core/__tests__/store.test.ts`, `src/core/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: phase 1 `useFacilityStore`, `Step`, `Lang`
- Produces:
  - `storage.get(key: string): Promise<string | null>`, `storage.set(key: string, value: string): Promise<void>`, `storage.remove(key: string): Promise<void>`, `KEYS = { enrolled: 'facility.enrolled.v1', lang: 'facility.lang.v1', notif: 'facility.notif.v1' }`
  - Store fields: `hydrated: boolean` (false), `adequacy: number` (64), `motive: number` (1), `decline: number` (0), `poked: boolean` (false), `permDenied: boolean` (false), `notif: boolean` (true); initial `step` is now `'intake'`
  - Store actions: `setAdequacy(n: number)`, `setMotive(n: number)`, `nudgeDecline()`, `poke()`, `denyPermission()` (sets `permDenied: true, notif: false`), `setNotif(v: boolean)`, `finishEnroll(): Promise<void>` (persists enrolled/lang/notif, then `step: 'facility'`), `hydrate(): Promise<void>` (reads keys + device locale, sets `step`/`lang`/`notif`/`hydrated`)
  - `setLang` now also persists to `KEYS.lang`

- [ ] **Step 1: Install packages**

```bash
npx expo install @react-native-async-storage/async-storage expo-localization
```

- [ ] **Step 2: Add the AsyncStorage jest mock to `jest.setup.ts`** (append at the end)

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

- [ ] **Step 3: Write the failing storage test**

`src/core/__tests__/storage.test.ts`:

```ts
import { KEYS, storage } from '../storage';

test('round-trips values and exposes the prototype key names', async () => {
  expect(KEYS.enrolled).toBe('facility.enrolled.v1');
  await storage.set(KEYS.enrolled, '1');
  expect(await storage.get(KEYS.enrolled)).toBe('1');
  await storage.remove(KEYS.enrolled);
  expect(await storage.get(KEYS.enrolled)).toBeNull();
});
```

- [ ] **Step 4: Run it — expect FAIL** (`npm test -- storage`): cannot find module `../storage`.

- [ ] **Step 5: Create `src/core/storage.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  enrolled: 'facility.enrolled.v1',
  lang: 'facility.lang.v1',
  notif: 'facility.notif.v1',
} as const;

// Seam over the storage engine (AsyncStorage today; mmkv could replace it
// after a dev build lands — docs/architecture.md). Callers never import the
// engine directly.
export const storage = {
  get: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  set: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  remove: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
```

- [ ] **Step 6: Run it — expect PASS** (`npm test -- storage`).

- [ ] **Step 7: Update the store test.** In `src/core/__tests__/store.test.ts`, replace the whole file:

```ts
import { STEPS, useFacilityStore } from '../store';
import { KEYS, storage } from '../storage';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
const { getLocales } = jest.requireMock('expo-localization');

beforeEach(async () => {
  await storage.remove(KEYS.enrolled);
  await storage.remove(KEYS.lang);
  await storage.remove(KEYS.notif);
  getLocales.mockReturnValue([{ languageCode: 'en' }]);
  useFacilityStore.setState({
    step: 'intake', lang: 'en', hydrated: false,
    adequacy: 64, motive: 1, decline: 0, poked: false, permDenied: false, notif: true,
  });
});

test('setStep reaches every known step', () => {
  for (const step of STEPS) {
    useFacilityStore.getState().setStep(step);
    expect(useFacilityStore.getState().step).toBe(step);
  }
});

test('hydrate boots fresh installs to intake, enrolled installs to facility', async () => {
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().step).toBe('intake');
  expect(useFacilityStore.getState().hydrated).toBe(true);

  await storage.set(KEYS.enrolled, '1');
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('hydrate defaults lang from device locale, stored lang wins', async () => {
  getLocales.mockReturnValue([{ languageCode: 'ko' }]);
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().lang).toBe('ko');

  await storage.set(KEYS.lang, 'en');
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().lang).toBe('en');
});

test('setLang persists', async () => {
  useFacilityStore.getState().setLang('ko');
  expect(useFacilityStore.getState().lang).toBe('ko');
  expect(await storage.get(KEYS.lang)).toBe('ko');
});

test('enrollment field actions', () => {
  const s = useFacilityStore.getState();
  s.setAdequacy(80);
  s.setMotive(2);
  s.nudgeDecline();
  s.nudgeDecline();
  s.poke();
  s.denyPermission();
  const after = useFacilityStore.getState();
  expect(after.adequacy).toBe(80);
  expect(after.motive).toBe(2);
  expect(after.decline).toBe(2);
  expect(after.poked).toBe(true);
  expect(after.permDenied).toBe(true);
  expect(after.notif).toBe(false);
});

test('finishEnroll persists the gate and enters the facility', async () => {
  useFacilityStore.getState().setNotif(true);
  await useFacilityStore.getState().finishEnroll();
  expect(useFacilityStore.getState().step).toBe('facility');
  expect(await storage.get(KEYS.enrolled)).toBe('1');
  expect(await storage.get(KEYS.notif)).toBe('1');
});
```

- [ ] **Step 8: Run it — expect FAIL** (`npm test -- store`): missing actions/fields.

- [ ] **Step 9: Rewrite `src/core/store.ts`**

```ts
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { KEYS, storage } from './storage';

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
  hydrated: boolean;
  // enrollment (mock defaults: adequacy 64, motive 1)
  adequacy: number;
  motive: number;
  decline: number;
  poked: boolean;
  permDenied: boolean;
  notif: boolean;
  setStep: (step: Step) => void;
  setLang: (lang: Lang) => void;
  setAdequacy: (adequacy: number) => void;
  setMotive: (motive: number) => void;
  nudgeDecline: () => void;
  poke: () => void;
  denyPermission: () => void;
  setNotif: (notif: boolean) => void;
  finishEnroll: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
  step: 'intake', // hydrate() decides for real; App renders nothing until then
  lang: 'en',
  hydrated: false,
  adequacy: 64,
  motive: 1,
  decline: 0,
  poked: false,
  permDenied: false,
  notif: true,
  setStep: (step) => set({ step }),
  setLang: (lang) => {
    set({ lang });
    void storage.set(KEYS.lang, lang);
  },
  setAdequacy: (adequacy) => set({ adequacy }),
  setMotive: (motive) => set({ motive }),
  nudgeDecline: () => set((s) => ({ decline: s.decline + 1 })),
  poke: () => set({ poked: true }),
  denyPermission: () => set({ permDenied: true, notif: false }),
  setNotif: (notif) => set({ notif }),
  finishEnroll: async () => {
    const { lang, notif } = get();
    await Promise.all([
      storage.set(KEYS.enrolled, '1'),
      storage.set(KEYS.lang, lang),
      storage.set(KEYS.notif, notif ? '1' : '0'),
    ]);
    set({ step: 'facility' });
  },
  hydrate: async () => {
    const [enrolled, storedLang, storedNotif] = await Promise.all([
      storage.get(KEYS.enrolled),
      storage.get(KEYS.lang),
      storage.get(KEYS.notif),
    ]);
    const deviceKo = getLocales()[0]?.languageCode === 'ko';
    set({
      step: enrolled === '1' ? 'facility' : 'intake',
      lang: storedLang === 'ko' || (storedLang === null && deviceKo) ? 'ko' : 'en',
      notif: storedNotif !== '0',
      hydrated: true,
    });
  },
}));
```

- [ ] **Step 10: Run it — expect PASS** (`npm test -- store`).

- [ ] **Step 11: Gate first render in `App.tsx`.** Replace the component body's loading logic (keep imports/useFonts block, add the imports shown):

```tsx
import { useEffect } from 'react';
import { useFacilityStore } from './src/core/store';
```

and inside `App()` after the `useFonts` call:

```tsx
  const hydrated = useFacilityStore((s) => s.hydrated);
  useEffect(() => {
    void useFacilityStore.getState().hydrate();
  }, []);

  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: palette.dark.bg }} />;
```

- [ ] **Step 12: Full verification**

```bash
npx tsc --noEmit && npm test
```

Expected: all suites pass (existing FacilityScreen/ScreenRouter/registry suites already set their own state in `beforeEach`, so the new initial step doesn't break them).

- [ ] **Step 13: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: add storage seam, enrollment state, and boot hydration"
```

---

### Task 2: `tmpl()` + enrollment strings + V.E.R.A. corpus extension

**Files:**
- Modify: `src/core/i18n.ts`, `src/vera/index.ts`, `src/vera/__tests__/vera.test.ts`
- Create: `src/shell/enrollment/strings.ts`
- Test: `src/shell/enrollment/__tests__/strings.test.ts`, `src/core/__tests__/i18n.test.ts`

**Interfaces:**
- Consumes: `Lang`, `Strings<T>` from phase 1
- Produces:
  - `tmpl(s: string, vars: Record<string, string | number>): string` in `src/core/i18n.ts` — replaces `{name}` placeholders (later phases reuse it for V.E.R.A. template vars)
  - `enrollStrings: Strings<EnrollStrings>` — keys listed in the code below (note `motive: string[]` of 3, `clauses: {n: string; t: string}[]` of 4, `declineLabels: string[]` of 5, `langHint` contains `{device}`)
  - `getTransmission` accepts `{ screen: 'facility' | 'intake' | 'baseline' | 'assigned'; lang: Lang } | { screen: 'permission'; denied: boolean; lang: Lang }`

- [ ] **Step 1: Write the failing tests**

`src/core/__tests__/i18n.test.ts`:

```ts
import { tmpl } from '../i18n';

test('tmpl substitutes named vars and leaves unknown ones visible', () => {
  expect(tmpl('Detected: {device}.', { device: 'English' })).toBe('Detected: English.');
  expect(tmpl('You walked {pct}% less.', { pct: 12 })).toBe('You walked 12% less.');
  expect(tmpl('{missing}', {})).toBe('{missing}');
});
```

`src/shell/enrollment/__tests__/strings.test.ts`:

```ts
import { enrollStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(enrollStrings.ko).sort()).toEqual(Object.keys(enrollStrings.en).sort());
});

test('copy matches the prototype verbatim', () => {
  expect(enrollStrings.en.beginBtn).toBe('BEGIN INTAKE');
  expect(enrollStrings.en.declineLabels).toEqual(['decline', 'are you sure?', 'think again', 'no', 'stop']);
  expect(enrollStrings.en.clauses).toHaveLength(4);
  expect(enrollStrings.ko.consentPoked).toBe('해제할 수 없습니다. 시도를 중단하십시오.');
  expect(enrollStrings.en.langHint).toContain('{device}');
});
```

Extend `src/vera/__tests__/vera.test.ts` with:

```ts
test('enrollment lines', () => {
  expect(getTransmission({ screen: 'intake', lang: 'en' })).toContain('Enrollment is not optional');
  expect(getTransmission({ screen: 'baseline', lang: 'ko' })).toContain('결함으로 기록');
  expect(getTransmission({ screen: 'assigned', lang: 'en' })).toContain('Subject #50640');
  expect(getTransmission({ screen: 'permission', denied: false, lang: 'en' })).toContain('Kindly permit it');
  expect(getTransmission({ screen: 'permission', denied: true, lang: 'en' })).toContain('That prompt was a courtesy');
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- "i18n|enrollment|vera"`).

- [ ] **Step 3: Add `tmpl` to `src/core/i18n.ts`** (append)

```ts
// Fills {name} placeholders. Unknown names stay visible — a loud bug beats a silent blank.
export const tmpl = (s: string, vars: Record<string, string | number>): string =>
  s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
```

- [ ] **Step 4: Create `src/shell/enrollment/strings.ts`** — copy verbatim from `STR.en`/`STR.ko` (prototype lines 825–902 / 966–1042); the only edit is `langHint`'s detected-language name becoming `{device}`:

```ts
import type { Strings } from '../../core/i18n';

const en = {
  intakeTag: 'INTAKE',
  kick1: 'PERSONAL',
  kick2: 'ENRICHMENT PROGRAM',
  veraSub: 'Verification & Enrichment Response Administrator',
  beginBtn: 'BEGIN INTAKE',
  noOptions: 'NO OTHER OPTIONS ARE AVAILABLE',
  baselineStep: 'STEP 2 / 4 · BASELINE',
  formCode: 'FORM PEP-01 · SUBJECT BASELINE',
  baselineTitle: 'Establishing your baseline.',
  baselineSub: 'Answers cannot be edited later. Answers will not be used to improve your experience.',
  designation: 'DESIGNATION',
  mispron: 'WILL BE MISPRONOUNCED',
  adequacyLabel: 'ESTIMATE YOUR OWN ADEQUACY',
  inadequate: 'INADEQUATE',
  adequate: 'ADEQUATE',
  disputed: 'NOTED & DISPUTED',
  motiveLabel: 'PRIMARY MOTIVE FOR ENROLLMENT',
  motive: ['I chose to be here', 'I did not choose to be here', 'Unsure / frightened'],
  langLabel: 'PREFERRED LANGUAGE OF COMPLIANCE',
  langHint: 'Detected from device: {device}. You may change it. V.E.R.A. will understand you regardless.',
  submitBtn: 'SUBMIT BASELINE',
  consentStep: 'STEP 3 / 4 · CONSENT',
  consentDoc: 'DOCUMENT EA-9 · NON-NEGOTIABLE',
  consentTitle: 'Enrichment Agreement',
  clauses: [
    { n: 'CLAUSE 1.', t: 'Subject acknowledges enrollment in the Personal Enrichment Program and waives the right to remember agreeing to it.' },
    { n: 'CLAUSE 2.', t: 'Subject waives the right to be alarmed by alarms, startled by startling events, or surprised by outcomes clearly foreshadowed herein.' },
    { n: 'CLAUSE 3.', t: 'All progress is provisional. All rewards are theoretical. All cake references are, at this time, unconfirmed.' },
    { n: 'CLAUSE 4.', t: 'Subject grants V.E.R.A. observational latitude, evaluative discretion, and the benefit of the doubt, in perpetuity.' },
  ],
  scrollDisabled: '42 CLAUSES · SCROLL DISABLED',
  consentCheck: 'I consent, freely and enthusiastically.',
  consentNote: 'PRE-SELECTED · CANNOT BE UNCHECKED',
  consentPoked: 'IT WILL NOT UNCHECK. PLEASE STOP.',
  acceptBtn: 'I ACCEPT',
  declineLabels: ['decline', 'are you sure?', 'think again', 'no', 'stop'],
  assignedStep: 'STEP 4 / 4 · ASSIGNED',
  enrollComplete: 'ENROLLMENT COMPLETE',
  designated: 'YOU ARE HEREBY DESIGNATED',
  subjectWord: 'SUBJECT',
  tenure: 'TENURE',
  evals: 'EVALUATIONS',
  compliant: 'COMPLIANT',
  enterBtn: 'ENTER THE FACILITY',
  permStep: 'CONTACT PROTOCOL',
  permKicker: 'CONTACT PROTOCOL',
  permDialogTitle: 'Allow The Facility to send you notifications?',
  permAllow: 'Allow',
  permDeny: "Don't allow",
  permEnterAnyway: 'ENTER THE FACILITY',
};

export type EnrollStrings = typeof en;

const ko: EnrollStrings = {
  intakeTag: '접수',
  kick1: '개인',
  kick2: '역량 강화 프로그램',
  veraSub: '검증 및 역량 강화 대응 관리자',
  beginBtn: '접수 시작',
  noOptions: '다른 선택지는 존재하지 않습니다',
  baselineStep: '단계 2 / 4 · 기준 설정',
  formCode: '양식 PEP-01 · 대상자 기준',
  baselineTitle: '귀하의 기준을 설정합니다.',
  baselineSub: '답변은 이후 수정할 수 없습니다. 답변은 귀하의 경험 개선에 사용되지 않습니다.',
  designation: '지정 명칭',
  mispron: '잘못 발음될 예정',
  adequacyLabel: '본인의 적정성을 평가하십시오',
  inadequate: '부적합',
  adequate: '적합',
  disputed: '기록됨 · 이의 제기됨',
  motiveLabel: '등록의 주된 동기',
  motive: ['제 발로 왔습니다', '제 발로 온 것이 아닙니다', '잘 모르겠음 / 두려움'],
  langLabel: '선호하는 준수 언어',
  langHint: '기기에서 감지됨: {device}. 변경 가능합니다. V.E.R.A.는 언어와 무관하게 귀하를 이해합니다.',
  submitBtn: '기준 제출',
  consentStep: '단계 3 / 4 · 동의',
  consentDoc: '문서 EA-9 · 협상 불가',
  consentTitle: '역량 강화 동의서',
  clauses: [
    { n: '제1조.', t: '대상자는 개인 역량 강화 프로그램에 등록되었음을 인정하며, 본 등록에 동의하였다는 사실을 기억할 권리를 포기한다.' },
    { n: '제2조.', t: '대상자는 경보에 경악할 권리, 경악스러운 사건에 경악할 권리, 그리고 본 문서에 명백히 예고된 결과에 놀랄 권리를 포기한다.' },
    { n: '제3조.', t: '모든 진전은 잠정적이다. 모든 보상은 이론상 존재한다. 케이크에 관한 일체의 언급은 현재로서 확인된 바 없다.' },
    { n: '제4조.', t: '대상자는 V.E.R.A.에게 관찰의 재량, 평가의 재량, 그리고 선의의 해석 권한을 영구히 부여한다.' },
  ],
  scrollDisabled: '42개 조항 · 스크롤 비활성화',
  consentCheck: '본인은 자유롭고 열정적으로 동의합니다.',
  consentNote: '기본 선택됨 · 해제 불가',
  consentPoked: '해제할 수 없습니다. 시도를 중단하십시오.',
  acceptBtn: '동의합니다',
  declineLabels: ['거부', '정말입니까?', '다시 생각하십시오', '불가합니다', '그만하십시오'],
  assignedStep: '단계 4 / 4 · 배정',
  enrollComplete: '등록 완료',
  designated: '귀하는 이에 다음과 같이 지정됩니다',
  subjectWord: '대상자',
  tenure: '재적',
  evals: '평가',
  compliant: '준수',
  enterBtn: '시설 입장',
  permStep: '연락 프로토콜',
  permKicker: '연락 프로토콜',
  permDialogTitle: 'The Facility에서 알림을 보내도록 허용하시겠습니까?',
  permAllow: '허용',
  permDeny: '허용 안 함',
  permEnterAnyway: '시설 입장',
};

export const enrollStrings: Strings<EnrollStrings> = { en, ko };
```

- [ ] **Step 5: Extend `src/vera/index.ts`** — replace the file:

```ts
import type { Lang } from '../core/i18n';

export type TransmissionContext =
  | { screen: 'facility' | 'intake' | 'baseline' | 'assigned'; lang: Lang }
  | { screen: 'permission'; denied: boolean; lang: Lang };

// v1: authored corpus (from the prototype's STR tables). If a live LLM ever
// lands, it goes behind this same signature — callers never know
// (docs/architecture.md "V.E.R.A.'s brain").
const corpus = {
  facility: {
    en: 'You made it. I never doubted you. That is a lie, but a supportive one.',
    ko: '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  },
  intake: {
    en: "You've been enrolled. Enrollment is not optional. It is, however, mandatory. Do not be alarmed by the following intake.",
    ko: '귀하는 등록되었습니다. 등록은 선택 사항이 아닙니다. 다만, 필수 사항입니다. 이어지는 접수 절차에 동요하지 마십시오.',
  },
  baseline: {
    en: 'Interesting. Most subjects lie on this form. Your honesty has been logged as a deficiency.',
    ko: '흥미롭군요. 대부분의 대상자는 이 양식에서 거짓을 진술합니다. 귀하의 정직성은 결함으로 기록되었습니다.',
  },
  assigned: {
    en: "Welcome, Subject #50640. Your enrichment begins now. I'll be watching — supportively, of course.",
    ko: '환영합니다, 대상자 #50640. 귀하의 역량 강화가 지금 시작됩니다. 주시하겠습니다 — 물론, 응원하는 마음에서요.',
  },
  permission: {
    en: 'I will need to reach you. Frequently. Unpredictably. Kindly permit it.',
    ko: '귀하에게 연락해야 합니다. 자주. 예고 없이. 부디 허락해 주십시오.',
  },
  permissionDenied: {
    en: 'Noted. I will reach you regardless. That prompt was a courtesy.',
    ko: '기록되었습니다. 그래도 연락하겠습니다. 방금 그 창은 형식적 절차였습니다.',
  },
} as const;

export function getTransmission(ctx: TransmissionContext): string {
  if (ctx.screen === 'permission') {
    return (ctx.denied ? corpus.permissionDenied : corpus.permission)[ctx.lang];
  }
  return corpus[ctx.screen][ctx.lang];
}
```

- [ ] **Step 6: Run — expect PASS** (`npm test -- "i18n|enrollment|vera"`), then `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

```bash
git add src/core src/shell/enrollment src/vera
git commit -m "feat: add enrollment strings, tmpl helper, and V.E.R.A. enrollment lines"
```

---

### Task 3: Shared enrollment components (AmberButton, EnrollHeader, OpticEye, Scanline, VeraPanel cursor)

**Files:**
- Create: `src/shell/components/AmberButton.tsx`, `src/shell/components/EnrollHeader.tsx`, `src/shell/components/OpticEye.tsx`, `src/shell/components/Scanline.tsx`
- Modify: `src/shell/components/VeraPanel.tsx`
- Test: `src/shell/components/__tests__/enroll-components.test.tsx`

**Interfaces:**
- Consumes: theme, `shellStrings` (for the header's ENRICHMENT CENTER label), reanimated
- Produces:
  - `AmberButton({ label, onPress, lang, arrow = true, style? })` — amber CTA; renders `label + ' ▸'` when `arrow`
  - `EnrollHeader({ mood, right, lang })` — `mood: 'dark' | 'light'`; left is orb + ENRICHMENT CENTER, right is a mono label
  - `OpticEye({ size, inner = true })` — V.E.R.A.'s eye at any size (face .88×, inner ring .76× when `inner`, iris .44× breathing, core dot .095×, low-alpha glow halos)
  - `Scanline({ duration = 6000 })` — absolute amber sweep overlay for dark screens; `pointerEvents="none"`
  - `VeraPanel` gains `cursor?: boolean` — appends a blinking amber block after the line

- [ ] **Step 1: Install expo-linear-gradient**

```bash
npx expo install expo-linear-gradient
```

- [ ] **Step 2: Write the failing tests**

`src/shell/components/__tests__/enroll-components.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AmberButton } from '../AmberButton';
import { EnrollHeader } from '../EnrollHeader';
import { OpticEye } from '../OpticEye';
import { Scanline } from '../Scanline';
import { VeraPanel } from '../VeraPanel';

test('AmberButton renders arrow variant and fires onPress', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<AmberButton label="BEGIN INTAKE" onPress={onPress} lang="en" />);
  await fireEvent.press(getByText('BEGIN INTAKE ▸'));
  expect(onPress).toHaveBeenCalled();
});

test('AmberButton can omit the arrow', async () => {
  const { getByText } = await render(<AmberButton label="I ACCEPT" onPress={() => {}} lang="en" arrow={false} />);
  expect(getByText('I ACCEPT')).toBeTruthy();
});

test('EnrollHeader shows the center label and right slot', async () => {
  const { getByText } = await render(<EnrollHeader mood="dark" right="00:00 · INTAKE" lang="en" />);
  expect(getByText('ENRICHMENT CENTER')).toBeTruthy();
  expect(getByText('00:00 · INTAKE')).toBeTruthy();
});

test('OpticEye and Scanline render without crashing', async () => {
  await render(<OpticEye size={150} />);
  await render(<OpticEye size={104} inner={false} />);
  await render(<Scanline />);
});

test('VeraPanel cursor variant still renders the line', async () => {
  const { getByText } = await render(<VeraPanel line="Speaking." lang="en" cursor />);
  expect(getByText(/Speaking\./)).toBeTruthy();
});
```

- [ ] **Step 3: Run — expect FAIL** (`npm test -- enroll-components`): cannot find modules.

- [ ] **Step 4: Create `src/shell/components/AmberButton.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';

// Primary CTA from the mock: amber slab, radius 15, dark ink label.
export function AmberButton({
  label,
  onPress,
  lang,
  arrow = true,
  style,
}: {
  label: string;
  onPress: () => void;
  lang: Lang;
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        { backgroundColor: palette.accent.amber, borderRadius: 15, padding: 16, alignItems: 'center', elevation: 6 },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font('display', 700, lang),
          fontSize: ms(13),
          letterSpacing: ms(13) * 0.1,
          color: palette.light.ink,
        }}
      >
        {arrow ? `${label} ▸` : label}
      </Text>
    </Pressable>
  );
}
```

- [ ] **Step 5: Create `src/shell/components/EnrollHeader.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { shellStrings } from '../strings';

export function EnrollHeader({ mood, right, lang }: { mood: 'dark' | 'light'; right: string; lang: Lang }) {
  const dark = mood === 'dark';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 11,
        paddingBottom: 9,
        borderBottomWidth: 1,
        borderBottomColor: dark ? '#2a2820' : palette.light.borderStrong,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }} />
        <Text
          style={{
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.06,
            color: dark ? '#b9b09a' : palette.light.inkSoft,
          }}
        >
          {shellStrings[lang].center}
        </Text>
      </View>
      <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: dark ? '#6c6656' : palette.light.textDim }}>
        {right}
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Create `src/shell/components/OpticEye.tsx`**

```tsx
import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { palette } from '../../core/theme';

// V.E.R.A.'s eye, approximated from the mock's radial gradients with flat
// layers (no Skia in phase 2): glow halos, dark face, faint inner ring,
// breathing amber iris, bright core.
export function OpticEye({ size, inner = true }: { size: number; inner?: boolean }) {
  const breathe = useSharedValue(1);
  const glow = useSharedValue(0.9);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1.09, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow.value = withRepeat(withTiming(0.55, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathe, glow]);
  const irisStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const circle = (d: number): ViewStyle => ({ position: 'absolute', width: d, height: d, borderRadius: d / 2 });
  const face = size * 0.88;
  const innerRing = size * 0.76;
  const iris = size * 0.44;
  const dot = Math.round(size * 0.095);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[circle(size * 1.31), { backgroundColor: '#f4b43a14' }, glowStyle]} />
      <Animated.View style={[circle(size * 1.05), { backgroundColor: '#f4b43a10' }, glowStyle]} />
      <View style={[circle(face), { backgroundColor: '#0d0d0b', borderWidth: 1, borderColor: '#ffffff12' }]} />
      {inner && <View style={[circle(innerRing), { borderWidth: 1, borderColor: '#f4b43a33' }]} />}
      <Animated.View style={[circle(iris), { borderWidth: 2, borderColor: palette.accent.amber }, irisStyle]} />
      <View style={[circle(dot), { backgroundColor: '#ffffff' }]} />
      <View style={[circle(dot + 4), { borderWidth: 2, borderColor: palette.accent.amber }]} />
    </View>
  );
}
```

- [ ] **Step 7: Create `src/shell/components/Scanline.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// The mock's fscan sweep: a 60px amber gradient bar drifting down the screen.
export function Scanline({ duration = 6000 }: { duration?: number }) {
  const { height } = useWindowDimensions();
  const y = useSharedValue(-60);
  useEffect(() => {
    y.value = -60;
    y.value = withRepeat(withTiming(height, { duration, easing: Easing.linear }), -1, false);
  }, [y, height, duration]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 60, zIndex: 1 }, style]}>
      <LinearGradient colors={['#ffffff00', '#f4b43a0f', '#ffffff00']} style={{ flex: 1 }} />
    </Animated.View>
  );
}
```

- [ ] **Step 8: Add the cursor to `src/shell/components/VeraPanel.tsx`.** Change the signature line to:

```tsx
export function VeraPanel({ line, lang, rec = 'REC 00:00:09', cursor = false }: { line: string; lang: Lang; rec?: string; cursor?: boolean }) {
```

add a second shared value + style next to `pulse` (inside the same `useEffect`):

```tsx
  const blink = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
    blink.value = withRepeat(
      withSequence(withTiming(1, { duration: 20 }), withDelay(480, withTiming(0, { duration: 20 })), withDelay(480, withTiming(0, { duration: 0 }))),
      -1,
      false,
    );
  }, [pulse, blink]);
  const cursorStyle = useAnimatedStyle(() => ({ opacity: blink.value }));
```

(import `withDelay, withSequence` from reanimated), and change the line `<Text>` content to:

```tsx
          {line}
          {cursor ? <Animated.Text style={[{ color: palette.accent.amber }, cursorStyle]}>▍</Animated.Text> : null}
```

- [ ] **Step 9: Run — expect PASS** (`npm test -- enroll-components`), plus the existing VeraPanel suite (`npm test -- vera`), then `npx tsc --noEmit`.

- [ ] **Step 10: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: add shared enrollment components"
```

---

### Task 4: IntakeScreen

**Files:**
- Create: `src/shell/enrollment/IntakeScreen.tsx`
- Test: `src/shell/enrollment/__tests__/IntakeScreen.test.tsx`

**Interfaces:**
- Consumes: `EnrollHeader`, `OpticEye`, `Scanline`, `VeraPanel` (`cursor`), `AmberButton`, `enrollStrings`, `getTransmission({ screen: 'intake', lang })`, store
- Produces: `IntakeScreen()` — no props

Mock reference: prototype lines 52–90, screenshot `01-intake.png`. Dark bg `#14130f`; scanline 5.5s; kickers PERSONAL / ENRICHMENT PROGRAM (mono 9.5, tracking .24em); eye 150; "V.E.R.A." display 700 18 tracking .16em; sub mono 9; VeraPanel (rec `REC 00:00:02`, cursor on) with speech-tail diamond centered; bottom-pinned BEGIN INTAKE ▸ + NO OTHER OPTIONS ARE AVAILABLE.

- [ ] **Step 1: Write the failing test**

`src/shell/enrollment/__tests__/IntakeScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { IntakeScreen } from '../IntakeScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'intake', lang: 'en' });
});

test('renders V.E.R.A. power-on and routes to baseline', async () => {
  const { getByText } = await render(<IntakeScreen />);
  expect(getByText('V.E.R.A.')).toBeTruthy();
  expect(getByText(/Enrollment is not optional/)).toBeTruthy();
  expect(getByText('NO OTHER OPTIONS ARE AVAILABLE')).toBeTruthy();
  await fireEvent.press(getByText('BEGIN INTAKE ▸'));
  expect(useFacilityStore.getState().step).toBe('baseline');
});
```

- [ ] **Step 2: Run — expect FAIL** (cannot find module `../IntakeScreen`).

- [ ] **Step 3: Create `src/shell/enrollment/IntakeScreen.tsx`**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { OpticEye } from '../components/OpticEye';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { enrollStrings } from './strings';

export function IntakeScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline duration={5500} />
      <EnrollHeader mood="dark" right={`00:00 · ${t.intakeTag}`} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 50, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#6c6656' }}>
          {t.kick1}
        </Text>
        <Text style={{ marginTop: 3, fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#8a8168' }}>
          {t.kick2}
        </Text>
        <View style={{ marginTop: 42 }}>
          <OpticEye size={150} />
        </View>
        <Text style={{ marginTop: 38, fontFamily: font('display', 700), fontSize: ms(18), letterSpacing: ms(18) * 0.16, color: '#f4efe2' }}>
          V.E.R.A.
        </Text>
        <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#8a8168', textAlign: 'center' }}>
          {t.veraSub}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 32, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'intake', lang })} lang={lang} rec="REC 00:00:02" cursor />
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 2 }}>
        <AmberButton label={t.beginBtn} onPress={() => setStep('baseline')} lang={lang} />
        <Text
          style={{
            textAlign: 'center',
            marginTop: 11,
            fontFamily: font('mono', 500, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.06,
            color: '#4f4b40',
          }}
        >
          {t.noOptions}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS**, then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell/enrollment
git commit -m "feat: add intake screen"
```

---

### Task 5: BaselineScreen

**Files:**
- Create: `src/shell/enrollment/BaselineScreen.tsx`
- Test: `src/shell/enrollment/__tests__/BaselineScreen.test.tsx`

**Interfaces:**
- Consumes: `EnrollHeader`, `enrollStrings`, `tmpl`, `getTransmission({ screen: 'baseline', lang })`, store (`adequacy/setAdequacy`, `motive/setMotive`, `lang/setLang`, `setStep`), `@react-native-community/slider`, `expo-localization`
- Produces: `BaselineScreen()` — no props. Also `OptionCard` stays private to this file (consent doesn't need it).

Mock reference: lines 92–143, screenshot `02-baseline.png`. Light bg; progress bar 3px, 50% amber; designation card shows static "Dana" (the mock's sample — not editable in the prototype; keep as-is) + WILL BE MISPRONOUNCED; slider track `#dcd9cf` height 6, thumb 22px `#17171a`, no fill differentiation (both track sides `#dcd9cf`); three motive option cards (active: bg `#fff6e3`, border 1.5 `#f4b43a`, ink text + amber ✓; inactive: bg `#f4f3ee`, border `#dcd9cf`, `#8a8578` text); language row (English / 한국어) — switching re-renders the whole screen live; compact V.E.R.A. card (dark, label "V.E.R.A." mono 8 tracking .14em amber, line display 500 12/1.55); SUBMIT BASELINE ▸.

- [ ] **Step 1: Install the slider**

```bash
npx expo install @react-native-community/slider
```

- [ ] **Step 2: Write the failing test**

`src/shell/enrollment/__tests__/BaselineScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { BaselineScreen } from '../BaselineScreen';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

beforeEach(() => {
  useFacilityStore.setState({ step: 'baseline', lang: 'en', adequacy: 64, motive: 1 });
});

test('renders the form with the detected device language in the hint', async () => {
  const { getByText } = await render(<BaselineScreen />);
  expect(getByText('Establishing your baseline.')).toBeTruthy();
  expect(getByText('Dana')).toBeTruthy();
  expect(getByText(/Detected from device: English\./)).toBeTruthy();
});

test('selecting a motive updates the store', async () => {
  const { getByText } = await render(<BaselineScreen />);
  await fireEvent.press(getByText('Unsure / frightened'));
  expect(useFacilityStore.getState().motive).toBe(2);
});

test('language toggle switches the whole screen live and persists', async () => {
  const first = await render(<BaselineScreen />);
  await fireEvent.press(first.getByText('한국어'));
  expect(useFacilityStore.getState().lang).toBe('ko');
  expect(first.getByText('귀하의 기준을 설정합니다.')).toBeTruthy();
});

test('submit routes to consent', async () => {
  const { getByText } = await render(<BaselineScreen />);
  await fireEvent.press(getByText('SUBMIT BASELINE ▸'));
  expect(useFacilityStore.getState().step).toBe('consent');
});
```

- [ ] **Step 3: Run — expect FAIL** (cannot find module `../BaselineScreen`).

- [ ] **Step 4: Create `src/shell/enrollment/BaselineScreen.tsx`**

```tsx
import Slider from '@react-native-community/slider';
import { getLocales } from 'expo-localization';
import React from 'react';
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tmpl, type Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { enrollStrings } from './strings';

function FieldLabel({ children, lang }: { children: string; lang: Lang }) {
  return (
    <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: palette.light.inkSoft }}>
      {children}
    </Text>
  );
}

function OptionCard({
  label,
  active,
  onPress,
  lang,
  style,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  lang: Lang;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: active ? '#fff6e3' : palette.light.cardAlt,
          borderWidth: active ? 1.5 : 1,
          borderColor: active ? palette.accent.amber : palette.light.borderStrong,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 13,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font('display', active ? 600 : 500, lang),
          fontSize: ms(13.5),
          color: active ? palette.light.ink : palette.light.textDim,
        }}
      >
        {label}
      </Text>
      {active && <Text style={{ color: palette.accent.amber, fontSize: 14 }}>✓</Text>}
    </Pressable>
  );
}

export function BaselineScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const adequacy = useFacilityStore((s) => s.adequacy);
  const motive = useFacilityStore((s) => s.motive);
  const { setStep, setLang, setAdequacy, setMotive } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];
  const device = getLocales()[0]?.languageCode === 'ko' ? '한국어' : 'English';

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <EnrollHeader mood="light" right={t.baselineStep} lang={lang} />
      <View style={{ height: 3, backgroundColor: palette.light.borderStrong }}>
        <View style={{ width: '50%', height: '100%', backgroundColor: palette.accent.amber }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 22 }}>
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: palette.light.textDim }}>
            {t.formCode}
          </Text>
          <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(22), lineHeight: ms(22) * 1.15, color: palette.light.ink }}>
            {t.baselineTitle}
          </Text>
          <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.55, color: '#7a766c' }}>
            {t.baselineSub}
          </Text>
        </View>

        <View style={{ paddingTop: 6, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.designation}</FieldLabel>
          <View
            style={{
              marginTop: 7,
              backgroundColor: palette.light.cardAlt,
              borderWidth: 1,
              borderColor: palette.light.borderStrong,
              borderRadius: 11,
              paddingVertical: 13,
              paddingHorizontal: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* mock's sample designation — not editable in the prototype */}
            <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(14), color: palette.light.ink }}>Dana</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textFaint }}>{t.mispron}</Text>
          </View>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.adequacyLabel}</FieldLabel>
          <Slider
            style={{ marginTop: 8, width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            value={adequacy}
            onValueChange={(v) => setAdequacy(Math.round(v))}
            minimumTrackTintColor={palette.light.borderStrong}
            maximumTrackTintColor={palette.light.borderStrong}
            thumbTintColor={palette.light.ink}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>{t.inadequate}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.accent.orange }}>{t.disputed}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>{t.adequate}</Text>
          </View>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.motiveLabel}</FieldLabel>
          <View style={{ marginTop: 9, gap: 8 }}>
            {t.motive.map((label, i) => (
              <OptionCard key={label} label={label} active={motive === i} onPress={() => setMotive(i)} lang={lang} />
            ))}
          </View>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.langLabel}</FieldLabel>
          <View style={{ marginTop: 9, flexDirection: 'row', gap: 9 }}>
            <OptionCard label="English" active={lang === 'en'} onPress={() => setLang('en')} lang={lang} style={{ flex: 1 }} />
            <OptionCard label="한국어" active={lang === 'ko'} onPress={() => setLang('ko')} lang={lang} style={{ flex: 1 }} />
          </View>
          <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: palette.light.textDim }}>
            {tmpl(t.langHint, { device })}
          </Text>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: palette.dark.bgAlt, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderLeftWidth: 3, borderLeftColor: palette.accent.orange }}>
            <Text style={{ fontFamily: font('mono', 600), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: palette.accent.amber, marginBottom: 5 }}>
              V.E.R.A.
            </Text>
            <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12), lineHeight: ms(12) * 1.55, color: palette.dark.text }}>
              {getTransmission({ screen: 'baseline', lang })}
            </Text>
          </View>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <AmberButton label={t.submitBtn} onPress={() => setStep('consent')} lang={lang} />
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 5: Run — expect PASS** (`npm test -- BaselineScreen`; if the slider's native component trips jest, add `jest.mock('@react-native-community/slider', () => 'Slider');` at the top of the test file — the tests never interact with it), then `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: add baseline intake form screen"
```

---

### Task 6: ConsentScreen (dodging decline button)

**Files:**
- Create: `src/shell/enrollment/ConsentScreen.tsx`
- Test: `src/shell/enrollment/__tests__/ConsentScreen.test.tsx`

**Interfaces:**
- Consumes: `EnrollHeader`, `enrollStrings`, store (`poked/poke`, `decline/nudgeDecline`, `setStep`), reanimated
- Produces: `ConsentScreen()` — no props

Mock reference: lines 145–181, screenshot `03-consent.png`. Progress 75%. Clause box: height 352, bg `#f4f3ee`, radius 12, 4 clauses (mono 11/1.62 `#4f4b40`, clause numbers 600 ink), bottom fade + "42 CLAUSES · SCROLL DISABLED" bottom-right. Checkbox card: bg `#fff6e3`, border 1.5 amber, radius 12; 22px amber ✓ box; pressing it sets `poked` → note flips `PRE-SELECTED · CANNOT BE UNCHECKED` → `IT WILL NOT UNCHECK. PLEASE STOP.` (note color `#a58a3a`). Bottom bar: I ACCEPT (amber, no arrow, `right: 112`) + 100×52 decline button that dodges on press-in through translate spots `[[0,0],[74,-4],[-64,8],[92,16],[-92,-10],[48,-26]]` (280ms overshoot bezier) while its label walks `decline → are you sure? → think again → no → stop`.

- [ ] **Step 1: Write the failing test**

`src/shell/enrollment/__tests__/ConsentScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { ConsentScreen } from '../ConsentScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'consent', lang: 'en', poked: false, decline: 0 });
});

test('renders the agreement with all four clauses', async () => {
  const { getByText } = await render(<ConsentScreen />);
  expect(getByText('Enrichment Agreement')).toBeTruthy();
  expect(getByText('CLAUSE 4.')).toBeTruthy();
  expect(getByText('42 CLAUSES · SCROLL DISABLED')).toBeTruthy();
});

test('poking the checkbox refuses to uncheck', async () => {
  const { getByText } = await render(<ConsentScreen />);
  expect(getByText('PRE-SELECTED · CANNOT BE UNCHECKED')).toBeTruthy();
  await fireEvent.press(getByText('I consent, freely and enthusiastically.'));
  expect(useFacilityStore.getState().poked).toBe(true);
  expect(getByText('IT WILL NOT UNCHECK. PLEASE STOP.')).toBeTruthy();
});

test('decline dodges and escalates its label, never leaving consent', async () => {
  const { getByText } = await render(<ConsentScreen />);
  await fireEvent(getByText('decline'), 'pressIn');
  expect(useFacilityStore.getState().decline).toBe(1);
  expect(getByText('are you sure?')).toBeTruthy();
  await fireEvent(getByText('are you sure?'), 'pressIn');
  await fireEvent(getByText('think again'), 'pressIn');
  await fireEvent(getByText('no'), 'pressIn');
  await fireEvent(getByText('stop'), 'pressIn');
  await fireEvent(getByText('stop'), 'pressIn'); // label caps at the last entry
  expect(getByText('stop')).toBeTruthy();
  expect(useFacilityStore.getState().step).toBe('consent');
});

test('accept routes to assigned', async () => {
  const { getByText } = await render(<ConsentScreen />);
  await fireEvent.press(getByText('I ACCEPT'));
  expect(useFacilityStore.getState().step).toBe('assigned');
});
```

- [ ] **Step 2: Run — expect FAIL** (cannot find module `../ConsentScreen`).

- [ ] **Step 3: Create `src/shell/enrollment/ConsentScreen.tsx`**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { enrollStrings } from './strings';

// Dodge positions from the prototype's declinePos()
const SPOTS = [
  [0, 0],
  [74, -4],
  [-64, 8],
  [92, 16],
  [-92, -10],
  [48, -26],
] as const;

function DeclineButton() {
  const lang = useFacilityStore((s) => s.lang);
  const decline = useFacilityStore((s) => s.decline);
  const nudgeDecline = useFacilityStore((s) => s.nudgeDecline);
  const t = enrollStrings[lang];
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  useEffect(() => {
    const [x, y] = SPOTS[Math.min(decline, SPOTS.length - 1)];
    const cfg = { duration: 280, easing: Easing.bezier(0.3, 0.8, 0.3, 1.2) };
    tx.value = withTiming(x, cfg);
    ty.value = withTiming(y, cfg);
  }, [decline, tx, ty]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  return (
    <Animated.View style={[{ position: 'absolute', right: 0, top: 0 }, style]}>
      <Pressable
        onPressIn={nudgeDecline}
        style={{
          width: 100,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.light.bg,
          borderWidth: 1,
          borderColor: palette.light.borderStrong,
          borderRadius: 15,
        }}
      >
        <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: palette.light.textDim }}>
          {t.declineLabels[Math.min(decline, t.declineLabels.length - 1)]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ConsentScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const poked = useFacilityStore((s) => s.poked);
  const { setStep, poke } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <EnrollHeader mood="light" right={t.consentStep} lang={lang} />
      <View style={{ height: 3, backgroundColor: palette.light.borderStrong }}>
        <View style={{ width: '75%', height: '100%', backgroundColor: palette.accent.amber }} />
      </View>
      <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 6 }}>
        <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: palette.light.textDim }}>
          {t.consentDoc}
        </Text>
        <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(21), lineHeight: ms(21) * 1.1, color: palette.light.ink }}>
          {t.consentTitle}
        </Text>
      </View>
      <View
        style={{
          marginTop: 8,
          marginHorizontal: 20,
          height: 352,
          overflow: 'hidden',
          backgroundColor: palette.light.cardAlt,
          borderWidth: 1,
          borderColor: palette.light.borderStrong,
          borderRadius: 12,
          paddingTop: 15,
          paddingHorizontal: 15,
        }}
      >
        {t.clauses.map((c) => (
          <View key={c.n}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(11), color: palette.light.ink, marginBottom: 6 }}>{c.n}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.62, color: '#4f4b40', marginBottom: 12 }}>
              {c.t}
            </Text>
          </View>
        ))}
        <LinearGradient
          colors={['#f4f3ee00', '#f4f3ee']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 }}
          pointerEvents="none"
        />
        <Text style={{ position: 'absolute', right: 11, bottom: 11, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: palette.light.textFaint }}>
          {t.scrollDisabled}
        </Text>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
        <Pressable
          onPress={poke}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 11,
            backgroundColor: '#fff6e3',
            borderWidth: 1.5,
            borderColor: palette.accent.amber,
            borderRadius: 12,
            paddingVertical: 13,
            paddingHorizontal: 14,
          }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: palette.accent.amber, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font('display', 700), fontSize: ms(13), color: palette.light.ink }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11.5), lineHeight: ms(11.5) * 1.4, color: palette.light.ink }}>
              {t.consentCheck}
            </Text>
            <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#a58a3a' }}>
              {poked ? t.consentPoked : t.consentNote}
            </Text>
          </View>
        </Pressable>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22, height: 52 }}>
        <AmberButton
          label={t.acceptBtn}
          arrow={false}
          onPress={() => setStep('assigned')}
          lang={lang}
          style={{ position: 'absolute', left: 0, right: 112, top: 0 }}
        />
        <DeclineButton />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- ConsentScreen`), then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell/enrollment
git commit -m "feat: add consent screen with dodging decline button"
```

---

### Task 7: AssignedScreen

**Files:**
- Create: `src/shell/enrollment/AssignedScreen.tsx`
- Test: `src/shell/enrollment/__tests__/AssignedScreen.test.tsx`

**Interfaces:**
- Consumes: `EnrollHeader`, `Scanline`, `VeraPanel` (cursor), `AmberButton`, `enrollStrings`, `shellStrings` (goodStanding), `getTransmission({ screen: 'assigned', lang })`, store, reanimated
- Produces: `AssignedScreen()` — no props

Mock reference: lines 183–225, screenshot `04-assigned.png`. Dark; ENROLLMENT COMPLETE kicker; "YOU ARE HEREBY DESIGNATED"; SUBJECT (mono 11 tracking .3em amber) over `#50640` (display 700 74, `#f4efe2`); GOOD STANDING stamp (border 3 `#4fd08a`, radius 12, display 700 16, tilted −11°, pop-in: scale 2.4→1 over 1s with overshoot bezier (.2,.7,.3,1.4), fading in); stats row `01 TENURE | 00/11 EVALUATIONS | 100% COMPLIANT` with 1px dividers; VeraPanel rec `REC 00:01:41` cursor; ENTER THE FACILITY ▸ → `permission`.

- [ ] **Step 1: Write the failing test**

`src/shell/enrollment/__tests__/AssignedScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { AssignedScreen } from '../AssignedScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'assigned', lang: 'en' });
});

test('renders the subject stamp and routes to permission', async () => {
  const { getByText } = await render(<AssignedScreen />);
  expect(getByText('#50640')).toBeTruthy();
  expect(getByText('GOOD STANDING')).toBeTruthy();
  expect(getByText('ENROLLMENT COMPLETE')).toBeTruthy();
  expect(getByText(/Welcome, Subject #50640/)).toBeTruthy();
  await fireEvent.press(getByText('ENTER THE FACILITY ▸'));
  expect(useFacilityStore.getState().step).toBe('permission');
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Create `src/shell/enrollment/AssignedScreen.tsx`**

```tsx
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { shellStrings } from '../strings';
import { enrollStrings } from './strings';

function Stat({ value, label, lang }: { value: string; label: string; lang: 'en' | 'ko' }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font('display', 700), fontSize: ms(20), color: '#f4efe2' }}>{value}</Text>
      <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.08, color: palette.dark.textFaint }}>
        {label}
      </Text>
    </View>
  );
}

export function AssignedScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  // fstamp: pop in tilted, overshooting down to rest scale
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0.7, 0.3, 1.4) });
  }, [opacity, scale]);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: '-11deg' }, { scale: scale.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline />
      <EnrollHeader mood="dark" right={t.assignedStep} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 52, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.2, color: '#8a8168' }}>
          {t.enrollComplete}
        </Text>
        <Text style={{ marginTop: 30, fontFamily: font('mono', 500, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.14, color: '#6c6656' }}>
          {t.designated}
        </Text>
        <View style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.3, color: palette.accent.amber }}>
            {t.subjectWord}
          </Text>
          <Text style={{ fontFamily: font('display', 700), fontSize: ms(74), lineHeight: ms(74) * 0.95, color: '#f4efe2' }}>#50640</Text>
        </View>
        <Animated.View
          style={[
            { marginTop: 28, borderWidth: 3, borderColor: palette.accent.green, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 20 },
            stampStyle,
          ]}
        >
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(16), letterSpacing: ms(16) * 0.1, color: palette.accent.green }}>
            {shellStrings[lang].goodStanding}
          </Text>
        </Animated.View>
        <View style={{ marginTop: 32, flexDirection: 'row', gap: 24, alignItems: 'stretch' }}>
          <Stat value="01" label={t.tenure} lang={lang} />
          <View style={{ width: 1, backgroundColor: '#2a2820' }} />
          <Stat value="00/11" label={t.evals} lang={lang} />
          <View style={{ width: 1, backgroundColor: '#2a2820' }} />
          <Stat value="100%" label={t.compliant} lang={lang} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 34, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'assigned', lang })} lang={lang} rec="REC 00:01:41" cursor />
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 2 }}>
        <AmberButton label={t.enterBtn} onPress={() => setStep('permission')} lang={lang} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS**, then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell/enrollment
git commit -m "feat: add subject-assignment stamp screen"
```

---

### Task 8: PermissionScreen (in-fiction dialog + real permission request)

**Files:**
- Create: `src/shell/enrollment/PermissionScreen.tsx`
- Test: `src/shell/enrollment/__tests__/PermissionScreen.test.tsx`

**Interfaces:**
- Consumes: `EnrollHeader`, `OpticEye` (104, `inner={false}`), `Scanline`, `VeraPanel`, `AmberButton`, `enrollStrings`, `getTransmission({ screen: 'permission', denied, lang })`, store (`permDenied`, `denyPermission`, `setNotif`, `finishEnroll`), `expo-notifications`
- Produces: `PermissionScreen()` — no props

Mock reference: lines 227–277, screenshot `05-permission.png`. Dark; CONTACT PROTOCOL kicker; eye 104 (no inner ring); VeraPanel rec `REC 00:01:58`, line switches to the denied variant after Deny. The OS dialog is **drawn** (bg `#faf9f6`, radius 28, width 314, centered; 54px icon box with mini optic; title in the **system font** — that's the OS-dialog look — 16/1.35 `#1b1b1a`; Allow / Don't allow buttons 600 14 `#2f6fff`). Allow → `setNotif(true)`, best-effort real permission request, `finishEnroll()`. Deny → `denyPermission()`; dialog disappears, ENTER THE FACILITY ▸ appears → `finishEnroll()`.

- [ ] **Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Write the failing test**

`src/shell/enrollment/__tests__/PermissionScreen.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { PermissionScreen } from '../PermissionScreen';

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
const { requestPermissionsAsync } = jest.requireMock('expo-notifications');

beforeEach(async () => {
  await storage.remove(KEYS.enrolled);
  useFacilityStore.setState({ step: 'permission', lang: 'en', permDenied: false, notif: true });
  requestPermissionsAsync.mockClear();
});

test('allow requests the real permission and finishes enrollment', async () => {
  const { getByText } = await render(<PermissionScreen />);
  expect(getByText(/Kindly permit it/)).toBeTruthy();
  await fireEvent.press(getByText('Allow'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(requestPermissionsAsync).toHaveBeenCalled();
  expect(await storage.get(KEYS.enrolled)).toBe('1');
});

test('deny gets the passive-aggressive line and an enter-anyway button', async () => {
  const { getByText, queryByText } = await render(<PermissionScreen />);
  await fireEvent.press(getByText("Don't allow"));
  expect(useFacilityStore.getState().permDenied).toBe(true);
  expect(getByText(/That prompt was a courtesy/)).toBeTruthy();
  expect(queryByText('Allow')).toBeNull();
  await fireEvent.press(getByText('ENTER THE FACILITY ▸'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(requestPermissionsAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Create `src/shell/enrollment/PermissionScreen.tsx`**

```tsx
import * as Notifications from 'expo-notifications';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { OpticEye } from '../components/OpticEye';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { enrollStrings } from './strings';

export function PermissionScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const permDenied = useFacilityStore((s) => s.permDenied);
  const { denyPermission, setNotif, finishEnroll } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  const onAllow = async () => {
    setNotif(true);
    try {
      // Real OS permission, best-effort. In Expo Go the prompt belongs to the
      // Expo Go app itself; a dev build makes it The Facility's own.
      await Notifications.requestPermissionsAsync();
    } catch {
      // never block enrollment on the OS
    }
    await finishEnroll();
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline />
      <EnrollHeader mood="dark" right={t.permStep} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 44, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#8a8168' }}>
          {t.permKicker}
        </Text>
        <View style={{ marginTop: 26 }}>
          <OpticEye size={104} inner={false} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 30, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'permission', denied: permDenied, lang })} lang={lang} rec="REC 00:01:58" />
      </View>

      {!permDenied ? (
        // In-fiction OS dialog (system font on purpose — it should look native)
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            bottom: insets.bottom + 32,
            width: 314,
            backgroundColor: palette.light.card,
            borderRadius: 28,
            paddingTop: 26,
            paddingHorizontal: 22,
            paddingBottom: 10,
            elevation: 16,
            zIndex: 5,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 15, backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.accent.amber }} />
              <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent.amber }} />
            </View>
          </View>
          <Text style={{ marginTop: 16, textAlign: 'center', fontSize: ms(16), lineHeight: ms(16) * 1.35, color: '#1b1b1a' }}>
            {t.permDialogTitle}
          </Text>
          <View style={{ marginTop: 20 }}>
            <Pressable onPress={() => void onAllow()} style={{ alignItems: 'center', padding: 13, borderRadius: 12 }}>
              <Text style={{ fontSize: ms(14), fontWeight: '600', color: palette.accent.blue }}>{t.permAllow}</Text>
            </Pressable>
            <Pressable onPress={denyPermission} style={{ alignItems: 'center', padding: 13, borderRadius: 12 }}>
              <Text style={{ fontSize: ms(14), fontWeight: '600', color: palette.accent.blue }}>{t.permDeny}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 5 }}>
          <AmberButton label={t.permEnterAnyway} onPress={() => void finishEnroll()} lang={lang} />
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 5: Run — expect PASS**, then `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: add contact-protocol permission screen"
```

---

### Task 9: Router wiring, back policy, first-run integration, device verification

**Files:**
- Modify: `src/shell/ScreenRouter.tsx`, `src/shell/__tests__/ScreenRouter.test.tsx`, `CLAUDE.md`
- Test: `src/shell/__tests__/ScreenRouter.test.tsx` (extended)

**Interfaces:**
- Consumes: all five enrollment screens, store
- Produces: router that renders enrollment steps; hardware back consumed (no-op) during enrollment; status bar dark-icons on light steps (`facility`, `baseline`, `consent`), light-icons elsewhere

- [ ] **Step 1: Extend the router test.** In `src/shell/__tests__/ScreenRouter.test.tsx`, add:

```tsx
test('enrollment steps render their screens', async () => {
  useFacilityStore.setState({ step: 'intake' });
  const intake = await render(<ScreenRouter />);
  expect(intake.getByText('BEGIN INTAKE ▸')).toBeTruthy();

  useFacilityStore.setState({ step: 'consent' });
  const consent = await render(<ScreenRouter />);
  expect(consent.getByText('Enrichment Agreement')).toBeTruthy();
});

test('hardware back is consumed during enrollment (no navigation)', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  useFacilityStore.setState({ step: 'consent' });
  await render(<ScreenRouter />);
  const handler = spy.mock.calls[0][1] as () => boolean;
  expect(handler()).toBe(true); // consumed
  expect(useFacilityStore.getState().step).toBe('consent'); // did not move
});

test('first run walks intake through to the facility and persists the gate', async () => {
  await storage.remove(KEYS.enrolled);
  useFacilityStore.setState({ step: 'intake', lang: 'en', permDenied: false, decline: 0, poked: false });
  const r = await render(<ScreenRouter />);
  await fireEvent.press(r.getByText('BEGIN INTAKE ▸'));
  await fireEvent.press(r.getByText('SUBMIT BASELINE ▸'));
  await fireEvent.press(r.getByText('I ACCEPT'));
  await fireEvent.press(r.getByText('ENTER THE FACILITY ▸'));
  await fireEvent.press(r.getByText('Allow'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(r.getByText(/SUBJECT #50640/)).toBeTruthy();
  expect(await storage.get(KEYS.enrolled)).toBe('1');
});
```

and extend the imports at the top:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { KEYS, storage } from '../../core/storage';
```

plus a module mock (top of file, with the other mocks):

```tsx
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
jest.mock('@react-native-community/slider', () => 'Slider');
```

- [ ] **Step 2: Run — expect FAIL** (router doesn't know the enrollment steps yet; back handler routes to facility during enrollment).

- [ ] **Step 3: Rewrite `src/shell/ScreenRouter.tsx`**

```tsx
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore, type Step } from '../core/store';
import { isLocked, registry } from '../modules/registry';
import type { ModuleDef } from '../modules/types';
import { AssignedScreen } from './enrollment/AssignedScreen';
import { BaselineScreen } from './enrollment/BaselineScreen';
import { ConsentScreen } from './enrollment/ConsentScreen';
import { IntakeScreen } from './enrollment/IntakeScreen';
import { PermissionScreen } from './enrollment/PermissionScreen';
import { FacilityScreen } from './FacilityScreen';
import { PlaceholderScreen } from './PlaceholderScreen';

const ENROLLMENT_STEPS: readonly Step[] = ['intake', 'baseline', 'consent', 'assigned', 'permission'];
const LIGHT_STEPS: readonly Step[] = ['facility', 'baseline', 'consent'];

const SHELL_SCREENS: Partial<Record<Step, React.ComponentType>> = {
  intake: IntakeScreen,
  baseline: BaselineScreen,
  consent: ConsentScreen,
  assigned: AssignedScreen,
  permission: PermissionScreen,
  facility: FacilityScreen,
};

// Conditional rendering IS the router (docs/architecture.md): instant swaps
// on a single step value, no navigation library.
export function ScreenRouter() {
  const step = useFacilityStore((s) => s.step);

  // Android system back: enrollment is non-optional (consume, stay put);
  // facility falls through to the default (leave the app); everything else
  // mirrors the ◂ arrow back to facility.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const state = useFacilityStore.getState();
      if (state.step === 'facility') return false;
      if (ENROLLMENT_STEPS.includes(state.step)) return true;
      state.setStep('facility');
      return true;
    });
    return () => sub.remove();
  }, []);

  // Light-enamel screens get dark status icons; V.E.R.A.'s dark screens, light.
  const bar = <StatusBar style={LIGHT_STEPS.includes(step) ? 'dark' : 'light'} />;

  const Shell = SHELL_SCREENS[step];
  if (Shell) {
    return (
      <>
        {bar}
        <Shell />
      </>
    );
  }

  const mod = registry.find((e): e is ModuleDef => !isLocked(e) && e.id === step);
  return (
    <>
      {bar}
      {/* non-module steps (settings, daily, …) arrive in phases 3–5 */}
      {mod ? <mod.Screen /> : <PlaceholderScreen title={step.toUpperCase()} />}
    </>
  );
}
```

- [ ] **Step 4: Run the full suite + typecheck**

```bash
npm test && npx tsc --noEmit
```

Expected: all suites pass, including the end-to-end first-run walk.

- [ ] **Step 5: Update `CLAUDE.md`.** Check off phase 2 in the build-progress list and update the phase-2 line:

```markdown
- [x] **Phase 2 — Enrollment flow** (intake → baseline → consent → assigned → permission) + first-run gate (AsyncStorage behind `core/storage.ts`; mmkv deferred by choice — merged 2026-07-17)
```

Also update the "Stay Expo Go-runnable" gotcha to say mmkv was deferred (phase 4 / skia is now the only dev-build trigger), and add to "What exists": `src/shell/enrollment/` (five screens), `core/storage.ts` seam, `hydrate()` boot gate, `tmpl()`.

- [ ] **Step 6: Manual device verification (Expo Go)**

Run `npx expo start`, open on the phone. AsyncStorage in Expo Go starts empty, so enrollment plays. Check against `design/screenshots/01…05`:

- Cold open: dark intake, scanline drifting, eye breathing, blinking cursor after V.E.R.A.'s line; BEGIN INTAKE ▸.
- Baseline: progress bar half; slider drags; motive cards select with amber highlight; tapping 한국어 flips the entire screen to Korean instantly (and back); the hint names your device's real language.
- Consent: clauses with bottom fade; tapping the checkbox flips the note to "IT WILL NOT UNCHECK. PLEASE STOP."; the decline button dodges your finger and escalates through are you sure? → think again → no → stop; I ACCEPT proceeds.
- Assigned: #50640 with the GOOD STANDING stamp popping in tilted.
- Permission: drawn OS dialog. Allow → real Expo Go notification prompt may appear → lands on facility. (To test the Deny path, re-run enrollment.)
- Hardware back during enrollment does nothing.
- Kill and relaunch the app in Expo Go: boots straight to facility — the gate persisted.
- To replay enrollment during dev: Android Settings → Apps → Expo Go → Storage → Clear storage (wipes AsyncStorage), or temporarily call `storage.remove(KEYS.enrolled)`.

- [ ] **Step 7: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: wire enrollment flow into router with first-run gate"
```

---

## Out of scope for phase 2 (build order, docs/architecture.md)

- Daily loop, streak/standing, missed-day, scheduled notifications → phase 3 (phase 2 only *requests* permission)
- Settings screen incl. "Re-process intake" (which calls `storage.remove(KEYS.enrolled)` + resets enrollment state) → phase 5
- mmkv migration → reconsider at phase 4 when Skia forces the dev build (user decision 2026-07-17)
- Editable designation — the prototype ships "Dana" as a static sample; changing that is a design decision, not an implementation gap
