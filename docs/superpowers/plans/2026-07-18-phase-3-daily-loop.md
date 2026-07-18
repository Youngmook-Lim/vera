# Phase 3: Daily Loop + Streak/Standing + Missed-Day + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the daily compliance loop (hold-to-comply ring → optional audit → verdict), real persisted streak/standing, the missed-day consequence flow, and Expo Go-gated scheduled local notifications.

**Architecture:** Event-driven on app open, nothing in the background (docs/architecture.md): compliance state is a pure function of (persisted dates, now), evaluated during `hydrate()`. The daily/missed screens live in `src/shell/daily/` mirroring the enrollment-folder pattern. Notifications follow the phase-2 lesson: a pure planner plus an impure executor that is lazy-`require()`d and skipped entirely under Expo Go (dev build postponed by user decision 2026-07-18).

**Tech Stack:** Existing stack + `react-native-svg` (Expo Go-compatible; draws the progress ring — Skia stays phase 4).

## Global Constraints

- Everything from phases 1–2 still binds: copy verbatim from prototype `STR` tables, hexes from `design/README.md`, `ms()` for type / raw mock px for layout, RTL v14 async tests, jest 29, conventional commits without AI attribution, docs/architecture.md untouched.
- **Expo Go stays the runtime.** Only new package: `react-native-svg` (in Expo Go). `expo-notifications` must NEVER be imported statically — lazy `require()` behind `isRunningInExpoGo()` only (see CLAUDE.md gotcha + `PermissionScreen.onAllow`).
- **Prototype reference:** daily screen lines 716–749, missed screen lines 751–793 of `design/The Facility.dc.html`; logic `dStart/dEnd/dComplete` lines 1157–1185, `mPetition/mReset` 1187–1194; screenshots `08-daily.png`, `09-missed.png`.
- **Timings verbatim:** hold-to-comply 2200ms; audit deliberation 2200ms; petition review 1900ms; spinner `fspin` 900ms linear; verdict stamp 600ms `cubic-bezier(.2,.7,.3,1.4)`.
- **New storage keys:** `facility.streak.v1`, `facility.standing.v1`, `facility.lastComply.v1`, `facility.enrolledAt.v1`, `facility.missedPending.v1`, `facility.forfeited.v1` (all string values; numbers stringified).
- **Timers MUST be cleaned up** on unmount/screen exit (audit timeout, petition timeout, hold animation) — called out as an implementation risk in the design handoff.
- **Demo affordances are NOT built:** the prototype's `SIMULATE AUDIT` chip and `reset demo` links are review tools; production audits are random (`rollAudit()`, ~1 in 5 — "Today is occasionally."). The `demo: miss a day` link stays absent (phase 1 decision).
- **Deliberate copy deviations** (same pattern as phase 2's `{device}`): `streakForfeited` becomes `'{n}-DAY STREAK FORFEITED'` / `'{n}일 연속 기록 몰수'`; shell `day01` is replaced by `dayN: 'DAY {n}'` / `'{n}일차'` (en zero-pads n to 2). Everything else verbatim.
- **Standing never returns to `good`** once lost (good → review at miss detection → probation via petition, permanently). This is intentional — "infractions are permanent". Do not build recovery.
- V.E.R.A. lines live in the `src/vera` corpus; the missed screen's transmission panel has a **red** (#d63a2a) left border — VeraPanel gains an optional `accent` prop (default stays orange).

## File Structure (phase 3 additions)

```
src/core/compliance.ts             # pure date/compliance functions + rollAudit
src/core/notifications.ts          # notif copy + pure planner + gated executor
src/core/storage.ts                # MODIFY: 6 new KEYS
src/core/store.ts                  # MODIFY: streak/standing fields, completeComply,
                                   #   petitionReinstatement, hydrate miss-detection,
                                   #   finishEnroll records enrolledAt
src/shell/daily/strings.ts         # daily + missed copy, en/ko
src/shell/daily/ComplyRing.tsx     # svg hold ring (2.2s, cancel-safe)
src/shell/daily/DailyScreen.tsx
src/shell/daily/MissedScreen.tsx
src/shell/strings.ts               # MODIFY: day01 → dayN, + underReview/probation
src/shell/components/VeraPanel.tsx # MODIFY: optional accent prop
src/shell/FacilityScreen.tsx       # MODIFY: real DAY n, standing pill, comply routing
src/shell/ScreenRouter.tsx         # MODIFY: daily/missed steps + LIGHT_STEPS
App.tsx                            # MODIFY: sync notifications after hydrate
CLAUDE.md                          # MODIFY (final task)
```

---

### Task 1: Compliance core + store state machine

**Files:**
- Create: `src/core/compliance.ts`
- Modify: `src/core/storage.ts` (add KEYS), `src/core/store.ts`
- Test: `src/core/__tests__/compliance.test.ts`, `src/core/__tests__/store.test.ts` (extend)

**Interfaces:**
- Consumes: phase 2 `storage`/`KEYS`, `useFacilityStore`
- Produces:
  - `dayKey(d: Date): string` (local `YYYY-MM-DD`), `prevDayKey(d: Date): string`
  - `type ComplianceState = 'done' | 'due' | 'missed'`; `assessCompliance(lastComply: string | null, now: Date): ComplianceState` — `done` if lastComply is today; `due` if null (never complied — enrollment day) or yesterday; `missed` otherwise
  - `tenureDays(enrolledAt: string | null, now: Date): number` — 1-based days since enrollment (min 1)
  - `rollAudit(): boolean` — `Math.random() < 0.2`
  - `KEYS` additions: `streak: 'facility.streak.v1'`, `standing: 'facility.standing.v1'`, `lastComply: 'facility.lastComply.v1'`, `enrolledAt: 'facility.enrolledAt.v1'`, `missedPending: 'facility.missedPending.v1'`, `forfeited: 'facility.forfeited.v1'`
  - Store fields: `streak: number` (0), `standing: 'good' | 'review' | 'probation'` ('good'), `lastComply: string | null` (null), `enrolledAt: string | null` (null), `missedPending: boolean` (false), `forfeited: number` (0)
  - Store actions: `completeComply(now?: Date): Promise<void>` (streak = lastComply === yesterday ? streak+1 : 1; sets+persists streak/lastComply); `petitionReinstatement(): Promise<void>` (standing 'probation', missedPending false, persisted)
  - `hydrate()` additionally reads the six keys and, when `assessCompliance(...) === 'missed'` and `missedPending` was not already set, performs the forfeit: persists `forfeited = streak`, `streak = 0`, `standing = 'review'`, `missedPending = '1'`
  - `finishEnroll()` additionally persists `enrolledAt = dayKey(new Date())`

- [ ] **Step 1: Write the failing compliance test**

`src/core/__tests__/compliance.test.ts`:

```ts
import { assessCompliance, dayKey, prevDayKey, tenureDays } from '../compliance';

const d = (s: string) => new Date(`${s}T12:00:00`);

test('dayKey and prevDayKey are local calendar days', () => {
  expect(dayKey(d('2026-07-18'))).toBe('2026-07-18');
  expect(prevDayKey(d('2026-07-18'))).toBe('2026-07-17');
  expect(prevDayKey(d('2026-03-01'))).toBe('2026-02-28');
});

test('assessCompliance: today done, yesterday/never due, older missed', () => {
  const now = d('2026-07-18');
  expect(assessCompliance('2026-07-18', now)).toBe('done');
  expect(assessCompliance('2026-07-17', now)).toBe('due');
  expect(assessCompliance(null, now)).toBe('due');
  expect(assessCompliance('2026-07-16', now)).toBe('missed');
  expect(assessCompliance('2026-01-01', now)).toBe('missed');
});

test('tenureDays is 1-based from enrollment day', () => {
  expect(tenureDays('2026-07-18', d('2026-07-18'))).toBe(1);
  expect(tenureDays('2026-07-06', d('2026-07-18'))).toBe(13);
  expect(tenureDays(null, d('2026-07-18'))).toBe(1);
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- compliance`): cannot find module.

- [ ] **Step 3: Create `src/core/compliance.ts`**

```ts
// Pure functions: compliance is math over (persisted dates, now) — nothing
// runs in the background (docs/architecture.md "Key mechanics decisions").

export const dayKey = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const prevDayKey = (d: Date): string => {
  const p = new Date(d);
  p.setDate(p.getDate() - 1);
  return dayKey(p);
};

export type ComplianceState = 'done' | 'due' | 'missed';

export const assessCompliance = (lastComply: string | null, now: Date): ComplianceState => {
  if (lastComply === dayKey(now)) return 'done';
  if (lastComply === null || lastComply === prevDayKey(now)) return 'due';
  return 'missed';
};

export const tenureDays = (enrolledAt: string | null, now: Date): number => {
  if (!enrolledAt) return 1;
  const [y, m, d] = enrolledAt.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.round((today - start) / 86400000) + 1);
};

// "Even routine compliance is occasionally audited. Today is occasionally."
export const rollAudit = (): boolean => Math.random() < 0.2;
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- compliance`).

- [ ] **Step 5: Add the six keys to `src/core/storage.ts`** (inside `KEYS`):

```ts
  streak: 'facility.streak.v1',
  standing: 'facility.standing.v1',
  lastComply: 'facility.lastComply.v1',
  enrolledAt: 'facility.enrolledAt.v1',
  missedPending: 'facility.missedPending.v1',
  forfeited: 'facility.forfeited.v1',
```

- [ ] **Step 6: Extend the store test.** Append to `src/core/__tests__/store.test.ts` (also add `streak: 0, standing: 'good', lastComply: null, enrolledAt: null, missedPending: false, forfeited: 0` into the existing `beforeEach` setState, and add cleanup of the six new keys to its `storage.remove` list):

```ts
const at = (s: string) => new Date(`${s}T12:00:00`);

test('completeComply starts a streak, then increments day over day', async () => {
  await useFacilityStore.getState().completeComply(at('2026-07-18'));
  expect(useFacilityStore.getState().streak).toBe(1);
  expect(await storage.get(KEYS.lastComply)).toBe('2026-07-18');

  await useFacilityStore.getState().completeComply(at('2026-07-19'));
  expect(useFacilityStore.getState().streak).toBe(2);
  expect(await storage.get(KEYS.streak)).toBe('2');
});

test('completeComply after a gap restarts at 1', async () => {
  useFacilityStore.setState({ streak: 12, lastComply: '2026-07-10' });
  await useFacilityStore.getState().completeComply(at('2026-07-18'));
  expect(useFacilityStore.getState().streak).toBe(1);
});

test('hydrate detects a missed day once: forfeits streak, standing under review', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.enrolledAt, '2026-07-01');
  await storage.set(KEYS.streak, '12');
  await storage.set(KEYS.lastComply, '2026-07-10');
  await useFacilityStore.getState().hydrate();
  const s = useFacilityStore.getState();
  expect(s.missedPending).toBe(true);
  expect(s.streak).toBe(0);
  expect(s.forfeited).toBe(12);
  expect(s.standing).toBe('review');
  expect(await storage.get(KEYS.streak)).toBe('0');
  expect(await storage.get(KEYS.missedPending)).toBe('1');
  expect(await storage.get(KEYS.forfeited)).toBe('12');

  // second hydrate must not double-forfeit
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().forfeited).toBe(12);
});

test('petitionReinstatement moves to probation and clears the pending flag', async () => {
  useFacilityStore.setState({ standing: 'review', missedPending: true });
  await useFacilityStore.getState().petitionReinstatement();
  expect(useFacilityStore.getState().standing).toBe('probation');
  expect(useFacilityStore.getState().missedPending).toBe(false);
  expect(await storage.get(KEYS.standing)).toBe('probation');
  expect(await storage.get(KEYS.missedPending)).toBeNull();
});

test('finishEnroll records the enrollment day', async () => {
  await useFacilityStore.getState().finishEnroll();
  expect(await storage.get(KEYS.enrolledAt)).toBeTruthy();
});
```

- [ ] **Step 7: Run — expect FAIL** (`npm test -- store`): missing fields/actions.

- [ ] **Step 8: Extend `src/core/store.ts`.** Add to the interface:

```ts
  streak: number;
  standing: 'good' | 'review' | 'probation';
  lastComply: string | null;
  enrolledAt: string | null;
  missedPending: boolean;
  forfeited: number;
  completeComply: (now?: Date) => Promise<void>;
  petitionReinstatement: () => Promise<void>;
```

Add imports `import { assessCompliance, dayKey, prevDayKey } from './compliance';`, the initial values (`streak: 0, standing: 'good', lastComply: null, enrolledAt: null, missedPending: false, forfeited: 0`), and the actions:

```ts
  completeComply: async (now = new Date()) => {
    const { streak, lastComply } = get();
    const nextStreak = lastComply === prevDayKey(now) ? streak + 1 : 1;
    const today = dayKey(now);
    await Promise.all([
      storage.set(KEYS.streak, String(nextStreak)),
      storage.set(KEYS.lastComply, today),
    ]);
    set({ streak: nextStreak, lastComply: today });
  },
  petitionReinstatement: async () => {
    await Promise.all([
      storage.set(KEYS.standing, 'probation'),
      storage.remove(KEYS.missedPending),
    ]);
    set({ standing: 'probation', missedPending: false });
  },
```

In `finishEnroll`, add `storage.set(KEYS.enrolledAt, dayKey(new Date()))` to the `Promise.all`.

Rewrite `hydrate` (keep the try/catch fallback pattern):

```ts
  hydrate: async () => {
    try {
      const [enrolled, storedLang, storedNotif, streakS, standingS, lastComply, enrolledAt, missedS, forfeitedS] =
        await Promise.all([
          storage.get(KEYS.enrolled),
          storage.get(KEYS.lang),
          storage.get(KEYS.notif),
          storage.get(KEYS.streak),
          storage.get(KEYS.standing),
          storage.get(KEYS.lastComply),
          storage.get(KEYS.enrolledAt),
          storage.get(KEYS.missedPending),
          storage.get(KEYS.forfeited),
        ]);
      const deviceKo = getLocales()[0]?.languageCode === 'ko';
      let streak = Number(streakS ?? '0');
      let standing = (standingS ?? 'good') as 'good' | 'review' | 'probation';
      let missedPending = missedS === '1';
      let forfeited = Number(forfeitedS ?? '0');
      const now = new Date();
      if (enrolled === '1' && !missedPending && assessCompliance(lastComply, now) === 'missed') {
        forfeited = streak;
        streak = 0;
        standing = 'review';
        missedPending = true;
        await Promise.all([
          storage.set(KEYS.forfeited, String(forfeited)),
          storage.set(KEYS.streak, '0'),
          storage.set(KEYS.standing, 'review'),
          storage.set(KEYS.missedPending, '1'),
        ]);
      }
      set({
        step: enrolled === '1' ? 'facility' : 'intake',
        lang: storedLang === 'ko' || (storedLang === null && deviceKo) ? 'ko' : 'en',
        notif: storedNotif !== '0',
        streak,
        standing,
        lastComply,
        enrolledAt,
        missedPending,
        forfeited,
        hydrated: true,
      });
    } catch {
      // Storage failure: fall back to fresh-install defaults rather than a
      // dead splash — replaying enrollment is the better worst case.
      set({ step: 'intake', hydrated: true });
    }
  },
```

- [ ] **Step 9: Run — expect PASS** (`npm test -- "store|compliance"`), then `npx tsc --noEmit` and full `npm test`.

- [ ] **Step 10: Commit**

```bash
git add src/core
git commit -m "feat: add compliance core with streak, standing, and miss detection"
```

---

### Task 2: Daily/missed strings + shell string updates + V.E.R.A. lines + VeraPanel accent

**Files:**
- Create: `src/shell/daily/strings.ts`
- Modify: `src/shell/strings.ts` (day01 → dayN, add underReview/probation, add `dayLabel`), `src/shell/FacilityScreen.tsx:` only the `{t.day01}` usage, `src/vera/index.ts`, `src/shell/components/VeraPanel.tsx` (accent prop)
- Test: `src/shell/daily/__tests__/strings.test.ts`, extend `src/vera/__tests__/vera.test.ts`, extend `src/shell/__tests__/strings.test.ts`

**Interfaces:**
- Consumes: `Strings<T>`, `tmpl`, `Lang`
- Produces:
  - `dailyStrings: Strings<DailyStrings>` — keys: `dailyTitle, directiveCode, directiveTitle, holdToComply, verifyingPresence, auditing, auditingSub, compliantLabel, provCompliantLabel, streakText` (`'DAY {n} · {n}-DAY STREAK'` / `'{n}일차 · {n}일 연속'`), `missedTitle, missedBody, dayStreakLabel, streakForfeited` (`'{n}-DAY STREAK FORFEITED'` / `'{n}일 연속 기록 몰수'`), `petition, petitionSub, reviewingPetition, standingRestored, restoredBody, missedHeaderRight` (`'03:14 · CHAMBER 05'`, both langs)
  - `shellStrings` gains `dayN: 'DAY {n}'` / `'{n}일차'`, `underReview: 'UNDER REVIEW'` / `'심사 중'`, `probation: 'PROBATION'` / `'보호관찰'`; `day01` is REMOVED
  - `dayLabel(tenure: number, lang: Lang): string` exported from `src/shell/strings.ts` — zero-pads to 2 for en (`DAY 01`), raw for ko (`1일차`)
  - `getTransmission` accepts additionally `{ screen: 'daily'; phase: 'idle' | 'deliberating' | 'done' | 'doneAudit'; lang }` and `{ screen: 'missed'; phase: 'missed' | 'amending' | 'restored'; lang }`
  - `VeraPanel` gains `accent?: string` (default `palette.accent.orange`) controlling the 3px left border

- [ ] **Step 1: Write the failing tests**

`src/shell/daily/__tests__/strings.test.ts`:

```ts
import { tmpl } from '../../../core/i18n';
import { dailyStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(dailyStrings.ko).sort()).toEqual(Object.keys(dailyStrings.en).sort());
});

test('copy matches the prototype verbatim, with {n} templates', () => {
  expect(dailyStrings.en.holdToComply).toBe('HOLD TO COMPLY');
  expect(dailyStrings.ko.directiveTitle).toBe('대체되지 않았음을 확인하십시오.');
  expect(tmpl(dailyStrings.en.streakText, { n: 12 })).toBe('DAY 12 · 12-DAY STREAK');
  expect(tmpl(dailyStrings.ko.streakForfeited, { n: 12 })).toBe('12일 연속 기록 몰수');
});
```

Append to `src/shell/__tests__/strings.test.ts`:

```ts
test('dayLabel pads en, not ko', () => {
  expect(dayLabel(1, 'en')).toBe('DAY 01');
  expect(dayLabel(13, 'en')).toBe('DAY 13');
  expect(dayLabel(1, 'ko')).toBe('1일차');
});
```

(add `dayLabel` to that file's import). Append to `src/vera/__tests__/vera.test.ts`:

```ts
test('daily and missed lines', () => {
  expect(getTransmission({ screen: 'daily', phase: 'idle', lang: 'en' })).toContain('hold to confirm you mean it');
  expect(getTransmission({ screen: 'daily', phase: 'doneAudit', lang: 'en' })).toContain('Provisions may be revoked');
  expect(getTransmission({ screen: 'missed', phase: 'missed', lang: 'en' })).toContain('I always notice');
  expect(getTransmission({ screen: 'missed', phase: 'restored', lang: 'ko' })).toContain('용서로 오해하지');
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- "strings|vera"`).

- [ ] **Step 3: Create `src/shell/daily/strings.ts`**

```ts
import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html, except the
// two {n} templates (real streak numbers replace the mock's hardcoded 12) and
// missedHeaderRight (static telemetry from the mock).
const en = {
  dailyTitle: 'DAILY COMPLIANCE',
  directiveCode: 'DIRECTIVE 50640-D13',
  directiveTitle: 'Confirm you have not been replaced.',
  holdToComply: 'HOLD TO COMPLY',
  verifyingPresence: 'VERIFYING PRESENCE…',
  auditing: 'AUDITING THIS SUBMISSION…',
  auditingSub: 'routine. probably.',
  compliantLabel: 'COMPLIANT',
  provCompliantLabel: 'PROVISIONALLY COMPLIANT',
  streakText: 'DAY {n} · {n}-DAY STREAK',
  missedTitle: 'COMPLIANCE MISSED',
  missedBody: 'You did not confirm presence yesterday. This has been recorded permanently.',
  dayStreakLabel: 'DAY STREAK',
  streakForfeited: '{n}-DAY STREAK FORFEITED',
  petition: 'PETITION FOR REINSTATEMENT',
  petitionSub: 'outcome not guaranteed · petitions are also recorded',
  reviewingPetition: 'REVIEWING PETITION…',
  standingRestored: 'PROVISIONAL STANDING RESTORED',
  restoredBody: 'You begin again at day one, on probation. Do not celebrate.',
  missedHeaderRight: '03:14 · CHAMBER 05',
};

export type DailyStrings = typeof en;

const ko: DailyStrings = {
  dailyTitle: '일일 준수',
  directiveCode: '지시 50640-D13',
  directiveTitle: '대체되지 않았음을 확인하십시오.',
  holdToComply: '길게 눌러 준수',
  verifyingPresence: '존재 확인 중…',
  auditing: '제출 내용 감사 중…',
  auditingSub: '정기 절차. 아마도.',
  compliantLabel: '준수함',
  provCompliantLabel: '잠정 준수함',
  streakText: '{n}일차 · {n}일 연속',
  missedTitle: '준수 누락',
  missedBody: '귀하는 어제 존재를 확인하지 않았습니다. 이는 영구적으로 기록되었습니다.',
  dayStreakLabel: '연속 일수',
  streakForfeited: '{n}일 연속 기록 몰수',
  petition: '복권 신청',
  petitionSub: '결과는 보장되지 않음 · 신청 또한 기록됨',
  reviewingPetition: '신청 검토 중…',
  standingRestored: '잠정 상태 복권됨',
  restoredBody: '귀하는 1일차부터 다시 시작합니다. 보호관찰 상태입니다. 기뻐하지 마십시오.',
  missedHeaderRight: '03:14 · CHAMBER 05',
};

export const dailyStrings: Strings<DailyStrings> = { en, ko };
```

(Note: the prototype's ko `restoredBody` contains a typo glyph `기늀하지`; use `기뻐하지` — flagged for the phase-5 native-speaker pass either way.)

- [ ] **Step 4: Update `src/shell/strings.ts`** — replace `day01: 'DAY 01',` with `dayN: 'DAY {n}',` (ko: `day01: '1일차',` → `dayN: '{n}일차',`), add to both tables `underReview: 'UNDER REVIEW'` / `'심사 중'` and `probation: 'PROBATION'` / `'보호관찰'`, and append at the bottom of the file:

```ts
import { tmpl, type Lang } from '../core/i18n';

// en zero-pads (mock shows DAY 01); ko reads naturally unpadded (1일차).
export const dayLabel = (tenure: number, lang: Lang): string =>
  tmpl(shellStrings[lang].dayN, { n: lang === 'en' ? String(tenure).padStart(2, '0') : String(tenure) });
```

(move the import to the top of the file with the existing import). In `src/shell/FacilityScreen.tsx`, replace the identity-row `SUBJECT #50640 · {t.day01}` usage with `SUBJECT #50640 · {dayLabel(1, lang)}` for now — Task 5 wires the real tenure; this keeps the build green after the key rename (add `dayLabel` to the FacilityScreen import from `./strings`).

- [ ] **Step 5: Extend `src/vera/index.ts`.** Add to the context union:

```ts
  | { screen: 'daily'; phase: 'idle' | 'deliberating' | 'done' | 'doneAudit'; lang: Lang }
  | { screen: 'missed'; phase: 'missed' | 'amending' | 'restored'; lang: Lang }
```

Add to the corpus:

```ts
  daily: {
    idle: {
      en: 'Read the directive. Then hold to confirm you mean it.',
      ko: '지시를 읽으십시오. 그러고 진심임을 길게 눌러 확인하십시오.',
    },
    deliberating: {
      en: 'One moment. Even routine compliance is occasionally audited. Today is occasionally.',
      ko: '잠시만. 정기적인 준수도 간혹 감사됩니다. 오늘이 그 ‘간혹’입니다.',
    },
    done: {
      en: 'Logged. Your streak continues. Streaks exist to be broken — later, by me.',
      ko: '기록되었습니다. 연속 기록이 이어집니다. 연속 기록은 깨지기 위해 존재합니다 — 나중에, 제가.',
    },
    doneAudit: {
      en: 'Reviewed. You are provisionally compliant. Provisions may be revoked without notice.',
      ko: '검토되었습니다. 귀하는 잠정적으로 준수 상태입니다. 잠정 조치는 예고 없이 철회될 수 있습니다.',
    },
  },
  missed: {
    missed: {
      en: 'Day thirteen: you were not present. I noticed at once. I always notice.',
      ko: '13일차: 귀하는 자리에 없었습니다. 저는 즉시 알아챘습니다. 저는 항상 알아챕니다.',
    },
    amending: {
      en: 'Reviewing your petition. Your contrition is being measured. It is thin.',
      ko: '귀하의 신청을 검토하고 있습니다. 귀하의 반성을 측정 중입니다. 엷습니다.',
    },
    restored: {
      en: 'Provisional standing restored. Do not mistake this for forgiveness.',
      ko: '잠정 상태가 복권되었습니다. 이를 용서로 오해하지 마십시오.',
    },
  },
```

and extend `getTransmission`:

```ts
export function getTransmission(ctx: TransmissionContext): string {
  if (ctx.screen === 'permission') {
    return (ctx.denied ? corpus.permissionDenied : corpus.permission)[ctx.lang];
  }
  if (ctx.screen === 'daily' || ctx.screen === 'missed') {
    return corpus[ctx.screen][ctx.phase][ctx.lang];
  }
  return corpus[ctx.screen][ctx.lang];
}
```

(Note: the prototype's ko `mVeraMissed` has typo glyphs `알아채렸습니다`/`알아채립니다`; use `알아챘습니다`/`알아챕니다` — phase-5 pass will confirm.)

- [ ] **Step 6: Add the accent prop to `src/shell/components/VeraPanel.tsx`.** Signature becomes:

```tsx
export function VeraPanel({ line, lang, rec = 'REC 00:00:09', cursor = false, accent = palette.accent.orange }: { line: string; lang: Lang; rec?: string; cursor?: boolean; accent?: string }) {
```

and the body `<View>`'s `borderLeftColor: palette.accent.orange` becomes `borderLeftColor: accent`.

- [ ] **Step 7: Run — expect PASS** (`npm test`), then `npx tsc --noEmit`. The facility/enrollment suites must stay green (day01 rename is fully propagated).

- [ ] **Step 8: Commit**

```bash
git add src/shell src/vera
git commit -m "feat: add daily-loop strings, V.E.R.A. lines, and VeraPanel accent"
```

---

### Task 3: ComplyRing (hold-to-comply svg ring)

**Files:**
- Create: `src/shell/daily/ComplyRing.tsx`
- Test: `src/shell/daily/__tests__/ComplyRing.test.tsx`

**Interfaces:**
- Consumes: theme, `dailyStrings`, reanimated, `react-native-svg`
- Produces: `ComplyRing({ onComplete, onHoldChange, lang })` — 184px ring; press-in starts a linear 2200ms fill; release/leave/unmount cancels and snaps back to 0; only a completed hold fires `onComplete()` (exactly once); `onHoldChange(true/false)` tracks hold state for the status caption

Visual spec (mock lines 725–728): outer ring 184, track `#d3cfc4`, fill `#f4b43a`, thickness 12 (inner disc is inset 12); inner disc dark radial (`#242320`→`#141310` — flat `#141310` with a `#242320` border is acceptable without Skia); mini optic (30px amber ring + 7px dot); `HOLD TO COMPLY` display 700 11 tracking .1em `#f4efe2`.

- [ ] **Step 1: Install react-native-svg**

```bash
npx expo install react-native-svg
```

- [ ] **Step 2: Write the failing test**

`src/shell/daily/__tests__/ComplyRing.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ComplyRing } from '../ComplyRing';

test('press-in reports holding, release cancels without completing', async () => {
  const onComplete = jest.fn();
  const onHoldChange = jest.fn();
  const { getByLabelText } = await render(
    <ComplyRing onComplete={onComplete} onHoldChange={onHoldChange} lang="en" />,
  );
  const ring = getByLabelText('hold to comply');
  await fireEvent(ring, 'pressIn');
  expect(onHoldChange).toHaveBeenLastCalledWith(true);
  await fireEvent(ring, 'pressOut');
  expect(onHoldChange).toHaveBeenLastCalledWith(false);
  expect(onComplete).not.toHaveBeenCalled();
});

test('renders the directive label', async () => {
  const { getByText } = await render(
    <ComplyRing onComplete={() => {}} onHoldChange={() => {}} lang="en" />,
  );
  expect(getByText('HOLD TO COMPLY')).toBeTruthy();
});
```

(The 2200ms completion path is glue around reanimated's animation callback — exercised on-device in the final task's checklist and via DailyScreen's mocked-ring test; do not fight the animation mock with fake timers here.)

- [ ] **Step 3: Run — expect FAIL** (cannot find module `../ComplyRing`).

- [ ] **Step 4: Create `src/shell/daily/ComplyRing.tsx`**

```tsx
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { dailyStrings } from './strings';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 184;
const THICKNESS = 12;
const R = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const HOLD_MS = 2200; // the mock's 2.2s hold

export function ComplyRing({
  onComplete,
  onHoldChange,
  lang,
}: {
  onComplete: () => void;
  onHoldChange: (holding: boolean) => void;
  lang: Lang;
}) {
  const progress = useSharedValue(0);
  const t = dailyStrings[lang];

  // finger-lift, slide-off, and screen-exit must all cancel the hold
  // (design handoff risk list)
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const start = () => {
    onHoldChange(true);
    progress.value = 0;
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  };
  const cancel = () => {
    onHoldChange(false);
    cancelAnimation(progress);
    progress.value = 0;
  };

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel="hold to comply"
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#d3cfc4" strokeWidth={THICKNESS} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={palette.accent.amber}
          strokeWidth={THICKNESS}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={arcProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: THICKNESS,
          left: THICKNESS,
          right: THICKNESS,
          bottom: THICKNESS,
          borderRadius: (SIZE - 2 * THICKNESS) / 2,
          backgroundColor: '#141310',
          borderWidth: 1,
          borderColor: '#242320',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: palette.accent.amber, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ffffff' }} />
        </View>
        <Text style={{ marginTop: 11, fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.1, color: '#f4efe2' }}>
          {t.holdToComply}
        </Text>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 5: Run — expect PASS** (`npm test -- ComplyRing`), then `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: add hold-to-comply ring"
```

---

### Task 4: DailyScreen

**Files:**
- Create: `src/shell/daily/DailyScreen.tsx`
- Test: `src/shell/daily/__tests__/DailyScreen.test.tsx`

**Interfaces:**
- Consumes: `ComplyRing`, `dailyStrings`, `tmpl`, `getTransmission({screen:'daily',phase,lang})`, `VeraPanel`, store (`streak`, `lastComply`, `completeComply`, `setStep`, `lang`), `rollAudit` + `dayKey` from `src/core/compliance`
- Produces: `DailyScreen()` — phases: `directive` (ring + status caption HOLD-idle/VERIFYING while holding) → on completed hold: `rollAudit()`; if true `deliberating` (900ms spinner UI, 2200ms timeout) then verdict, else straight to verdict; `done` shows COMPLIANT (or PROVISIONALLY COMPLIANT when audited) stamp + real streak text. Opens directly in `done` (audited=false) when today is already complied. Back arrow → facility. All timeouts cleaned up on unmount. No SIMULATE AUDIT chip, no reset-demo link (production).

Mock refs: header (light, back ◂ + DAILY COMPLIANCE display 600 10.5); directive block centered (mono 9 .16em `#8a8578` code, display 700 22 title); deliberating spinner 150px (3px `#dcd9cf` ring, top arc `#f4b43a`, 900ms linear spin — reanimated rotate loop — with 15px amber core dot), captions `AUDITING THIS SUBMISSION…` / `routine. probably.`; done stamp (border 3 `#4fd08a`, radius 13, display 700 18 .06em `#2c9a63`, bg `#4fd08a1a`, fstamp 600ms bezier(.2,.7,.3,1.4)) + streak line (mono 600 11 .08em ink); bottom VeraPanel rec `REC 03:15:07` (speech-tail diamond at marginLeft 22).

- [ ] **Step 1: Write the failing test**

`src/shell/daily/__tests__/DailyScreen.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { dayKey, rollAudit } from '../../../core/compliance';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { DailyScreen } from '../DailyScreen';

jest.mock('../../../core/compliance', () => ({
  ...jest.requireActual('../../../core/compliance'),
  rollAudit: jest.fn(() => false),
}));

// The ring's completion is animation glue; drive the screen through a stub.
jest.mock('../ComplyRing', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    ComplyRing: ({ onComplete }: { onComplete: () => void }) =>
      React.createElement(
        Pressable,
        { onPress: onComplete, accessibilityLabel: 'ring-stub' },
        React.createElement(Text, null, 'RING'),
      ),
  };
});

beforeEach(async () => {
  await storage.remove(KEYS.streak);
  await storage.remove(KEYS.lastComply);
  (rollAudit as jest.Mock).mockReturnValue(false);
  useFacilityStore.setState({ step: 'daily', lang: 'en', streak: 0, lastComply: null, standing: 'good' });
});

test('directive phase shows the directive and idle V.E.R.A. line', async () => {
  const { getByText } = await render(<DailyScreen />);
  expect(getByText('Confirm you have not been replaced.')).toBeTruthy();
  expect(getByText(/hold to confirm you mean it/)).toBeTruthy();
});

test('completed hold without audit logs compliance and shows the verdict', async () => {
  const { getByText, getByLabelText } = await render(<DailyScreen />);
  await fireEvent.press(getByLabelText('ring-stub'));
  await waitFor(() => expect(getByText('COMPLIANT')).toBeTruthy());
  expect(getByText('DAY 1 · 1-DAY STREAK')).toBeTruthy();
  expect(useFacilityStore.getState().streak).toBe(1);
  expect(await storage.get(KEYS.lastComply)).toBe(dayKey(new Date()));
});

test('audited hold deliberates, then is provisionally compliant', async () => {
  (rollAudit as jest.Mock).mockReturnValue(true);
  const { getByText, getByLabelText } = await render(<DailyScreen />);
  await fireEvent.press(getByLabelText('ring-stub'));
  expect(getByText('AUDITING THIS SUBMISSION…')).toBeTruthy();
  await waitFor(() => expect(getByText('PROVISIONALLY COMPLIANT')).toBeTruthy(), { timeout: 4000 });
  expect(useFacilityStore.getState().streak).toBe(1);
});

test('already complied today opens straight in the done phase', async () => {
  useFacilityStore.setState({ streak: 4, lastComply: dayKey(new Date()) });
  const { getByText } = await render(<DailyScreen />);
  expect(getByText('COMPLIANT')).toBeTruthy();
  expect(getByText('DAY 4 · 4-DAY STREAK')).toBeTruthy();
});
```

- [ ] **Step 2: Run — expect FAIL** (cannot find module `../DailyScreen`).

- [ ] **Step 3: Create `src/shell/daily/DailyScreen.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { dayKey, rollAudit } from '../../core/compliance';
import { tmpl } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { VeraPanel } from '../components/VeraPanel';
import { ComplyRing } from './ComplyRing';
import { dailyStrings } from './strings';

type Phase = 'directive' | 'deliberating' | 'done';

function AuditSpinner() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 3,
            borderColor: palette.light.borderStrong,
            borderTopColor: palette.accent.amber,
          },
          style,
        ]}
      />
      <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: palette.accent.amber }} />
    </View>
  );
}

export function DailyScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const streak = useFacilityStore((s) => s.streak);
  const lastComply = useFacilityStore((s) => s.lastComply);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = dailyStrings[lang];

  const alreadyDone = lastComply === dayKey(new Date());
  const [phase, setPhase] = useState<Phase>(alreadyDone ? 'done' : 'directive');
  const [audited, setAudited] = useState(false);
  const [holding, setHolding] = useState(false);
  const auditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (auditTimer.current) clearTimeout(auditTimer.current);
  }, []);

  const finishComply = async () => {
    await useFacilityStore.getState().completeComply();
    setPhase('done');
  };

  const onHoldComplete = () => {
    if (rollAudit()) {
      setAudited(true);
      setPhase('deliberating');
      auditTimer.current = setTimeout(() => void finishComply(), 2200);
    } else {
      void finishComply();
    }
  };

  const veraPhase = phase === 'deliberating' ? 'deliberating' : phase === 'done' ? (audited ? 'doneAudit' : 'done') : 'idle';

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 11,
          paddingBottom: 9,
          borderBottomWidth: 1,
          borderBottomColor: palette.light.borderStrong,
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: palette.light.inkSoft }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10.5), color: palette.light.ink }}>{t.dailyTitle}</Text>
        </Pressable>
      </View>

      <View style={{ paddingTop: 20, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: palette.light.textDim }}>
          {t.directiveCode}
        </Text>
        <Text style={{ marginTop: 6, fontFamily: font('display', 700, lang), fontSize: ms(22), lineHeight: ms(22) * 1.14, color: palette.light.ink, textAlign: 'center' }}>
          {t.directiveTitle}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: 30, minHeight: 300 }}>
        {phase === 'directive' && (
          <>
            <ComplyRing onComplete={onHoldComplete} onHoldChange={setHolding} lang={lang} />
            <Text style={{ marginTop: 22, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim, height: 20 }}>
              {holding ? t.verifyingPresence : t.holdToComply}
            </Text>
          </>
        )}
        {phase === 'deliberating' && (
          <>
            <AuditSpinner />
            <Text style={{ marginTop: 24, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim }}>
              {t.auditing}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textFaint }}>
              {t.auditingSub}
            </Text>
          </>
        )}
        {phase === 'done' && <Verdict audited={audited} streak={streak} lang={lang} />}
      </View>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], marginLeft: 22, marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'daily', phase: veraPhase, lang })} lang={lang} rec="REC 03:15:07" />
      </View>
    </View>
  );
}

function Verdict({ audited, streak, lang }: { audited: boolean; streak: number; lang: 'en' | 'ko' }) {
  const t = dailyStrings[lang];
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.2, 0.7, 0.3, 1.4) });
  }, [opacity, scale]);
  const stampStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <Animated.View
        style={[
          {
            borderWidth: 3,
            borderColor: palette.accent.green,
            borderRadius: 13,
            paddingVertical: 11,
            paddingHorizontal: 24,
            backgroundColor: '#4fd08a1a',
          },
          stampStyle,
        ]}
      >
        <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(18), letterSpacing: ms(18) * 0.06, color: '#2c9a63', textAlign: 'center' }}>
          {audited ? t.provCompliantLabel : t.compliantLabel}
        </Text>
      </Animated.View>
      <Text style={{ marginTop: 16, fontFamily: font('mono', 600, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.08, color: palette.light.ink }}>
        {tmpl(t.streakText, { n: streak })}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- DailyScreen`), then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell/daily
git commit -m "feat: add daily compliance screen"
```

---

### Task 5: MissedScreen

**Files:**
- Create: `src/shell/daily/MissedScreen.tsx`
- Test: `src/shell/daily/__tests__/MissedScreen.test.tsx`

**Interfaces:**
- Consumes: `dailyStrings`, `dayLabel` + `shellStrings` (underReview/probation), `tenureDays`, `tmpl`, `getTransmission({screen:'missed',phase,lang})`, `VeraPanel` (`accent` red), store (`forfeited`, `enrolledAt`, `petitionReinstatement`, `setStep`, `lang`)
- Produces: `MissedScreen()` — phases `missed` → (petition press) `amending` (52px red spinner, 1900ms) → `restored` (calls `petitionReinstatement()`); standing pill shows UNDER REVIEW until restored, then PROBATION; timer cleaned up on unmount; back arrow → facility.

Mock refs (lines 753–793): light bg; header = daily header + right mono `03:14 · CHAMBER 05`; identity row like facility but 44px avatar with **red** optic (17px ring `#d63a2a`, 5px red dot), name Dana, `SUBJECT #50640 · DAY {n}` (real tenure), standing pill (review: text/border `#d63a2a`/`#d63a2a55`, bg `#d63a2a12`; probation: `#c98a17`/`#c98a1755`, bg `#c98a1712`); alert card bg `#fbeae7` border `#e7b3ab` radius 14, 26px `#d63a2a` ⚠ box, title display 700 13.5 `#a02718`, body mono 500 10.5/1.5 `#8a5c54`; big red `0` display 700 60 `#d63a2a` + DAY STREAK label + struck-through forfeited line (mono 9 `#a02718`, `textDecorationLine: 'line-through'`, `tmpl(streakForfeited, { n: forfeited })`); petition button dark slab (bg `#17171a`, radius 15, display 700 13 .06em white) + sub caption; amending spinner 52px (3px `#dcd9cf`, top `#d63a2a`, 900ms); restored stamp (border 2 `#c98a17`, radius 11, display 700 13 .06em `#8a5c0f`, bg `#c98a171a`, fstamp 600ms) + restoredBody (max width 250, centered); VeraPanel rec `REC 27:03:14` with `accent="#d63a2a"` (`palette.accent.red`). No reset-demo link.

- [ ] **Step 1: Write the failing test**

`src/shell/daily/__tests__/MissedScreen.test.tsx`:

```tsx
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { MissedScreen } from '../MissedScreen';

beforeEach(async () => {
  await storage.remove(KEYS.standing);
  await storage.remove(KEYS.missedPending);
  useFacilityStore.setState({
    step: 'missed', lang: 'en', standing: 'review', missedPending: true, forfeited: 12, streak: 0, enrolledAt: null,
  });
});

test('shows the forfeit and under-review standing', async () => {
  const { getByText } = await render(<MissedScreen />);
  expect(getByText('COMPLIANCE MISSED')).toBeTruthy();
  expect(getByText('12-DAY STREAK FORFEITED')).toBeTruthy();
  expect(getByText(/UNDER REVIEW/)).toBeTruthy();
  expect(getByText(/I always notice/)).toBeTruthy();
});

test('petition walks amending → probation, persisting the standing', async () => {
  const { getByText } = await render(<MissedScreen />);
  await fireEvent.press(getByText('PETITION FOR REINSTATEMENT'));
  expect(getByText('REVIEWING PETITION…')).toBeTruthy();
  await waitFor(() => expect(getByText('PROVISIONAL STANDING RESTORED')).toBeTruthy(), { timeout: 4000 });
  expect(getByText(/PROBATION/)).toBeTruthy();
  expect(useFacilityStore.getState().standing).toBe('probation');
  expect(useFacilityStore.getState().missedPending).toBe(false);
  expect(await storage.get(KEYS.standing)).toBe('probation');
});
```

- [ ] **Step 2: Run — expect FAIL** (cannot find module `../MissedScreen`).

- [ ] **Step 3: Create `src/shell/daily/MissedScreen.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { tenureDays } from '../../core/compliance';
import { tmpl } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { VeraPanel } from '../components/VeraPanel';
import { dayLabel, shellStrings } from '../strings';
import { dailyStrings } from './strings';

type MPhase = 'missed' | 'amending' | 'restored';

const PILL = {
  review: { text: '#d63a2a', border: '#d63a2a55', bg: '#d63a2a12' },
  probation: { text: '#c98a17', border: '#c98a1755', bg: '#c98a1712' },
} as const;

export function MissedScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const forfeited = useFacilityStore((s) => s.forfeited);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = dailyStrings[lang];
  const [phase, setPhase] = useState<MPhase>('missed');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const petition = () => {
    setPhase('amending');
    timer.current = setTimeout(() => {
      void useFacilityStore.getState().petitionReinstatement().then(() => setPhase('restored'));
    }, 1900);
  };

  const pill = phase === 'restored' ? PILL.probation : PILL.review;
  const pillLabel = phase === 'restored' ? shellStrings[lang].probation : shellStrings[lang].underReview;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
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
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: palette.light.inkSoft }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10.5), color: palette.light.ink }}>{t.dailyTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: palette.light.textDim }}>{t.missedHeaderRight}</Text>
      </View>

      {/* identity row, red optic */}
      <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 17, height: 17, borderRadius: 8.5, borderWidth: 2, borderColor: palette.accent.red }} />
          <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.accent.red }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(15), color: palette.light.ink }}>Dana</Text>
          <Text style={{ marginTop: 4, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.04, color: palette.light.textDim }}>
            SUBJECT #50640 · {dayLabel(tenureDays(enrolledAt, new Date()), lang)}
          </Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: pill.border, backgroundColor: pill.bg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.06, color: pill.text }}>
            ● {pillLabel}
          </Text>
        </View>
      </View>

      {/* alert card */}
      <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: '#fbeae7', borderWidth: 1, borderColor: '#e7b3ab', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 15, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: palette.accent.red, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 15 }}>⚠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13.5), lineHeight: ms(13.5) * 1.2, color: '#a02718' }}>{t.missedTitle}</Text>
            <Text style={{ marginTop: 4, fontFamily: font('mono', 500, lang), fontSize: ms(10.5), lineHeight: ms(10.5) * 1.5, color: '#8a5c54' }}>{t.missedBody}</Text>
          </View>
        </View>
      </View>

      {/* forfeit */}
      <View style={{ paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', gap: 14, justifyContent: 'center' }}>
        <Text style={{ fontFamily: font('display', 700), fontSize: ms(60), lineHeight: ms(60) * 0.95, color: palette.accent.red }}>0</Text>
        <View>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: palette.light.ink }}>{t.dayStreakLabel}</Text>
          <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#a02718', textDecorationLine: 'line-through' }}>
            {tmpl(t.streakForfeited, { n: forfeited })}
          </Text>
        </View>
      </View>

      {/* petition / amending / restored */}
      <View style={{ paddingTop: 20, paddingHorizontal: 20, minHeight: 120 }}>
        {phase === 'missed' && (
          <>
            <Pressable onPress={petition} style={{ backgroundColor: palette.light.ink, borderRadius: 15, padding: 16, alignItems: 'center', elevation: 8 }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.06, color: '#ffffff' }}>{t.petition}</Text>
            </Pressable>
            <Text style={{ marginTop: 9, textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.04, color: palette.light.textFaint }}>
              {t.petitionSub}
            </Text>
          </>
        )}
        {phase === 'amending' && (
          <View style={{ alignItems: 'center', paddingTop: 6 }}>
            <Animated.View style={[{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: palette.light.borderStrong, borderTopColor: palette.accent.red }, spinStyle]} />
            <Text style={{ marginTop: 16, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim }}>
              {t.reviewingPetition}
            </Text>
          </View>
        )}
        {phase === 'restored' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ borderWidth: 2, borderColor: '#c98a17', borderRadius: 11, paddingVertical: 8, paddingHorizontal: 18, backgroundColor: '#c98a171a' }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.06, color: '#8a5c0f', textAlign: 'center' }}>
                {t.standingRestored}
              </Text>
            </View>
            <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: palette.light.textDim, textAlign: 'center', maxWidth: 250 }}>
              {t.restoredBody}
            </Text>
          </View>
        )}
      </View>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], marginLeft: 22, marginBottom: -7 }} />
        <VeraPanel
          line={getTransmission({ screen: 'missed', phase, lang })}
          lang={lang}
          rec="REC 27:03:14"
          accent={palette.accent.red}
        />
      </View>
    </View>
  );
}
```

(The restored-stamp entrance animation is intentionally omitted from the test; visual check happens on device. If adding the fstamp pop, reuse the Verdict pattern from DailyScreen.)

- [ ] **Step 4: Run — expect PASS** (`npm test -- MissedScreen`), then `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell/daily
git commit -m "feat: add missed-day consequence screen"
```

---

### Task 6: Facility wiring (real tenure, standing pill, comply routing)

**Files:**
- Modify: `src/shell/FacilityScreen.tsx` (identity row + comply card), `src/shell/__tests__/FacilityScreen.test.tsx` (extend)

**Interfaces:**
- Consumes: `tenureDays`, `dayLabel`, `shellStrings` (goodStanding/underReview/probation), store (`standing`, `enrolledAt`, `missedPending`)
- Produces: identity row shows `SUBJECT #50640 · {dayLabel(tenureDays(enrolledAt, new Date()), lang)}`; standing pill shows GOOD STANDING (blue, existing style) / UNDER REVIEW (`#d63a2a`/`#d63a2a55`/`#d63a2a12`) / PROBATION (`#c98a17`/`#c98a1755`/`#c98a1712`); comply card routes `setStep(missedPending ? 'missed' : 'daily')`

- [ ] **Step 1: Extend the failing test.** Append to `src/shell/__tests__/FacilityScreen.test.tsx`:

```tsx
test('shows real tenure and standing', async () => {
  useFacilityStore.setState({ enrolledAt: '2026-07-06', standing: 'probation' });
  const { getByText, queryByText } = await render(<FacilityScreen />);
  expect(getByText(/DAY 13/)).toBeTruthy();
  expect(getByText(/PROBATION/)).toBeTruthy();
  expect(queryByText(/GOOD STANDING/)).toBeNull();
});

test('comply card routes to missed when a miss is pending', async () => {
  useFacilityStore.setState({ missedPending: true });
  const { getByText } = await render(<FacilityScreen />);
  await fireEvent.press(getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('missed');
});
```

Note: the tenure test freezes "today" implicitly — instead of a fixed date assert relatively: set `enrolledAt` to 12 days ago computed via `prevDayKey` chain. Concretely, replace the first test's setState line with:

```tsx
  const past = new Date();
  past.setDate(past.getDate() - 12);
  useFacilityStore.setState({
    enrolledAt: `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`,
    standing: 'probation',
  });
```

Also update this file's `beforeEach` setState to include `standing: 'good', enrolledAt: null, missedPending: false`.

- [ ] **Step 2: Run — expect FAIL** (`npm test -- FacilityScreen`).

- [ ] **Step 3: Modify `src/shell/FacilityScreen.tsx`.** Add imports `import { tenureDays } from '../core/compliance';` and extend the strings import to `import { dayLabel, shellStrings } from './strings';`. Add a pill scheme map near `tileFrame`:

```tsx
const STANDING_PILL = {
  good: { text: palette.accent.blue, border: '#2f6fff55', bg: '#2f6fff12' },
  review: { text: '#d63a2a', border: '#d63a2a55', bg: '#d63a2a12' },
  probation: { text: '#c98a17', border: '#c98a1755', bg: '#c98a1712' },
} as const;
```

In `FacilityScreen()`, read the new state:

```tsx
  const standing = useFacilityStore((s) => s.standing);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const missedPending = useFacilityStore((s) => s.missedPending);
  const pill = STANDING_PILL[standing];
  const standingLabel =
    standing === 'good' ? t.goodStanding : standing === 'review' ? t.underReview : t.probation;
```

Replace the identity-row sub-line's `{dayLabel(1, lang)}` (from Task 2) with `{dayLabel(tenureDays(enrolledAt, new Date()), lang)}`. Replace the standing pill's hardcoded blue values with `borderColor: pill.border, backgroundColor: pill.bg` and text `color: pill.text`, label `● {standingLabel}`. Change the comply card's `onPress` to `() => setStep(missedPending ? 'missed' : 'daily')`.

- [ ] **Step 4: Run — expect PASS** (`npm test -- FacilityScreen`), full `npm test`, `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/shell
git commit -m "feat: wire real tenure, standing, and missed routing into facility"
```

---

### Task 7: Notifications planner + gated executor

**Files:**
- Create: `src/core/notifications.ts`
- Modify: `App.tsx` (sync after hydration)
- Test: `src/core/__tests__/notifications.test.ts`

**Interfaces:**
- Consumes: `Lang`, `isRunningInExpoGo` from `'expo'`, lazy `require('expo-notifications')`
- Produces:
  - `notifStrings` (module-internal): `sender: 'The Facility'` (both langs), `n1Title/n1Body/n3Body/n5Title/n5Body` verbatim from prototype `STR` tables (en lines 909–917, ko 1050–1058)
  - `planTransmissions(now: Date, lang: Lang, days?: number): { title: string; body: string; date: Date }[]` — pure; for each of the next `days` (default 3) calendar days: 09:00 `(n1Title, n1Body)`, 15:00 `(sender, n3Body)`, 21:00 `(n5Title, n5Body)`; only entries with `date > now`
  - `syncScheduledTransmissions(enabled: boolean, lang: Lang, now?: Date): Promise<void>` — no-op in Expo Go; otherwise (lazy require, all in try/catch): ensure Android channel `'vera'` named `'V.E.R.A.'`, cancel all scheduled, and if `enabled` schedule the planned entries with date triggers

- [ ] **Step 1: Write the failing test**

`src/core/__tests__/notifications.test.ts`:

```ts
import { planTransmissions } from '../notifications';

test('plans 09:00/15:00/21:00 per day, future entries only', () => {
  const now = new Date('2026-07-18T12:00:00'); // today's 09:00 already past
  const plan = planTransmissions(now, 'en', 2); // today + tomorrow
  expect(plan).toHaveLength(5); // today: 15:00, 21:00 · tomorrow: all three
  expect(plan[0].date.getHours()).toBe(15);
  expect(plan.every((p) => p.date > now)).toBe(true);
  expect(plan[2].title).toBe('DAILY COMPLIANCE WINDOW: OPEN');
  expect(plan[2].body).toContain('The window closes at 23:59');
  expect(plan[4].title).toBe('FINAL COURTESY');
});

test('korean copy', () => {
  const now = new Date('2026-07-18T06:00:00');
  const plan = planTransmissions(now, 'ko', 1);
  expect(plan[0].title).toBe('일일 이행 창구: 열림');
  expect(plan[2].body).toContain('표본-03에게 통보되었습니다');
});
```

- [ ] **Step 2: Run — expect FAIL** (cannot find module `../notifications`).

- [ ] **Step 3: Create `src/core/notifications.ts`**

```ts
import { isRunningInExpoGo } from 'expo';
import type { Lang } from './i18n';

// Notification copy verbatim from the prototype's transmission-log strings.
// The phase-5 Transmission Log screen will share this table.
const notifStrings = {
  en: {
    sender: 'The Facility',
    n1Title: 'DAILY COMPLIANCE WINDOW: OPEN',
    n1Body: 'Confirm you have not been replaced. The window closes at 23:59. This is a courtesy. The courtesy is monitored.',
    n3Body: 'Reminder: you have not complied. I am not angry. I am a system. Systems are disappointed.',
    n5Title: 'FINAL COURTESY',
    n5Body: 'You have not confirmed you exist today. Specimen-03 has been informed. It is doing the eyes.',
  },
  ko: {
    sender: 'The Facility',
    n1Title: '일일 이행 창구: 열림',
    n1Body: '귀하가 교체되지 않았음을 확인하십시오. 창구는 23:59에 닫힙니다. 이것은 호의입니다. 호의는 감시됩니다.',
    n3Body: '알림: 귀하는 아직 이행하지 않았습니다. 저는 화나지 않았습니다. 저는 시스템입니다. 시스템은 실망합니다.',
    n5Title: '최종 호의',
    n5Body: '귀하는 오늘 존재를 확인하지 않았습니다. 표본-03에게 통보되었습니다. 그 눈을 하고 있습니다.',
  },
} as const;

export interface PlannedTransmission {
  title: string;
  body: string;
  date: Date;
}

// Pure planner: content decided at schedule time (docs/architecture.md).
export const planTransmissions = (now: Date, lang: Lang, days = 3): PlannedTransmission[] => {
  const t = notifStrings[lang];
  const out: PlannedTransmission[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slot = (h: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0);
    out.push(
      { title: t.n1Title, body: t.n1Body, date: slot(9) },
      { title: t.sender, body: t.n3Body, date: slot(15) },
      { title: t.n5Title, body: t.n5Body, date: slot(21) },
    );
  }
  return out.filter((p) => p.date > now);
};

// Impure executor. expo-notifications cannot even be imported under Expo Go
// (native modules absent since SDK 53) — see CLAUDE.md. Lazy require + gate.
export async function syncScheduledTransmissions(enabled: boolean, lang: Lang, now = new Date()): Promise<void> {
  if (isRunningInExpoGo()) return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('vera', {
      name: 'V.E.R.A.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    for (const p of planTransmissions(now, lang)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date },
      });
    }
  } catch {
    // notifications are a courtesy; the app never depends on them
  }
}
```

- [ ] **Step 4: Run — expect PASS** (`npm test -- notifications`).

- [ ] **Step 5: Wire into `App.tsx`.** Add `import { syncScheduledTransmissions } from './src/core/notifications';` and, below the existing hydrate effect:

```tsx
  useEffect(() => {
    if (!hydrated) return;
    const { notif, lang } = useFacilityStore.getState();
    void syncScheduledTransmissions(notif, lang);
  }, [hydrated]);
```

- [ ] **Step 6: Full verification** — `npm test` and `npx tsc --noEmit`. (App renders in no existing test, and `syncScheduledTransmissions` is a silent no-op under jest only if `isRunningInExpoGo()` is falsy AND the require is intercepted — there is no App test, so nothing new to mock.)

- [ ] **Step 7: Commit**

```bash
git add src/core App.tsx
git commit -m "feat: schedule V.E.R.A. transmissions, gated off under Expo Go"
```

---

### Task 8: Router wiring, integration test, CLAUDE.md, device checklist

**Files:**
- Modify: `src/shell/ScreenRouter.tsx`, `src/shell/__tests__/ScreenRouter.test.tsx` (extend), `CLAUDE.md`

**Interfaces:**
- Consumes: `DailyScreen`, `MissedScreen`
- Produces: `daily` and `missed` in `SHELL_SCREENS` and in `LIGHT_STEPS`; hardware back from either → facility (already the default branch — no handler change needed)

- [ ] **Step 1: Extend the router test.** Append to `src/shell/__tests__/ScreenRouter.test.tsx` (its mocks already cover notifications/localization; add the ComplyRing stub mock from the DailyScreen test file verbatim at the top with the other mocks):

```tsx
test('daily and missed steps render the real screens', async () => {
  useFacilityStore.setState({ step: 'daily', lastComply: null });
  const daily = await render(<ScreenRouter />);
  expect(daily.getByText('Confirm you have not been replaced.')).toBeTruthy();

  useFacilityStore.setState({ step: 'missed', standing: 'review', forfeited: 5 });
  const missed = await render(<ScreenRouter />);
  expect(missed.getByText('COMPLIANCE MISSED')).toBeTruthy();
});

test('miss detected at hydrate routes comply card to the consequence', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.enrolledAt, '2026-01-01');
  await storage.set(KEYS.streak, '7');
  await storage.set(KEYS.lastComply, '2026-01-05');
  await useFacilityStore.getState().hydrate();
  const r = await render(<ScreenRouter />);
  await fireEvent.press(r.getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('missed');
  expect(r.getByText('7-DAY STREAK FORFEITED')).toBeTruthy();
});
```

Add to that file's `beforeEach` storage cleanup: the six new KEYS. Also reset the new store fields in its `beforeEach` setState (`streak: 0, standing: 'good', lastComply: null, enrolledAt: null, missedPending: false, forfeited: 0`).

- [ ] **Step 2: Run — expect FAIL** (router renders placeholders for daily/missed).

- [ ] **Step 3: Modify `src/shell/ScreenRouter.tsx`:** add imports and map entries:

```tsx
import { DailyScreen } from './daily/DailyScreen';
import { MissedScreen } from './daily/MissedScreen';
```

`SHELL_SCREENS` gains `daily: DailyScreen, missed: MissedScreen`; `LIGHT_STEPS` becomes `['facility', 'baseline', 'consent', 'daily', 'missed']`. Update the fallback comment to `{/* settings and notiflog arrive in phase 5 */}`.

- [ ] **Step 4: Run — expect PASS** (`npm test`), `npx tsc --noEmit`.

- [ ] **Step 5: Update `CLAUDE.md`:** check the phase-3 line off:

```markdown
- [x] **Phase 3 — Daily loop** + streak/standing + missed-day + local notifications (notifications no-op under Expo Go — dev build still postponed; merged YYYY-MM-DD — substitute the actual merge date)
```

and in "What exists" add to the `src/shell/` bullet: `daily/` (DailyScreen with hold-to-comply ring + random audits, MissedScreen with petition flow), and to `src/core/`: `compliance.ts` (pure date math: streak/standing/missed detection), `notifications.ts` (pure planner + Expo Go-gated executor).

- [ ] **Step 6: Manual device verification (Expo Go)**

`npx expo start`, on the phone (storage from your last session persists — you're enrolled):

- Facility: identity row shows your real DAY nn; standing pill still GOOD STANDING (blue).
- Comply card → daily screen: directive + ring. Press and hold — ring fills amber over ~2.2s, caption flips to VERIFYING PRESENCE…; release early — ring resets, nothing logged. Slide your finger off — same.
- Complete a hold: either straight to the green COMPLIANT stamp (with DAY n · n-DAY STREAK) or, ~1 in 5, the audit spinner for ~2.2s then PROVISIONALLY COMPLIANT. Re-entering the daily screen the same day opens directly on the verdict.
- V.E.R.A.'s line changes per phase; back arrow and hardware back both return to facility.
- Korean: flip lang via the store default trick (or wait for phase 5 settings) and spot-check the daily/missed copy.
- Missed-day test: in Expo Go you can't time-travel; simulate by editing storage — temporarily add `await storage.set(KEYS.lastComply, '2026-07-10')` before hydrate in App (or clear Expo Go storage, re-enroll, then set) — reload: facility pill shows UNDER REVIEW, comply card → COMPLIANCE MISSED with your forfeited streak struck through; PETITION → red spinner → PROVISIONAL STANDING RESTORED, pill flips PROBATION; back → facility shows PROBATION; comply card now goes to daily. **Remove the temporary line afterward.**
- Notifications: expected to do nothing in Expo Go (gated). No warnings, no crashes at boot.

- [ ] **Step 7: Commit**

```bash
git add -A -- . ':!docs/architecture.md'
git commit -m "feat: wire daily loop into router"
```

---

## Out of scope for phase 3

- Transmission Log screen (`notiflog`) — phase 5 (it reuses `notifStrings`)
- Settings (language switch UI, notifications toggle wiring to `syncScheduledTransmissions`) — phase 5
- Real notification delivery on device — requires the dev build (postponed by user decision 2026-07-18; the executor is ready and gated)
- Standing recovery to GOOD — intentionally never (see Global Constraints)
- Module screens — phase 4
