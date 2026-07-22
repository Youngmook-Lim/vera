# Skia + Dev-Build Enablement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. NOTE: this sub-project is config-and-handoff heavy — Task 3 is user-run (a native cloud build) and cannot be executed by a subagent. Inline execution by the controller is a reasonable choice here.

**Goal:** Make `@shopify/react-native-skia` usable on-device via an EAS development build, with the jest suite staying green — unblocking the organism blob (and later hazard).

**Architecture:** Add Skia + `expo-dev-client` deps, an `eas.json` `development` profile, and a Skia jest mock so the suite survives Skia imports. A throwaway `SkiaProbe` (red circle) mounted on the Facility home is the on-device proof. The user runs the EAS cloud build and installs the APK.

**Tech Stack:** Expo SDK 57 / RN 0.86, `@shopify/react-native-skia`, `expo-dev-client`, EAS Build (cloud), Jest 29 + jest-expo.

## Global Constraints

- **No hand-picked versions:** add Skia/dev-client via `npx expo install` so SDK-57-compatible versions are chosen. Only if the sandbox is offline, pin compatible versions and report it.
- **The suite must stay at 116/116 and `npx tsc --noEmit` clean** after each task. Skia cannot run in jsdom — it is mocked in jest.
- **`SkiaProbe` is temporary**, clearly marked, removed as sub-project B's first step. It is the only Skia artwork in this sub-project.
- **Do not hand-edit `app.json`'s `extra.eas.projectId`** — `eas init` (user-run) writes it.
- **No speculative config:** add a metro/babel/plugin change only if the installed Skia version's SDK-57 docs require it; otherwise none is expected.

## File Structure

| File | Responsibility |
|---|---|
| `package.json` (modify) | Add `@shopify/react-native-skia`, `expo-dev-client`. |
| `eas.json` (create) | `development` + `preview` + `production` build profiles. |
| `jest.setup.ts` (modify) | Mock `@shopify/react-native-skia` so the suite stays green. |
| `src/shell/components/SkiaProbe.tsx` (create) | Temporary `<Canvas>` + red `<Circle>`. |
| `src/shell/components/__tests__/SkiaProbe.test.tsx` (create) | Renders without throwing (exercises the mock). |
| `src/shell/FacilityScreen.tsx` (modify) | Temporarily mount `<SkiaProbe/>` at the bottom of the grid. |

---

## Task 1: Dependencies + EAS profile + Skia jest mock

**Files:**
- Modify: `package.json` (deps via `npx expo install`)
- Create: `eas.json`
- Modify: `jest.setup.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `@shopify/react-native-skia` importable + mocked in jest; an `eas.json` with a `development` profile.

- [ ] **Step 1: Install the dependencies**

Run: `npx expo install @shopify/react-native-skia expo-dev-client`
Expected: both added to `package.json` at SDK-57-compatible versions; `node_modules` populated.
If the environment is offline and the install fails: STOP and report BLOCKED with the error — this sub-project's automated part cannot proceed without the packages installed (the user will run the install locally, then work resumes).

- [ ] **Step 2: Create `eas.json`**

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 3: Add the Skia jest mock**

In `jest.setup.ts`, append a mock so importing Skia doesn't crash the suite under jsdom. Start with the entry below, but **confirm it against the installed version's testing docs** (the mock path/shape is version-specific) — the acceptance gate is a green suite:

```ts
jest.mock('@shopify/react-native-skia', () =>
  require('@shopify/react-native-skia/lib/commonjs/mock'),
);
```

- [ ] **Step 4: Verify the suite and types are still green**

Run: `npm test`
Expected: `Tests: 116 passed, 116 total` (nothing imports Skia yet, so the mock is inert but ready).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json eas.json jest.setup.ts
git commit -m "chore: enable skia + expo-dev-client, add eas dev profile + jest mock"
```

(If the lockfile name differs, add whatever the install produced.)

---

## Task 2: SkiaProbe + Facility mount

**Files:**
- Create: `src/shell/components/SkiaProbe.tsx`
- Create: `src/shell/components/__tests__/SkiaProbe.test.tsx`
- Modify: `src/shell/FacilityScreen.tsx`

**Interfaces:**
- Consumes: `@shopify/react-native-skia` (`Canvas`, `Circle`); mocked in jest via Task 1.
- Produces: `SkiaProbe` component; temporarily rendered on the Facility home.

- [ ] **Step 1: Write the failing test**

Create `src/shell/components/__tests__/SkiaProbe.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { SkiaProbe } from '../SkiaProbe';

test('renders without throwing (skia mocked in jest)', async () => {
  const r = await render(<SkiaProbe />);
  expect(r).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shell/components/__tests__/SkiaProbe.test.tsx`
Expected: FAIL — cannot find module `../SkiaProbe`.

- [ ] **Step 3: Create the probe**

Create `src/shell/components/SkiaProbe.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

// TEMP: on-device proof that Skia renders in the dev build.
// Sub-project B (organism module) removes this as its first step.
export function SkiaProbe() {
  return (
    <View style={{ width: 64, height: 64, alignSelf: 'center', marginVertical: 20 }}>
      <Canvas style={{ flex: 1 }}>
        <Circle cx={32} cy={32} r={28} color="red" />
      </Canvas>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shell/components/__tests__/SkiaProbe.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount the probe on the Facility home**

In `src/shell/FacilityScreen.tsx`:

Add the import near the other component imports (after the `VeraPanel` import line):

```tsx
import { SkiaProbe } from './components/SkiaProbe';
```

Then mount it just before the closing `</ScrollView>` (immediately after the pending-allocation vitrines `View` block, ~line 362):

```tsx
        {/* TEMP: Skia on-device probe — remove after verified (sub-project B) */}
        <SkiaProbe />
      </ScrollView>
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: `Tests: 117 passed, 117 total` (116 existing + the new probe test); no type errors. Any existing FacilityScreen test must remain green.

- [ ] **Step 7: Commit**

```bash
git add src/shell/components/SkiaProbe.tsx src/shell/components/__tests__/SkiaProbe.test.tsx src/shell/FacilityScreen.tsx
git commit -m "chore: temporary skia probe on facility home for on-device verification"
```

---

## Task 3: Build, install, verify on-device (USER-RUN — not a subagent task)

**Files:** `app.json` (`eas init` writes `extra.eas.projectId`), plus a docs note.

This task cannot run in the build environment — it is a native cloud build the user performs. The controller hands the user the commands and waits for the result.

- [ ] **Step 1: User authenticates and initializes EAS**

User runs (suggest via the `!` prefix in-session so output is captured):
```
eas login
eas init
```
Expected: `eas init` writes `extra.eas.projectId` into `app.json` (and links/creates the EAS project). Commit that change:
```bash
git add app.json
git commit -m "chore: link EAS project (projectId)"
```

- [ ] **Step 2: User builds and installs the dev client**

User runs:
```
eas build -p android --profile development
```
Expected: a cloud build (~10-15 min) producing an installable APK URL. User downloads the APK, installs it on the phone, and opens it. From then on, run the app with `expo start --dev-client` (hot reload preserved).

- [ ] **Step 3: On-device verification (the done-condition)**

User confirms: the app boots in the dev build and a **red circle** renders at the bottom of the Facility home. Report pass/fail.
- If the circle renders → Skia works on-device; sub-project A is done.
- If not (crash, blank, error) → capture the error; do not proceed to the organism module until resolved.

- [ ] **Step 4: Update build notes**

In `CLAUDE.md`, add a note under "Build progress"/gotchas that a dev build now exists and Skia is available (Expo Go no longer runs the app on-device; use `expo start --dev-client`). Commit:
```bash
git add CLAUDE.md
git commit -m "docs: dev build + skia now available (expo go retired for on-device)"
```

---

## Self-Review

**Spec coverage:**
- Deps via `npx expo install` (+ offline fallback) → Task 1 Step 1. ✓
- `eas.json` development (+ preview + production) profile → Task 1 Step 2. ✓
- Skia jest mock, suite green → Task 1 Steps 3-4. ✓
- Temporary SkiaProbe (red circle) + Facility mount + test → Task 2. ✓
- User-run EAS login/init/build/install → Task 3 Steps 1-2. ✓
- On-device done-condition (red circle) → Task 3 Step 3. ✓
- Docs note that dev build/Skia now exist → Task 3 Step 4. ✓

**Placeholder scan:** none — the one version-specific unknown (Skia jest-mock entrypoint) is explicitly flagged with a concrete starting point and a green-suite acceptance gate, per the spec's stated risk.

**Type consistency:** `SkiaProbe` (Task 2) is the only produced symbol; imported in `FacilityScreen` in the same task. `Canvas`/`Circle` come from the dep added in Task 1.

**Notes:**
1. Task 3 is user-run by necessity (native cloud build); the plan is explicit about the handoff.
2. Expected test count rises 116 → 117 at Task 2 (one new probe test). If the actual baseline differs, match the observed count; the gate is "no regressions + new test passes."
