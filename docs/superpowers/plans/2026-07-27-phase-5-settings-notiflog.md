# Settings + Transmission Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two remaining shell screens — Settings (`SUBJECT PREFERENCES`, light) and Transmission Log (`notiflog`, dark) — that the app already routes to but currently renders as placeholders.

**Architecture:** Two shell screens in their own folders (`src/shell/settings/`, `src/shell/notiflog/`), siblings of `daily`/`enrollment`, each with co-located `strings.ts` + tests. Settings wires new store actions (`reprocess`, `updateNotif`) and a storage helper (`clearAll`). The transmission log renders a static authored 5-card list; message copy is shared from `core/notifications.ts` (extended + exported), chrome is local. `ScreenRouter` registers both.

**Tech Stack:** React Native + Expo (TypeScript), Zustand store, AsyncStorage seam, `react-native-reanimated` (already present; not required here), Jest 29 + React Testing Library v14 (async).

## Global Constraints

- **Copy verbatim** from `STR.en`/`STR.ko` in `design/The Facility.dc.html` (settings: en 864–869, ko 1005–1010; notiflog: en 907–918, ko 1048–1059). Korean is provisional (later Phase 5 native-speaker pass).
- **Hex values verbatim** from the mock (settings lines 601–652, notiflog 654–712, helpers 1109–1119). Use `palette`/`font`/`ms` from `src/core/theme.ts`; `palette.light.*` for the settings screen.
- `ms(px)` = `Math.round(px * 1.1 * 2) / 2`; `font('display'|'mono', weight, lang)`.
- The selected language button is **amber** (`#fff6e3` bg, `1.5px #f4b43a` border, `#17171a` text, amber `✓`); unselected is `#f4f3ee` bg, `1px #dcd9cf` border, `#8a8578` text, no tick (`optCard`/`tick`, lines 1109–1119).
- `core` must never import from `shell`. Shared message copy lives in `core/notifications.ts`; `notiflog` imports it.
- Verify with `npm test` and `npx tsc --noEmit`. Jest 29; RTL v14 fully async (`await render`, `await fireEvent`, `waitFor`); `globalThis` not `global`. AsyncStorage uses the official functional jest mock (already wired in `jest.setup.ts`).
- Commit messages: **no** Claude/model co-author footer.
- Spec: `docs/superpowers/specs/2026-07-27-settings-notiflog-design.md`.

---

### Task 1: Core — `storage.clearAll` + store `reprocess`/`updateNotif`

**Files:**
- Modify: `src/core/storage.ts`
- Modify: `src/core/store.ts`
- Test: `src/core/__tests__/storage.test.ts`, `src/core/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `KEYS`, `storage` (`src/core/storage.ts`); `syncScheduledTransmissions` (`src/core/notifications.ts`, existing signature `(enabled: boolean, lang: Lang, now?: Date) => Promise<void>`).
- Produces:
  - `storage.clearAll(): Promise<void>`
  - `useFacilityStore` gains `reprocess(): Promise<void>` and `updateNotif(enabled: boolean): Promise<void>`.

- [ ] **Step 1: Write the failing storage test**

Add to `src/core/__tests__/storage.test.ts`:

```ts
test('clearAll removes every known key', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.streak, '5');
  await storage.clearAll();
  expect(await storage.get(KEYS.enrolled)).toBeNull();
  expect(await storage.get(KEYS.streak)).toBeNull();
});
```

(If `storage.test.ts` does not already import `KEYS, storage`, add `import { KEYS, storage } from '../storage';` at the top.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/core/__tests__/storage.test.ts`
Expected: FAIL — `storage.clearAll is not a function`.

- [ ] **Step 3: Implement `clearAll`**

In `src/core/storage.ts`, add `clearAll` to the `storage` object:

```ts
export const storage = {
  get: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  set: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  remove: (key: string): Promise<void> => AsyncStorage.removeItem(key),
  clearAll: (): Promise<void> => AsyncStorage.multiRemove(Object.values(KEYS)),
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/core/__tests__/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing store test**

At the top of `src/core/__tests__/store.test.ts`, add a mock for the notifications module (so `updateNotif` can be asserted without touching the real executor). Place it beside the existing `expo-localization` mock:

```ts
jest.mock('../notifications', () => ({
  syncScheduledTransmissions: jest.fn(async () => {}),
}));
const { syncScheduledTransmissions } = jest.requireMock('../notifications');
```

Then add these tests (anywhere after the existing `beforeEach`):

```ts
test('reprocess wipes storage, resets state to intake, keeps lang', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.streak, '7');
  useFacilityStore.setState({ step: 'settings', lang: 'ko', streak: 7, name: 'X', standing: 'probation' });

  await useFacilityStore.getState().reprocess();

  expect(await storage.get(KEYS.enrolled)).toBeNull();
  expect(await storage.get(KEYS.streak)).toBeNull();
  const s = useFacilityStore.getState();
  expect(s.step).toBe('intake');
  expect(s.streak).toBe(0);
  expect(s.name).toBe('');
  expect(s.standing).toBe('good');
  expect(s.lang).toBe('ko'); // language preserved for the intake replay
});

test('updateNotif sets state, persists, and syncs the scheduler', async () => {
  await useFacilityStore.getState().updateNotif(false);
  expect(useFacilityStore.getState().notif).toBe(false);
  expect(await storage.get(KEYS.notif)).toBe('0');
  expect(syncScheduledTransmissions).toHaveBeenCalledWith(false, 'en');

  await useFacilityStore.getState().updateNotif(true);
  expect(useFacilityStore.getState().notif).toBe(true);
  expect(await storage.get(KEYS.notif)).toBe('1');
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- src/core/__tests__/store.test.ts`
Expected: FAIL — `reprocess is not a function` / `updateNotif is not a function`.

- [ ] **Step 7: Implement the store actions**

In `src/core/store.ts`:

Add the import near the other core imports:

```ts
import { syncScheduledTransmissions } from './notifications';
```

Add to the `FacilityState` interface (next to `setNotif`):

```ts
  reprocess: () => Promise<void>;
  updateNotif: (enabled: boolean) => Promise<void>;
```

Add the implementations inside the store (e.g. after `setNotif`):

```ts
  reprocess: async () => {
    await storage.clearAll();
    // Full wipe → fresh enrollment. lang is intentionally preserved in memory
    // so the intake screen renders in the language the subject is reading; the
    // persisted lang key was cleared, so a cold launch re-detects the locale.
    set({
      step: 'intake',
      name: '',
      adequacy: 64,
      motive: 1,
      decline: 0,
      poked: false,
      permDenied: false,
      notif: true,
      streak: 0,
      standing: 'good',
      lastComply: null,
      enrolledAt: null,
      missedPending: false,
      forfeited: 0,
    });
  },
  updateNotif: async (enabled) => {
    set({ notif: enabled });
    await storage.set(KEYS.notif, enabled ? '1' : '0');
    await syncScheduledTransmissions(enabled, get().lang);
  },
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- src/core/__tests__/store.test.ts src/core/__tests__/storage.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/core/storage.ts src/core/store.ts src/core/__tests__/storage.test.ts src/core/__tests__/store.test.ts
git commit -m "feat: storage.clearAll + store reprocess/updateNotif actions"
```

---

### Task 2: Settings screen

**Files:**
- Create: `src/shell/settings/strings.ts`
- Create: `src/shell/settings/SettingsScreen.tsx`
- Test: `src/shell/settings/__tests__/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `useFacilityStore` (`lang`, `notif`, `setLang`, `reprocess`, `updateNotif`, `setStep`); `font`, `ms`, `palette`; `useSafeAreaInsets`.
- Produces: `export function SettingsScreen(): JSX.Element` (used by the router in Task 4).

Reference pattern for header/back layout: `src/shell/daily/DailyScreen.tsx` (light screen, sticky header, `◂` back).

- [ ] **Step 1: Write the failing test**

Create `src/shell/settings/__tests__/SettingsScreen.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { KEYS, storage } from '../../../core/storage';
import { settingsStrings } from '../strings';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../../core/notifications', () => ({
  syncScheduledTransmissions: jest.fn(async () => {}),
}));

const t = settingsStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'settings', lang: 'en', notif: true });
});

test('renders language buttons, all program rows, VERA line, and footer', async () => {
  const { getByText } = await render(<SettingsScreen />);
  expect(getByText(t.settingsTitle)).toBeTruthy();
  expect(getByText('English')).toBeTruthy();
  expect(getByText('한국어')).toBeTruthy();
  expect(getByText(t.reprocess)).toBeTruthy();
  expect(getByText(t.notif)).toBeTruthy();
  expect(getByText(t.notifLog)).toBeTruthy();
  expect(getByText(t.settingsVera)).toBeTruthy();
  expect(getByText(t.build)).toBeTruthy();
});

test('tapping 한국어 switches the language', async () => {
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText('한국어'));
  expect(useFacilityStore.getState().lang).toBe('ko');
});

test('re-process wipes storage and routes to intake', async () => {
  await storage.set(KEYS.enrolled, '1');
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText(t.reprocess));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('intake'));
  expect(await storage.get(KEYS.enrolled)).toBeNull();
});

test('toggling notifications persists the flag', async () => {
  const { getByLabelText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('notifications'));
  expect(useFacilityStore.getState().notif).toBe(false);
  await waitFor(async () => expect(await storage.get(KEYS.notif)).toBe('0'));
});

test('transmission-log row opens the notiflog step', async () => {
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText(t.notifLog));
  expect(useFacilityStore.getState().step).toBe('notiflog');
});

test('back arrow returns to the facility', async () => {
  const { getByLabelText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'settings', lang: 'ko' });
  const { getByText } = await render(<SettingsScreen />);
  expect(getByText(settingsStrings.ko.settingsTitle)).toBeTruthy();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/shell/settings/__tests__/SettingsScreen.test.tsx`
Expected: FAIL — `Cannot find module '../strings'` / `../SettingsScreen`.

- [ ] **Step 3: Write the strings module**

Create `src/shell/settings/strings.ts` (the `·` is U+00B7; `build`/`code` are identical in both languages):

```ts
import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is later Phase 5. `code`/`build` are the
// mock's static stamps (identical in both languages).
const en = {
  settingsTitle: 'SUBJECT PREFERENCES',
  code: '#50640',
  langOfCompliance: 'LANGUAGE OF COMPLIANCE',
  detectedNote: 'Change applies immediately.',
  programWord: 'PROGRAM',
  reprocess: 'Re-process intake',
  reprocessSub: 'replay enrollment from the beginning',
  notif: 'Notifications',
  notifSub: 'V.E.R.A. will reach you regardless',
  notifLog: 'Transmission log',
  notifLogSub: 'everything V.E.R.A. sent today',
  veraKicker: 'V.E.R.A.',
  settingsVera: 'You may adjust these settings freely. I will adjust my expectations accordingly.',
  build: 'PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640',
};

export type SettingsStrings = typeof en;

const ko: SettingsStrings = {
  settingsTitle: '대상자 환경설정',
  code: '#50640',
  langOfCompliance: '준수 언어',
  detectedNote: '변경은 즉시 적용됩니다.',
  programWord: '프로그램',
  reprocess: '접수 재처리',
  reprocessSub: '처음부터 등록을 다시 진행합니다',
  notif: '알림',
  notifSub: 'V.E.R.A.는 어떻게든 귀하에게 연락합니다',
  notifLog: '전송 기록',
  notifLogSub: 'V.E.R.A.가 오늘 보낸 모든 것',
  veraKicker: 'V.E.R.A.',
  settingsVera: '이 설정은 자유롭게 조정하실 수 있습니다. 저 또한 그에 맞추어 기대치를 조정하겠습니다.',
  build: 'PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640',
};

export const settingsStrings: Strings<SettingsStrings> = { en, ko };
```

- [ ] **Step 4: Write the screen**

Create `src/shell/settings/SettingsScreen.tsx`:

```tsx
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { settingsStrings } from './strings';

const L = palette.light;

// Amber-selected language option (optCard/tick, mock lines 1109–1119).
function LangButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: active ? '#fff6e3' : '#f4f3ee',
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? '#f4b43a' : '#dcd9cf',
      }}
    >
      <Text style={{ fontFamily: font('display', active ? 600 : 500), fontSize: ms(14), color: active ? L.ink : L.textDim }}>{label}</Text>
      {active ? <Text style={{ color: '#f4b43a', fontSize: ms(14) }}>✓</Text> : null}
    </Pressable>
  );
}

// Custom pill toggle (mock lines 1240–1241): 40×23 track, 18px white knob.
function NotifToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="notifications"
      style={{ width: 40, height: 23, borderRadius: 12, backgroundColor: on ? '#f4b43a' : '#cbc7bb' }}
    >
      <View style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

function ProgramRow({ title, sub, right, onPress, divider }: { title: string; sub: string; right: React.ReactNode; onPress?: () => void; divider: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: '#e4e1d7',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font('display', 600), fontSize: ms(13.5), color: L.ink }}>{title}</Text>
        <Text style={{ marginTop: 3, fontFamily: font('mono', 500), fontSize: ms(9), color: L.textDim }}>{sub}</Text>
      </View>
      {right}
    </Pressable>
  );
}

export function SettingsScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const notif = useFacilityStore((s) => s.notif);
  const setLang = useFacilityStore((s) => s.setLang);
  const setStep = useFacilityStore((s) => s.setStep);
  const reprocess = useFacilityStore((s) => s.reprocess);
  const updateNotif = useFacilityStore((s) => s.updateNotif);
  const insets = useSafeAreaInsets();
  const t = settingsStrings[lang];

  const chevron = <Text style={{ color: '#b3aea1', fontSize: ms(15) }}>▸</Text>;
  const setL = (l: Lang) => () => setLang(l);

  return (
    <View style={{ flex: 1, backgroundColor: L.bg, paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 11, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#dcd9cf' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: L.inkSoft }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: L.ink }}>{t.settingsTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), letterSpacing: ms(9) * 0.06, color: L.textDim }}>{t.code}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* language */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: L.textDim }}>{t.langOfCompliance}</Text>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 9 }}>
            <LangButton label="English" active={lang === 'en'} onPress={setL('en')} />
            <LangButton label="한국어" active={lang === 'ko'} onPress={setL('ko')} />
          </View>
          <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4fd08a' }} />
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: L.textDim }}>{t.detectedNote}</Text>
          </View>
        </View>

        {/* program */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: L.textDim }}>{t.programWord}</Text>
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#dcd9cf', borderRadius: 13, overflow: 'hidden', backgroundColor: '#f4f3ee' }}>
            <ProgramRow title={t.reprocess} sub={t.reprocessSub} right={chevron} onPress={() => { void reprocess(); }} divider />
            <ProgramRow title={t.notif} sub={t.notifSub} right={<NotifToggle on={notif} onToggle={() => { void updateNotif(!notif); }} />} divider />
            <ProgramRow title={t.notifLog} sub={t.notifLogSub} right={chevron} onPress={() => setStep('notiflog')} divider={false} />
          </View>
        </View>

        {/* V.E.R.A. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={{ backgroundColor: '#17171a', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderLeftWidth: 3, borderLeftColor: '#ff6a1a' }}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: '#f4b43a', marginBottom: 5 }}>{t.veraKicker}</Text>
            <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12), lineHeight: ms(12) * 1.55, color: '#f2e7d3' }}>{t.settingsVera}</Text>
          </View>
        </View>

        {/* footer */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#b3aea1' }}>{t.build}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- src/shell/settings/__tests__/SettingsScreen.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shell/settings
git commit -m "feat: settings screen (SUBJECT PREFERENCES: language, program, toggle)"
```

---

### Task 3: Transmission Log (notiflog) screen

**Files:**
- Modify: `src/core/notifications.ts` (widen + export `notifStrings`)
- Create: `src/shell/notiflog/strings.ts`
- Create: `src/shell/notiflog/NotifLogScreen.tsx`
- Test: `src/shell/notiflog/__tests__/NotifLogScreen.test.tsx`

**Interfaces:**
- Consumes: `notifStrings` (from `core/notifications.ts`, after widening); `useFacilityStore` (`lang`, `setStep`); `font`, `ms`; `useSafeAreaInsets`.
- Produces: `export function NotifLogScreen(): JSX.Element` (used by the router in Task 4); `export const notifStrings` (core); `notiflogStrings`, `CARDS`, `NotifCard` (from `notiflog/strings.ts`).

- [ ] **Step 1: Widen + export `notifStrings`**

In `src/core/notifications.ts`, change `const notifStrings = {` to `export const notifStrings = {` and add the four display-only message fields to **both** `en` and `ko` (the `·` in the sender variants is U+00B7). The `en` block becomes:

```ts
export const notifStrings = {
  en: {
    sender: 'The Facility',
    senderOrg: 'The Facility · Support Organism',
    senderHaz: 'The Facility · Hazard Assessment',
    n1Title: 'DAILY COMPLIANCE WINDOW: OPEN',
    n1Body: 'Confirm you have not been replaced. The window closes at 23:59. This is a courtesy. The courtesy is monitored.',
    n2Body: 'Specimen-03 has eaten 0 steps today. It is looking at the door.',
    n3Body: 'Reminder: you have not complied. I am not angry. I am a system. Systems are disappointed.',
    n4Body: 'Entity census updated without your involvement. The count went up. Do not investigate.',
    n5Title: 'FINAL COURTESY',
    n5Body: 'You have not confirmed you exist today. Specimen-03 has been informed. It is doing the eyes.',
  },
  ko: {
    sender: 'The Facility',
    senderOrg: 'The Facility · 지원 유기체',
    senderHaz: 'The Facility · 위험 평가',
    n1Title: '일일 이행 창구: 열림',
    n1Body: '귀하가 교체되지 않았음을 확인하십시오. 창구는 23:59에 닫힙니다. 이것은 호의입니다. 호의는 감시됩니다.',
    n2Body: '표본-03은 오늘 0보를 먹었습니다. 문 쪽을 보고 있습니다.',
    n3Body: '알림: 귀하는 아직 이행하지 않았습니다. 저는 화나지 않았습니다. 저는 시스템입니다. 시스템은 실망합니다.',
    n4Body: '개체 조사가 귀하의 관여 없이 갱신되었습니다. 수가 늘었습니다. 조사하지 마십시오.',
    n5Title: '최종 호의',
    n5Body: '귀하는 오늘 존재를 확인하지 않았습니다. 표본-03에게 통보되었습니다. 그 눈을 하고 있습니다.',
  },
} as const;
```

(`planTransmissions` still reads `t.n1Title/n3Body/n5Title` — unchanged.)

- [ ] **Step 2: Run the existing notifications test to confirm no regression**

Run: `npm test -- src/core/__tests__/notifications.test.ts`
Expected: PASS (planner output unchanged).

- [ ] **Step 3: Write the failing screen test**

Create `src/shell/notiflog/__tests__/NotifLogScreen.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { notifStrings } from '../../../core/notifications';
import { notiflogStrings } from '../strings';
import { NotifLogScreen } from '../NotifLogScreen';

const m = notifStrings.en;
const c = notiflogStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'notiflog', lang: 'en' });
});

test('renders all five transmission cards, titles, remain badge, and footer', async () => {
  const { getByText } = await render(<NotifLogScreen />);
  expect(getByText(c.notifLogTitle)).toBeTruthy();
  expect(getByText(m.n1Body)).toBeTruthy();
  expect(getByText(m.n2Body)).toBeTruthy();
  expect(getByText(m.n3Body)).toBeTruthy();
  expect(getByText(m.n4Body)).toBeTruthy();
  expect(getByText(m.n5Body)).toBeTruthy();
  expect(getByText(m.n1Title)).toBeTruthy();
  expect(getByText(m.n5Title)).toBeTruthy();
  expect(getByText(c.nRemain)).toBeTruthy();
  expect(getByText(c.nFooter)).toBeTruthy();
});

test('a COMPLY NOW action opens the daily loop', async () => {
  const { getAllByText } = await render(<NotifLogScreen />);
  await fireEvent.press(getAllByText(c.nComply)[0]);
  expect(useFacilityStore.getState().step).toBe('daily');
});

test('back arrow returns to settings', async () => {
  const { getByLabelText } = await render(<NotifLogScreen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('settings');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'notiflog', lang: 'ko' });
  const { getByText } = await render(<NotifLogScreen />);
  expect(getByText(notiflogStrings.ko.notifLogTitle)).toBeTruthy();
  expect(getByText(notifStrings.ko.n1Body)).toBeTruthy();
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test -- src/shell/notiflog/__tests__/NotifLogScreen.test.tsx`
Expected: FAIL — `Cannot find module '../strings'` / `../NotifLogScreen`.

- [ ] **Step 5: Write the strings + card model**

Create `src/shell/notiflog/strings.ts`:

```ts
import type { Strings } from '../../core/i18n';
import type { notifStrings } from '../../core/notifications';

type Msg = (typeof notifStrings)['en'];

// Chrome copy verbatim from STR.en/STR.ko. notifLogDate/nRemain are the mock's
// static stamps (a live date/countdown is out of scope).
const en = {
  notifLogTitle: 'TRANSMISSION LOG',
  notifLogDate: 'MON, MAR 2',
  nComply: 'COMPLY NOW',
  nDefer: 'DEFER (RECORDED)',
  nRemain: '2H 12M REMAIN',
  nFooter: 'end of log · V.E.R.A. is aware you read this',
};

export type NotifLogStrings = typeof en;

const ko: NotifLogStrings = {
  notifLogTitle: '전송 기록',
  notifLogDate: '3월 2일 (월)',
  nComply: '지금 이행',
  nDefer: '연기 (기록됨)',
  nRemain: '2시간 12분 남음',
  nFooter: '기록 끝 · V.E.R.A.는 귀하가 이것을 읽었음을 알고 있습니다',
};

export const notiflogStrings: Strings<NotifLogStrings> = { en, ko };

// Lang-independent structure of the day's five transmissions. Copy is pulled at
// render time from notifStrings[lang] (message) + notiflogStrings[lang] (chrome).
export type NotifCard = {
  senderKey: Extract<keyof Msg, 'sender' | 'senderOrg' | 'senderHaz'>;
  time: string;
  dot: string;
  size: 'big' | 'small';
  titleKey?: Extract<keyof Msg, 'n1Title' | 'n5Title'>;
  bodyKey: Extract<keyof Msg, 'n1Body' | 'n2Body' | 'n3Body' | 'n4Body' | 'n5Body'>;
  comply?: boolean;
  defer?: boolean;
  remain?: boolean;
};

export const CARDS: NotifCard[] = [
  { senderKey: 'sender', time: '09:00', dot: '#f4b43a', size: 'big', titleKey: 'n1Title', bodyKey: 'n1Body', comply: true, defer: true },
  { senderKey: 'senderOrg', time: '11:30', dot: '#4fd08a', size: 'small', bodyKey: 'n2Body' },
  { senderKey: 'sender', time: '14:12', dot: '#f4b43a', size: 'small', bodyKey: 'n3Body' },
  { senderKey: 'senderHaz', time: '17:40', dot: '#ff5a48', size: 'small', bodyKey: 'n4Body' },
  { senderKey: 'sender', time: '21:47', dot: '#ff6a1a', size: 'big', titleKey: 'n5Title', bodyKey: 'n5Body', comply: true, remain: true },
];
```

- [ ] **Step 6: Write the screen**

Create `src/shell/notiflog/NotifLogScreen.tsx`:

```tsx
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notifStrings } from '../../core/notifications';
import { useFacilityStore } from '../../core/store';
import { font, ms } from '../../core/theme';
import { CARDS, notiflogStrings, type NotifCard } from './strings';

function TransmissionCard({ card, lang, onComply }: { card: NotifCard; lang: 'en' | 'ko'; onComply: () => void }) {
  const m = notifStrings[lang];
  const c = notiflogStrings[lang];
  const big = card.size === 'big';
  const avatar = big ? 30 : 22;
  const dot = big ? 11 : 8;

  return (
    <View
      style={{
        backgroundColor: big ? '#201f1b' : '#1c1b17',
        borderWidth: 1,
        borderColor: card.remain ? '#ff6a1a44' : '#2c2a22',
        borderRadius: big ? 24 : 20,
        paddingVertical: big ? 14 : 11,
        paddingHorizontal: 15,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: avatar, height: avatar, borderRadius: big ? 9 : 7, backgroundColor: '#17171a', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: card.dot }} />
        </View>
        <Text style={{ flex: 1, fontFamily: font('mono', 500, lang), fontSize: ms(big ? 10 : 9.5), color: '#8a8578' }}>
          {`${m[card.senderKey]} · ${card.time}`}
        </Text>
        {card.remain ? <Text style={{ fontFamily: font('mono', 600), fontSize: ms(9), letterSpacing: ms(9) * 0.08, color: '#ff5a48' }}>{c.nRemain}</Text> : null}
      </View>

      {card.titleKey ? (
        <Text style={{ marginTop: 10, fontFamily: font('display', 700, lang), fontSize: ms(13.5), color: '#f4efe2' }}>{m[card.titleKey]}</Text>
      ) : null}
      <Text style={{ marginTop: card.titleKey ? 5 : 7, fontFamily: font('display', 500, lang), fontSize: ms(big ? 12 : 11.5), lineHeight: ms(big ? 12 : 11.5) * 1.5, color: '#b9b09a' }}>
        {m[card.bodyKey]}
      </Text>

      {card.comply || card.defer ? (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 18 }}>
          {card.comply ? (
            <Pressable onPress={onComply} accessibilityRole="button">
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.06, color: card.remain ? '#ff8a4a' : '#f4b43a' }}>{c.nComply}</Text>
            </Pressable>
          ) : null}
          {card.defer ? (
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.06, color: '#8a8578' }}>{c.nDefer}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function NotifLogScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const c = notiflogStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: '#131211', paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#26251f' }}>
        <Pressable hitSlop={16} onPress={() => setStep('settings')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8578' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{c.notifLogTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#57534a' }}>{c.notifLogDate}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: insets.bottom + 22, gap: 8 }}>
        {CARDS.map((card) => (
          <TransmissionCard key={card.time} card={card} lang={lang} onComply={() => setStep('daily')} />
        ))}
        <Text style={{ textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.08, color: '#57534a', paddingTop: 6 }}>{c.nFooter}</Text>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 7: Run it to verify it passes**

Run: `npm test -- src/shell/notiflog/__tests__/NotifLogScreen.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/core/notifications.ts src/shell/notiflog
git commit -m "feat: transmission log screen (notiflog: 5 authored cards)"
```

---

### Task 4: Router wiring + verification + docs

**Files:**
- Modify: `src/shell/ScreenRouter.tsx`
- Modify: `src/shell/__tests__/ScreenRouter.test.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `SettingsScreen` (Task 2), `NotifLogScreen` (Task 3).

- [ ] **Step 1: Update the router test first**

In `src/shell/__tests__/ScreenRouter.test.tsx`, replace the block that renders the settings placeholder. It currently reads:

```tsx
test('not-yet-built shell steps fall back to a placeholder', async () => {
  useFacilityStore.setState({ step: 'settings' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('SETTINGS')).toBeTruthy();
});
```

Replace it with two tests that assert the real screens render:

```tsx
test('settings step renders the real settings screen', async () => {
  useFacilityStore.setState({ step: 'settings' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('SUBJECT PREFERENCES')).toBeTruthy();
});

test('notiflog step renders the real transmission log', async () => {
  useFacilityStore.setState({ step: 'notiflog' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('TRANSMISSION LOG')).toBeTruthy();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/shell/__tests__/ScreenRouter.test.tsx`
Expected: FAIL — settings still renders the `SETTINGS` placeholder; `SUBJECT PREFERENCES` not found.

- [ ] **Step 3: Wire the router**

In `src/shell/ScreenRouter.tsx`:

Add imports (beside the other screen imports):

```tsx
import { SettingsScreen } from './settings/SettingsScreen';
import { NotifLogScreen } from './notiflog/NotifLogScreen';
```

Add both to `SHELL_SCREENS`:

```tsx
const SHELL_SCREENS: Partial<Record<Step, React.ComponentType>> = {
  intake: IntakeScreen,
  baseline: BaselineScreen,
  consent: ConsentScreen,
  assigned: AssignedScreen,
  permission: PermissionScreen,
  facility: FacilityScreen,
  settings: SettingsScreen,
  daily: DailyScreen,
  missed: MissedScreen,
  notiflog: NotifLogScreen,
};
```

Add `settings` to `LIGHT_STEPS` (notiflog stays dark, so it is NOT added):

```tsx
const LIGHT_STEPS: readonly Step[] = ['facility', 'baseline', 'consent', 'daily', 'missed', 'settings'];
```

In the hardware-back handler, special-case `notiflog` → settings so it mirrors the ◂ arrow. Replace the final fallback lines:

```tsx
      state.setStep('facility');
      return true;
```

with:

```tsx
      state.setStep(state.step === 'notiflog' ? 'settings' : 'facility');
      return true;
```

Remove the now-obsolete comment `{/* settings and notiflog arrive in phase 5 */}`.

- [ ] **Step 4: Run the router test to verify it passes**

Run: `npm test -- src/shell/__tests__/ScreenRouter.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck**

Run: `npm test`
Expected: PASS — all suites green.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Update `CLAUDE.md`**

In the "Build progress" list, update the Phase 5 line. It currently reads:

```
- [ ] **Phase 5 — Polish:** transmission log, settings, Korean native-speaker copy pass, EAS build for friends
```

Replace with:

```
- [ ] **Phase 5 — Polish:** ~~transmission log~~ ✅ · ~~settings~~ ✅ (both merged 2026-07-27 — plan: `docs/superpowers/plans/2026-07-27-phase-5-settings-notiflog.md`; settings = language switch + re-process full-wipe + real notifications toggle; notiflog = 5 authored cards, back→settings), Korean native-speaker copy pass, EAS build for friends
```

- [ ] **Step 7: Commit**

```bash
git add src/shell/ScreenRouter.tsx src/shell/__tests__/ScreenRouter.test.tsx CLAUDE.md
git commit -m "feat: route settings + notiflog; mark phase 5 screens done"
```

---

## Notes for the implementer

- **On-device visual check (optional, not test-gated):** run `npx expo start`. Settings → toggle Notifications on a dev build actually schedules/cancels V.E.R.A. transmissions (real `expo-notifications`); under Expo Go it safely no-ops. Re-process intake should drop you back to the intake screen in your current language, with a wiped record.
- Do not touch `FacilityScreen`'s prefs button (already calls `setStep('settings')`) or `planTransmissions` (its scheduled subset is intentionally narrower than the log's 5-card display).
- Settings is light; its status-bar icons go dark via `LIGHT_STEPS`. Notiflog is dark and keeps light icons (default).
