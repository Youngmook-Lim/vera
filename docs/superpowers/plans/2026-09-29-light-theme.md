# Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second, pale palette for the whole app, switched from a 30×16 pill in the stage header and remembered across launches.

**Architecture:** `theme.ts` grows from one frozen `palette` to two `Palette` values behind a `Theme` key. Each of the 19 files holding a module-scope `StyleSheet.create` builds **both** sheets once at import via `themed()` and indexes one at render; inline colours come from a `usePalette()` hook. `export const palette` is deleted **last**, so `tsc` proves nothing was left behind.

**Tech Stack:** React Native 0.86 · Expo SDK 57 · TypeScript · Zustand · Jest 29 + RTL v14

**Spec:** `docs/superpowers/specs/2026-09-29-light-theme-design.md`

## Global Constraints

- Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
- All copy verbatim from `T` in `src/shell/strings.ts`; **all hex from `theme.ts`.** Don't add strings the design doesn't have.
- Verify every task with `npm test` **and** `npx tsc --noEmit`. Both are the gate.
- No test may make a real network request.
- Repo style is **single quotes**. An editor formatter here has previously reformatted files to double quotes — don't let it.
- Touch only what the task names. Don't "improve" adjacent code, comments, or formatting.
- Commits carry **no** reference to the model or tool that wrote them.
- Every task ends green. `palette` survives as an alias until Task 7 precisely so that this holds.
- `Optic.tsx` is **not touched by any task.** Her eye is the dark object in both themes (spec §7). If a task seems to need it, stop and ask.

---

## File Structure

| file | responsibility |
|---|---|
| `src/core/theme.ts` | `Theme`, `Palette`, `DARK`, `LIGHT`, `PALETTES`, `themed`, `onLight`, `emotionText`. The only file holding a hex. |
| `src/core/useTheme.ts` | **new.** `usePalette()`. Separate from `theme.ts` because it imports the store, and `store.ts` imports `theme.ts` — the cycle would close. |
| `src/core/store.ts` | `theme` on the state, `setTheme`, `theme` in the soul blob. |
| `src/shell/ThemeSlider.tsx` | **new.** The `4b` control. Renders and dispatches, nothing more. |
| 19 files with `StyleSheet.create` | `const S = themed((p) => StyleSheet.create({…}))`, `const styles = S[theme]`. |
| `src/modules/registry.ts` · `src/shell/BatteryRow.tsx` | inline colours only — the hook, no sheet. |

---

### Task 1: Two palettes, and the helpers that pick between them

**Files:**
- Modify: `src/core/theme.ts`
- Test: `src/core/__tests__/palettes.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `type Theme = 'dark' | 'light'` · `interface Palette` · `DARK: Palette` · `LIGHT: Palette` · `PALETTES: Record<Theme, Palette>` · `themed<T>(make: (p: Palette) => T): Record<Theme, T>` · `onLight(hex: string): string` · `emotionText(iris: string, theme: Theme): string`. `export const palette` stays, as `DARK`, until Task 7.

**Five tokens are new to `palette` and their dark values come from literals already in the app.** `scrim` `#08080699`, `sheet` `#17171a` and `emptyNum` `#2b2820` are hardcoded in `Cabinet.tsx`; `footer` `#33302a` is hardcoded three times, in `LogScreen.tsx`, `FileScreen.tsx` and `SystemScreen.tsx`. They have to move here because those surfaces must change colour. `amberText` is the fifth, and in dark it equals `amber` — the split only exists on a pale ground.

- [ ] **Step 1: Write the failing test**

`src/core/__tests__/palettes.test.ts`:

```ts
import { DARK, LIGHT, PALETTES, emotionText, onLight, themed } from '../theme';
import { EMOTIONS } from '../../vera/emotions';

// Shape, not values: every key at every depth, with its type. This is the one
// test standing between a 76-key migration and a token that renders as
// `undefined` because it was added to one palette and forgotten in the other.
const shape = (v: unknown): unknown =>
  v !== null && typeof v === 'object'
    ? Object.fromEntries(
        Object.keys(v as object)
          .sort()
          .map((k) => [k, shape((v as Record<string, unknown>)[k])]),
      )
    : typeof v;

// WCAG relative luminance and contrast, so the light palette's type tokens can
// be held to a number rather than to an opinion.
const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};

describe('the two palettes', () => {
  it('gives every token in one a counterpart in the other', () => {
    expect(shape(LIGHT)).toEqual(shape(DARK));
  });

  it('is keyed by theme', () => {
    expect(PALETTES.dark).toBe(DARK);
    expect(PALETTES.light).toBe(LIGHT);
  });

  // Dark has one amber. The split is light's alone — `amberText` is the
  // darkened one, and on dark there is nothing to darken it against.
  it('splits amber only on the pale ground', () => {
    expect(DARK.amberText).toBe(DARK.amber);
    expect(LIGHT.amberText).not.toBe(LIGHT.amber);
  });

  // The launcher ground is a build-time asset in app.json and cannot know what
  // theme is stored, so the JS splash must not disagree with it.
  it('keeps the icon ground out of the theme', () => {
    expect(LIGHT.iconBg).toBe(DARK.iconBg);
  });

  // Benched since 2026-09-07 and unreachable. Twelve invented greens for a room
  // nobody can open would be worse than this line.
  it('leaves the benched room unthemed', () => {
    expect(LIGHT.organism).toEqual(DARK.organism);
  });
});

// This is what the derivation rule in the spec is FOR: `danger` carried over
// unchanged would sit at 2.87:1 on the pale ground and look fine in a diff.
describe('light type holds its ground', () => {
  const AA = 4.5;

  it.each([
    ['amberText', LIGHT.amberText, LIGHT.bg],
    ['danger', LIGHT.danger, LIGHT.bg],
    ['sealed', LIGHT.sealed, LIGHT.bg],
    ['text', LIGHT.text, LIGHT.bg],
    ['textDim', LIGHT.textDim, LIGHT.bg],
    ['mode.default.ink', LIGHT.mode.default.ink, LIGHT.panel],
    ['mode.supportive.ink', LIGHT.mode.supportive.ink, LIGHT.panel],
    ['advice.ink', LIGHT.advice.ink, LIGHT.advice.card],
    ['horror.ink', LIGHT.horror.ink, LIGHT.horror.card],
    ['notes.ink', LIGHT.notes.ink, LIGHT.notes.card],
  ])('%s clears AA', (_name, ink, ground) => {
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(AA);
  });

  it('does not carry the dark error red over', () => {
    expect(LIGHT.danger).not.toBe(DARK.danger);
    expect(contrast(DARK.danger, LIGHT.bg)).toBeLessThan(AA); // 2.87:1 — why
  });
});

describe('onLight', () => {
  // The design asks for `color-mix(in srgb, iris 52%, #000)`. 52% leaves
  // AMUSED at 3.82:1 on the strip it is drawn on — the one state the design's
  // own prose names as the case to check. 45% is the same decision with room.
  it('darkens every one of her states enough to read on the strip', () => {
    for (const { iris } of Object.values(EMOTIONS)) {
      if (iris === undefined) continue;
      expect(contrast(onLight(iris), LIGHT.panel)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mixes toward black, never away from it', () => {
    expect(lum(onLight('#ffd93d'))).toBeLessThan(lum('#ffd93d'));
  });

  it('returns a six-digit hex', () => {
    expect(onLight('#4fd08a')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('leaves her iris alone in the dark and mixes it in the light', () => {
    expect(emotionText('#ffd93d', 'dark')).toBe('#ffd93d');
    expect(emotionText('#ffd93d', 'light')).toBe(onLight('#ffd93d'));
  });
});

describe('themed', () => {
  it('builds one sheet per theme, and builds each exactly once', () => {
    const make = jest.fn((p) => ({ box: { backgroundColor: p.bg } }));
    const S = themed(make);
    expect(make).toHaveBeenCalledTimes(2);
    expect(S.dark.box.backgroundColor).toBe(DARK.bg);
    expect(S.light.box.backgroundColor).toBe(LIGHT.bg);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/core/__tests__/palettes.test.ts`
Expected: FAIL — `DARK`, `LIGHT`, `PALETTES`, `themed`, `onLight`, `emotionText` are not exported.

- [ ] **Step 3: Rename the existing palette and give it a type**

In `src/core/theme.ts`, keep the whole existing comment block at the top. Rename `export const palette = {` to `export const DARK: Palette = {`, **drop its trailing `as const`** (the interface carries the type now), and add these five tokens to it, each with the literal it replaces named in a comment:

```ts
  // Amber used as TYPE. In dark it is amber; the light palette darkens it,
  // which is the whole of the design's "Amber is darkened for type on light
  // grounds so it holds contrast; her iris keeps its hue."
  amberText: '#f4b43a',

  // Four surfaces that were raw literals until the theme needed them: the
  // cabinet's scrim, its sheet and its empty numerals (all three from
  // Cabinet.tsx), and the timestamp footer that LogScreen, FileScreen and
  // SystemScreen each spelled out separately.
  scrim: '#08080699',
  sheet: '#17171a',
  emptyNum: '#2b2820',
  footer: '#33302a',
```

Then add above it:

```ts
export type Theme = 'dark' | 'light';

interface ModeSkin { ink: string; wash: string; edge: string }
interface RoomInk {
  bg: string; card: string; cardBorder: string; rule: string;
  ink: string; inkSoft: string; inkDim: string; inkGhost: string;
}

export interface Palette {
  bg: string; bgDeep: string; bgFile: string; iconBg: string;
  panel: string; panelAlt: string;
  border: string; borderSoft: string; borderFaint: string;
  borderPill: string; borderLift: string;
  hairline: string; hairlineDim: string;
  text: string; textSoft: string; textDim: string; textMuted: string;
  textPill: string; textFaint: string; textGhost: string; textGhostest: string;
  amber: string; amberText: string;
  amberWash: string; amberEdge: string; amberEdgeSoft: string;
  danger: string; dangerSoft: string; sealed: string;
  scrim: string; sheet: string; emptyNum: string; footer: string;
  // The two register ids are spelled out here rather than imported from
  // vera/modes, for the reason the existing comment on `mode` gives: every hex
  // in the app stays greppable in this file. A third register is a key here.
  mode: Record<'default' | 'supportive', ModeSkin>;
  advice: RoomInk;
  notes: RoomInk;
  horror: RoomInk & { redaction: string };
  organism: {
    bg: string; card: string; cardBorder: string; well: string;
    wellBorder: string; ink: string; inkDim: string; label: string;
    text: string; textBright: string; green: string; hungry: string;
  };
}
```

- [ ] **Step 4: Add the light palette**

After `DARK`, in `src/core/theme.ts`:

```ts
// `2e COOL CLINICAL` from design/Theme Options.dc.html, picked by
// design/Vera Final.dc.html. Forty of these are transcribed verbatim; the rest
// are DERIVED, which that file authorises in as many words — "Every token in
// theme.ts gets a light counterpart" — under the three rules in
// docs/superpowers/specs/2026-09-29-light-theme-design.md §3. Every derived
// token used as type is held to AA by palettes.test.ts rather than by eye.
export const LIGHT: Palette = {
  bg: '#eceef0',
  bgDeep: '#e8ebed',
  // Derived: continues `bg → bgDeep`'s own step (−4,−3,−3) one rung further.
  bgFile: '#e4e8ea',
  // NOT themed. app.json fixes the native splash's ground at build time and
  // cannot know what theme is stored, so the JS frame must agree with the
  // native one rather than flash twice. See spec §8.
  iconBg: '#131011',
  panel: '#e2e6e9',
  panelAlt: '#f7f8f9',
  border: '#cbd1d6',
  borderSoft: '#d7dce0',
  borderFaint: '#d3d8dd',
  borderPill: '#b6bec5',
  // Derived: sits between borderPill and hairlineDim, as it does in dark.
  borderLift: '#a4acb3',
  hairline: '#c4cbd1',
  hairlineDim: '#7d868e',
  text: '#15181b',
  // Derived: between text and textDim, at dark's own proportion.
  textSoft: '#33393f',
  textDim: '#5b636b',
  // Derived: between textSoft and textDim.
  textMuted: '#474e55',
  textPill: '#4d565e',
  textFaint: '#848c94',
  textGhost: '#99a1a8',
  textGhostest: '#8a929a',
  // Her iris keeps its hue; the type darkens. 5.48:1 on `bg`.
  amber: '#d6920f',
  amberText: '#855500',
  amberWash: '#d6920f1a',
  amberEdge: '#d6920f99',
  // Derived: the light amber at the dark edge-soft's own alpha.
  amberEdgeSoft: '#d6920f66',
  // Derived, and the reason the rule exists: dark's #ff4a3d is 2.87:1 here,
  // under AA for type, and it is the app's own voice — every CLEAR, every
  // ERASE, every systemNotice. This is 4.82:1.
  danger: '#c62a1c',
  // Derived: kept as the more vivid of the pair, as in dark.
  dangerSoft: '#e04a38',
  // Derived: type only, on the SEALED label. 5.96:1.
  sealed: '#6b5730',
  scrim: '#1a1f2440',
  sheet: '#f8f9fa',
  emptyNum: '#d0d5da',
  footer: '#a9b0b7',
  // Derived: each register's accent takes amber's own two steps — the hue for
  // fills, a darkened form for type. Supportive's rose darkens to #c8534b.
  mode: {
    default: { ink: '#855500', wash: '#d6920f1a', edge: '#d6920f99' },
    supportive: { ink: '#8f332d', wash: '#c8534b1a', edge: '#c8534b99' },
  },
  // The advice room's light half is complete in the design.
  advice: {
    bg: '#f2f3f5', card: '#fbfcfd', cardBorder: '#dfe3e7', rule: '#e5e8ec',
    ink: '#1a1d21', inkSoft: '#5f666e', inkDim: '#767d85', inkGhost: '#b0b6bc',
  },
  // Four given, four derived from the advice room's ladder and tinted cool —
  // "each room keeps its own tint so the cabinet still reads as windows into
  // different rooms."
  notes: {
    bg: '#eef2f5', card: '#eaeff3', cardBorder: '#d2dbe2', rule: '#e1e8ee',
    ink: '#18212a', inkSoft: '#5d686f', inkDim: '#77828c', inkGhost: '#a8b2bb',
  },
  // Four given, five derived, tinted warm — the same darkness with blood left
  // in it, inverted. `redaction` INVERTS: in dark it is a bar slightly lighter
  // than the card, so here it is slightly darker. A withheld sentence has to
  // read as a solid, never as a hole.
  horror: {
    bg: '#f0eded', card: '#f2eeee', cardBorder: '#e0d8d8', rule: '#e9e1e0',
    ink: '#261f20', inkSoft: '#6b5f5f', inkDim: '#837777', inkGhost: '#b1a7a7',
    redaction: '#ded4d4',
  },
  // NOT themed. Off the registry since 2026-09-07 and unreachable, so reviving
  // the room means authoring its light half — which is a better line to leave
  // than twelve invented greens.
  organism: DARK.organism,
};

export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT };

// TEMPORARY, removed in the last task of this plan. Every call site still
// reading this is a file the migration has not reached; deleting it is what
// makes tsc name them.
export const palette = DARK;
```

- [ ] **Step 5: Add `themed`, `onLight` and `emotionText`**

```ts
// Both sheets, built ONCE at import and indexed at render. Not memoised per
// render: styles stay static, which several comments in this repo lean on,
// there is no frame on which a style object is a new identity, and the cost is
// 19 small objects built twice at boot and never again.
export const themed = <T,>(make: (p: Palette) => T): Record<Theme, T> => ({
  dark: make(DARK),
  light: make(LIGHT),
});

// Her nine states keep their hues in both themes (the design: "her iris keeps
// its hue"), which is fine for a dot and not for 9px type on a pale strip:
// AMUSED's yellow is 1.10:1 there. The design asks for
// `color-mix(in srgb, iris 52%, #000)`; RN has no color-mix, so this is it —
// a linear sRGB mix toward black, which is what color-mix does in that space.
//
// 45%, not the design's 52%, and this is the plan's one deliberate numeric
// departure. At 52% AMUSED lands at 3.82:1 — under AA, and it is the exact
// state the design's own prose names as the case to check. 47% is the first
// fraction that clears it and does so at 4.50:1 exactly, which rounding could
// tip; 45% clears every state with room and is not a visibly different choice.
const LIGHT_MIX = 0.45;

export const onLight = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16);
  return `#${[16, 8, 0]
    .map((shift) => Math.round(((n >> shift) & 0xff) * LIGHT_MIX))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
};

// Her iris where it is used as TYPE. Objects — the pulse dots, the slider's
// ring, the optic itself — take the raw iris in both themes.
export const emotionText = (iris: string, theme: Theme): string =>
  theme === 'light' ? onLight(iris) : iris;
```

- [ ] **Step 6: Run the tests and the typechecker**

Run: `npx jest src/core/__tests__/palettes.test.ts && npx tsc --noEmit`
Expected: PASS, and tsc clean. If the shape test fails, the two palettes disagree on a key — that is the test working.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: all green. Nothing consumes the new exports yet, and `palette` still resolves to the dark values, so no existing test can move.

- [ ] **Step 8: Commit**

```bash
git add src/core/theme.ts src/core/__tests__/palettes.test.ts
git commit -m "feat: a second palette, and the helpers that pick between them"
```

---

### Task 2: The theme is remembered, and she is not told

**Files:**
- Modify: `src/core/store.ts` — `SoulBlob` (≈165-173), `saveSoul` (≈178), the state interface (≈168), the initial state (≈309), `hydrate`'s read (≈483), a `setTheme` beside `setLang` (≈831)
- Create: `src/core/useTheme.ts`
- Test: `src/core/__tests__/store.test.ts` (modify — the two blob-shape assertions at ≈630 and ≈833)
- Test: `src/core/__tests__/theme-state.test.ts` (create)

**Interfaces:**
- Consumes: `Theme`, `PALETTES`, `Palette` from Task 1.
- Produces: `theme: Theme` and `setTheme: (theme: Theme) => Promise<void>` on `FacilityState`; `usePalette(): Palette` from `src/core/useTheme.ts`.

- [ ] **Step 1: Write the failing test**

`src/core/__tests__/theme-state.test.ts`:

```ts
import { useFacilityStore } from '../store';
import { DARK, LIGHT } from '../theme';

jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));

jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => { vault.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { vault.delete(k); }),
  };
});

describe('the theme', () => {
  it('starts dark, so nothing changes for anyone who never touches it', () => {
    expect(useFacilityStore.getState().theme).toBe('dark');
  });

  it('is written to the soul blob, so it survives a launch', async () => {
    await useFacilityStore.getState().setTheme('light');
    expect(useFacilityStore.getState().theme).toBe('light');

    const { storage, KEYS } = await import('../storage');
    const blob = JSON.parse((await storage.get(KEYS.soul)) ?? '{}');
    expect(blob.theme).toBe('light');
  });

  // The five stimuli are what she answers, and a theme is not one of them:
  // this is the subject rearranging their own furniture. It joins erasing the
  // transcript and switching language on the list of things she is not told.
  it('says nothing, and leaves no trace on her', async () => {
    useFacilityStore.setState({ log: [], line: '', systemNotice: null, lastPrompt: null });
    await useFacilityStore.getState().setTheme('light');

    const s = useFacilityStore.getState();
    expect(s.log).toEqual([]);
    expect(s.line).toBe('');
    expect(s.systemNotice).toBeNull();
    expect(s.lastPrompt).toBeNull();
  });

  it('reads a stored theme back, and tolerates a blob written before it existed', async () => {
    const { storage, KEYS } = await import('../storage');
    await storage.set(KEYS.soul, JSON.stringify({ visits: 3, theme: 'light' }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('light');

    await storage.set(KEYS.soul, JSON.stringify({ visits: 3 }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('dark');
  });

  it('rejects a stored value that is neither', async () => {
    const { storage, KEYS } = await import('../storage');
    await storage.set(KEYS.soul, JSON.stringify({ visits: 3, theme: 'chartreuse' }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('dark');
  });
});

describe('usePalette', () => {
  it('hands back the palette the store is set to', async () => {
    const { usePalette } = await import('../useTheme');
    const { renderHook } = await import('@testing-library/react-native');

    useFacilityStore.setState({ theme: 'dark' });
    expect(renderHook(() => usePalette()).result.current).toBe(DARK);

    useFacilityStore.setState({ theme: 'light' });
    expect(renderHook(() => usePalette()).result.current).toBe(LIGHT);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/core/__tests__/theme-state.test.ts`
Expected: FAIL — `theme` is not on the state and `setTheme` is not a function.

- [ ] **Step 3: Put `theme` on the state and in the blob**

In `src/core/store.ts`:

Add `theme: Theme;` to the `SoulBlob` interface and to `FacilityState`, importing `Theme` from `./theme` (the file already imports from there). Add `theme: s.theme,` to `saveSoul`'s blob, and `theme: 'dark',` to the initial state.

In `hydrate`'s `set({ … })`, beside the `lang` line and on its idiom — a stored value is trusted only when it is one of the two:

```ts
        // A blob written before the theme existed carries none, and an
        // unreadable one must not leave her painted in a colour nobody chose.
        theme: saved?.theme === 'light' ? 'light' : 'dark',
```

- [ ] **Step 4: Add `setTheme` beside `setLang`**

```ts
  // Switching the theme is a silent action, exactly as switching language is:
  // she is told nothing, nothing enters the transcript, and no stimulus fires.
  // The subject is rearranging their own furniture.
  setTheme: async (theme: Theme): Promise<void> => {
    set({ theme });
    await saveSoul(get());
  },
```

and `setTheme: (theme: Theme) => Promise<void>;` on the interface, beside `setLang`.

- [ ] **Step 5: Add the hook**

`src/core/useTheme.ts`:

```ts
import { useFacilityStore } from './store';
import { PALETTES, type Palette } from './theme';

// Its own file, not theme.ts: this imports the store, and store.ts imports
// theme.ts — putting it there would close the cycle.
//
// For colours that are NOT in a StyleSheet — a placeholder, a border read off
// the register, a room's accent blended with her mood. Anything in a sheet
// comes from `themed()` instead, which needs no hook at all.
export const usePalette = (): Palette => PALETTES[useFacilityStore((s) => s.theme)];
```

- [ ] **Step 6: Update the two blob-shape tests**

`src/core/__tests__/store.test.ts` pins the blob's exact key list at ≈630 and ≈833. Add `'theme'` to both sorted arrays. **Do this deliberately, not by loosening the assertion** — pinning the shape is why those tests exist, and they are the only thing that would catch a field reaching the disk by accident.

- [ ] **Step 7: Run both suites and the typechecker**

Run: `npx jest src/core/__tests__/theme-state.test.ts src/core/__tests__/store.test.ts && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 8: Run the whole suite, then commit**

```bash
npm test
git add src/core/store.ts src/core/useTheme.ts src/core/__tests__/theme-state.test.ts src/core/__tests__/store.test.ts
git commit -m "feat: the theme is remembered, and she is never told"
```

---

### Task 3: The slider

**Files:**
- Create: `src/shell/ThemeSlider.tsx`
- Test: `src/shell/__tests__/ThemeSlider.test.tsx` (create)

**Interfaces:**
- Consumes: `setTheme`, `theme` from the store (Task 2); `EMOTIONS` from `src/vera/emotions`.
- Produces: `<ThemeSlider />`, and the testIDs `theme-slider`, `theme-slider-thumb`.

`Theme Options.dc.html` turn 4, option `b`. Not wired into the header yet — that is Task 4, so this task's gate is the control on its own.

- [ ] **Step 1: Write the failing test**

`src/shell/__tests__/ThemeSlider.test.tsx`:

```ts
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { EMOTIONS } from '../../vera/emotions';
import { ThemeSlider } from '../ThemeSlider';

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({ theme: 'dark', emotion: 'calm' });
});

describe('ThemeSlider', () => {
  it('rests its ring on the dark half, and moves it to the light one', async () => {
    const dark = await render(<ThemeSlider />);
    expect(flat(dark.getByTestId('theme-slider-thumb').props.style).left).toBe(2);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<ThemeSlider />);
    expect(flat(light.getByTestId('theme-slider-thumb').props.style).left).toBe(16);
    await light.unmount();
  });

  it('switches the theme, both ways', async () => {
    const view = await render(<ThemeSlider />);
    await fireEvent.press(view.getByTestId('theme-slider'));
    expect(useFacilityStore.getState().theme).toBe('light');
    await fireEvent.press(view.getByTestId('theme-slider'));
    expect(useFacilityStore.getState().theme).toBe('dark');
  });

  // Vera Final's change to Theme Options, which ringed it in the theme's own
  // amber. The control sits beside her pulse dot and her wordmark; a fixed
  // amber there would be the one thing in that cluster not following her.
  it('rings the thumb in her current mood, not in the theme', async () => {
    useFacilityStore.setState({ emotion: 'alarmed' });
    const view = await render(<ThemeSlider />);
    expect(flat(view.getByTestId('theme-slider-thumb').props.style).borderColor)
      .toBe(EMOTIONS.alarmed.iris);
    await view.unmount();

    useFacilityStore.setState({ emotion: 'pleased' });
    const pleased = await render(<ThemeSlider />);
    expect(flat(pleased.getByTestId('theme-slider-thumb').props.style).borderColor)
      .toBe(EMOTIONS.pleased.iris);
    await pleased.unmount();
  });

  // The two halves are PICTURES of the two grounds, so they must not follow
  // the theme — a switch whose dark half went pale in light mode would be
  // showing the same colour twice.
  it('shows both grounds whichever one it is standing on', async () => {
    const halves = (v: Awaited<ReturnType<typeof render>>) => [
      flat(v.getByTestId('theme-slider-dark').props.style).backgroundColor,
      flat(v.getByTestId('theme-slider-light').props.style).backgroundColor,
    ];

    const dark = await render(<ThemeSlider />);
    expect(halves(dark)).toEqual(['#14130f', '#eceef0']);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<ThemeSlider />);
    expect(halves(light)).toEqual(['#14130f', '#eceef0']);
    await light.unmount();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/shell/__tests__/ThemeSlider.test.tsx`
Expected: FAIL — `Cannot find module '../ThemeSlider'`.

- [ ] **Step 3: Write the control**

`src/shell/ThemeSlider.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { themed } from '../core/theme';
import { EMOTIONS } from '../vera/emotions';
import { T } from './strings';

// `4b` in design/Theme Options.dc.html, picked by design/Vera Final.dc.html:
// "Split track, ring thumb. An iris ring frames the half you are in, leaving
// both grounds unobstructed. The ring slides across."
//
// The halves are HARDCODED and must stay so. They are pictures of the two
// grounds rather than uses of either, so a switch whose dark half went pale in
// light mode would be drawing the same colour twice and saying nothing. These
// are the only literal hexes outside theme.ts that this feature adds, and they
// belong to the control, not to a palette.
const GROUND_DARK = '#14130f';
const GROUND_LIGHT = '#eceef0';

const THUMB_LEFT = { dark: 2, light: 16 } as const;

const S = themed((p) =>
  StyleSheet.create({
    // 30x16, radius 9, hairline in the pill's own border. `overflow:hidden` is
    // what keeps the two grounds inside the rounded track.
    track: {
      width: 30,
      height: 16,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: p.borderPill,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    half: { flex: 1 },
    // Not a filled thumb: a ring, so neither ground is covered by the thing
    // pointing at it.
    thumb: {
      position: 'absolute',
      top: 2,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
    },
  }),
);

export function ThemeSlider() {
  const theme = useFacilityStore((s) => s.theme);
  const emotion = useFacilityStore((s) => s.emotion);
  const setTheme = useFacilityStore((s) => s.setTheme);
  const lang = useFacilityStore((s) => s.lang);

  const styles = S[theme];

  return (
    <Pressable
      testID="theme-slider"
      accessibilityRole="switch"
      accessibilityState={{ checked: theme === 'light' }}
      accessibilityLabel={T[lang].theme}
      hitSlop={10}
      onPress={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={styles.track}
    >
      <View testID="theme-slider-dark" style={[styles.half, { backgroundColor: GROUND_DARK }]} />
      <View testID="theme-slider-light" style={[styles.half, { backgroundColor: GROUND_LIGHT }]} />
      {/* Her mood, not the theme's amber — Vera Final's own change. */}
      <View
        testID="theme-slider-thumb"
        style={[
          styles.thumb,
          { left: THUMB_LEFT[theme], borderColor: EMOTIONS[emotion].iris },
        ]}
      />
    </Pressable>
  );
}
```

- [ ] **Step 4: Add the one string it needs**

The control has no visible text, but it needs a name for a screen reader. In `src/shell/strings.ts`, beside the other PREFERENCES labels, add `theme: 'THEME',` to the `en` table and `theme: '테마',` to the `ko` one. **Nothing else in this plan adds a string.**

- [ ] **Step 5: Run the test and the typechecker**

Run: `npx jest src/shell/__tests__/ThemeSlider.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc clean.

**If the `left` assertion fails**, the thumb is animated rather than a static left — it is deliberately not animated here. The design's 300ms travel is a `transition` on a persistent DOM node; the control unmounts and remounts on nothing, so a reanimated `withTiming` would be correct, and is left out of this task on purpose: get the two positions right first, and add the travel in Task 8 if it is worth it on the device.

- [ ] **Step 6: Commit**

```bash
npm test
git add src/shell/ThemeSlider.tsx src/shell/strings.ts src/shell/__tests__/ThemeSlider.test.tsx
git commit -m "feat: a 30x16 pill that shows both grounds and marks the one you are on"
```

---

### Task 4: Migrate `Stage.tsx`, and put the slider in her header

**Files:**
- Modify: `src/shell/Stage.tsx` — 29 `palette.*` references, the header, the emotion label
- Test: `src/shell/__tests__/Stage.test.tsx` (modify)

**Interfaces:**
- Consumes: `themed`, `emotionText`, `Palette` (Task 1); `theme` on the store (Task 2); `<ThemeSlider />` (Task 3).
- Produces: nothing new. The migration pattern every later task repeats.

**This is the pattern. Every migrated file is this shape.**

```diff
-import { font, ms, palette } from '../core/theme';
+import { font, ms, themed } from '../core/theme';

-const styles = StyleSheet.create({
-  stage: { flex: 1, backgroundColor: palette.bg },
+const S = themed((p) => StyleSheet.create({
+  stage: { flex: 1, backgroundColor: p.bg },
   …
-});
+}));

 export function Stage() {
+  const theme = useFacilityStore((s) => s.theme);
+  const styles = S[theme];
```

- [ ] **Step 1: Write the failing tests**

Add to `src/shell/__tests__/Stage.test.tsx`:

```ts
describe('the stage under both themes', () => {
  it('takes its ground from the theme', async () => {
    awake();
    const dark = await render(<Stage />);
    expect(flat(dark.getByTestId('stage').props.style).backgroundColor).toBe(DARK.bg);
    await dark.unmount();

    awake({ theme: 'light' });
    const light = await render(<Stage />);
    expect(flat(light.getByTestId('stage').props.style).backgroundColor).toBe(LIGHT.bg);
    await light.unmount();
  });

  // Her iris is for the DOT, which keeps its hue in both themes. The 9px label
  // beside it is type, and AMUSED's yellow is 1.10:1 on a pale strip.
  it('darkens her emotion label on the pale strip, and not the dot', async () => {
    awake({ emotion: 'amused', theme: 'light' });
    const view = await render(<Stage />);
    expect(flat(view.getByText('AMUSED').props.style).color)
      .toBe(emotionText(EMOTIONS.amused.iris, 'light'));
    expect(flat(view.getByTestId('strip-dot').props.style).backgroundColor)
      .toBe(EMOTIONS.amused.iris);
    await view.unmount();
  });

  it('leaves her label alone in the dark', async () => {
    awake({ emotion: 'amused' });
    const view = await render(<Stage />);
    expect(flat(view.getByText('AMUSED').props.style).color).toBe(EMOTIONS.amused.iris);
    await view.unmount();
  });

  it('offers the slider once she is awake, and never before', async () => {
    awake();
    const view = await render(<Stage />);
    expect(view.getByTestId('theme-slider')).toBeTruthy();
    await view.unmount();

    useFacilityStore.setState({ apiKey: '', emotion: 'dormant', log: [] });
    const gated = await render(<Stage />);
    expect(gated.queryByTestId('theme-slider')).toBeNull();
    await gated.unmount();
  });
});
```

Import `DARK`, `LIGHT` and `emotionText` at the top of that file, and add `theme: 'dark',` to the `awake` helper's `setState` so a test that does not name a theme is always dark.

**`strip-dot` may not exist yet.** Find the status strip's pulse dot in `Stage.tsx` and give it `testID="strip-dot"`; give the root `Animated.View` `testID="stage"` if it has none. Adding a testID is the smallest change that makes the assertion possible.

- [ ] **Step 2: Run them and watch them fail**

Run: `npx jest src/shell/__tests__/Stage.test.tsx`
Expected: FAIL on all four — the stage's ground does not follow the theme, no slider is rendered.

- [ ] **Step 3: Migrate the sheet**

Wrap `Stage.tsx`'s `StyleSheet.create` in `themed((p) => …)`, rename every `palette.` inside it to `p.`, and read `const styles = S[theme]` in the component. Apply §3.1 of the spec to the amber sites as you go:

| in `Stage.tsx` | takes |
|---|---|
| `hairlineAmber.backgroundColor` (≈801) | `p.amber` |
| `dockDots`' lead and mid (≈105, ≈108) | `p.amber` |
| the caret (≈628) · the chevron (≈984) · ≈1012 | `p.amberText` |

**`dockDots` becomes a function of the palette.** It is exported and tested, so change its signature to `dockDots(open: boolean, p: Palette)` and update `Stage.test.tsx`'s three `dockDots` tests to pass `DARK`. Its dot tiers are unchanged.

- [ ] **Step 4: Draw her label through `emotionText`**

The status strip's label currently takes `iris` directly. It takes `emotionText(iris, theme)` now. The strip's **dot** keeps the raw `iris`, as do the header's pulse dot and everything handed to `Optic`.

- [ ] **Step 5: Put the slider in the header**

In the header's right cluster, immediately **left** of the `headerDots` that open SYSTEM, inside the same `awake` guard those dots already sit behind:

```tsx
        {awake ? (
          <View style={styles.headerRight}>
            <ThemeSlider />
            <Pressable onPress={() => setView('sys')} hitSlop={12} style={styles.headerDots}>
```

`headerRight` is `{ flexDirection: 'row', alignItems: 'center', gap: 4 }` — the mock's own `gap:4` between the two.

- [ ] **Step 6: Run the tests and the typechecker**

Run: `npx jest src/shell/__tests__/Stage.test.tsx && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 7: Mutation-test the two that matter**

The repo's discipline, and it has found six real holes across the last two features. Apply each, confirm the suite goes red, revert:

1. `emotionText(iris, theme)` → `iris` in the label. Expected: the pale-strip test fails.
2. `S[theme]` → `S.dark`. Expected: the ground test fails.

**A survivor means the test is wrong, not that the mutation is safe.**

- [ ] **Step 8: Commit**

```bash
npm test
git add src/shell/Stage.tsx src/shell/__tests__/Stage.test.tsx
git commit -m "feat: her stage follows the theme, and carries its switch"
```

---

### Task 5: Migrate the rest of the shell

**Files:** each modified, with its own test file updated where it asserts a colour.

| file | refs | note |
|---|---|---|
| `src/shell/LogScreen.tsx` | 21 | `#33302a` → `p.footer`; two `palette.amber` → `p.amberText`; `danger` on CLEAR/ERASE |
| `src/shell/KeyPanel.tsx` | 16 | one `palette.amber` → `p.amberText` |
| `src/shell/SystemScreen.tsx` | 14 | `#33302a` → `p.footer`; one → `p.amberText` |
| `src/shell/KeyGate.tsx` | 14 | one → `p.amberText` |
| `src/shell/ModePicker.tsx` | 11 | `palette.mode[id]` → `p.mode[id]`, via the **hook** — it is read inline, not in the sheet |
| `src/shell/FileScreen.tsx` | 11 | `#33302a` → `p.footer` |
| `src/shell/Cabinet.tsx` | 5 | the three literals → `p.scrim`, `p.sheet`, `p.emptyNum` |
| `src/shell/Splash.tsx` | 4 | `iconBg` is theme-invariant; migrate the rest |
| `src/shell/PrefRow.tsx` | 3 | one → `p.amberText` |
| `src/shell/ThinkingDots.tsx` | 1 | → `p.amber` (a dot, not type) |
| `src/shell/BatteryRow.tsx` | 1 | **no sheet** — the hook alone |

**Interfaces:**
- Consumes: `themed`, `usePalette` (Tasks 1-2). Nothing new is produced.

- [ ] **Step 1: Write the failing test**

`src/shell/__tests__/bothThemes.test.tsx` (create) — one table, not eleven copies of the same test:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { DARK, LIGHT, type Palette } from '../../core/theme';
import { Cabinet } from '../Cabinet';
import { FileScreen } from '../FileScreen';
import { KeyGate } from '../KeyGate';
import { LogScreen } from '../LogScreen';
import { SystemScreen } from '../SystemScreen';

// Nothing in this file is allowed to leave the process, and the OS keystore has
// no jsdom implementation. Both mocks verbatim from Stage.test.tsx:15-32.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => { vault.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { vault.delete(k); }),
  };
});

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

// Each row names a component, the testID of the surface that carries its
// ground, and which palette token that ground should be. One row per themed
// screen; a screen added without a row here is a screen nothing checks.
const SURFACES: [string, React.ComponentType, string, (p: Palette) => string][] = [
  ['LogScreen', LogScreen, 'log-screen', (p) => p.bgDeep],
  ['SystemScreen', SystemScreen, 'system-screen', (p) => p.bgDeep],
  ['FileScreen', FileScreen, 'file-screen', (p) => p.bgFile],
  ['KeyGate', KeyGate, 'key-gate', (p) => p.panel],
  ['Cabinet', Cabinet, 'cabinet-sheet', (p) => p.sheet],
];

describe.each(SURFACES)('%s', (_name, Screen, testID, ground) => {
  it('takes its ground from the theme', async () => {
    useFacilityStore.setState({ theme: 'dark', lang: 'en' });
    const dark = await render(<Screen />);
    expect(flat(dark.getByTestId(testID).props.style).backgroundColor).toBe(ground(DARK));
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<Screen />);
    expect(flat(light.getByTestId(testID).props.style).backgroundColor).toBe(ground(LIGHT));
    await light.unmount();
  });
});
```

Add the testIDs each row names to the components that lack them, and nothing
else. A screen needing props to render gets them from `useFacilityStore.setState`
in the `beforeEach`, not from the row — the table's job is the ground, and a row
carrying props would make it the table's job to know each screen.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/shell/__tests__/bothThemes.test.tsx`
Expected: FAIL on every row — each ground is still the dark literal under both themes.

- [ ] **Step 3: Migrate the ten files with sheets**

Task 4's pattern, once per file. Read each file's `palette.` uses first and classify every `amber` by §3.1's rule — **`color:` takes `amberText`, everything else takes `amber`.**

- [ ] **Step 4: Migrate the two without sheets**

`BatteryRow.tsx` and `ModePicker.tsx`'s inline `palette.mode[id]` reads take `const p = usePalette()`. `ModePicker` keeps its sheet through `themed()` as well — it has both kinds.

- [ ] **Step 5: Run the affected suites and the typechecker**

Run: `npx jest src/shell && npx tsc --noEmit`
Expected: PASS, tsc clean. Existing colour assertions in `ModePicker.test.tsx`, `batteryRow.test.tsx`, `Splash.test.tsx` and `SystemScreen.test.tsx` reference `palette.*`; point them at `DARK.*`, which is the same object.

- [ ] **Step 6: Commit**

```bash
npm test
git add src/shell
git commit -m "feat: the shell's remaining screens follow the theme"
```

---

### Task 6: Migrate the rooms

**Files:**

| file | refs | note |
|---|---|---|
| `src/modules/advice/index.tsx` | 19 | its accent is `EMOTIONS[emotion].iris` — through `emotionText` where it is type |
| `src/modules/horror/index.tsx` | 22 | same, plus `p.horror.redaction` |
| `src/modules/notes/index.tsx` | 16 | same |
| `src/modules/notes/NoteEditor.tsx` | 9 | |
| `src/modules/notes/TimePicker.tsx` | 3 | |
| `src/modules/notes/DayPicker.tsx` | 3 | |
| `src/modules/organism/index.tsx` | 35 | migrate the mechanism; its tokens are the dark ones in both |
| `src/modules/registry.ts` | 1 | **no sheet** — the hook, or a `Palette` argument |

**Interfaces:**
- Consumes: `themed`, `emotionText`, `usePalette`. Nothing new is produced.

**The rooms read `s.theme` the way they already read `s.lang`.** `advice/index.tsx` and `organism/index.tsx` both do `useFacilityStore((s) => s.lang)` today, so this is that precedent, not the `emotion` one: the shell's chrome reaching a room, which §4's doorway rule has always allowed. **She is still told nothing about what is in any of them.**

- [ ] **Step 1: Write the failing tests**

Add a row per room to `SURFACES` in `bothThemes.test.tsx`, and in each room's own suite:

```ts
  // The room is lit in whatever she is wearing — and on a pale ground her iris
  // is for objects while the counter beside it is type.
  it('darkens her accent where the room uses it as type', async () => {
    useFacilityStore.setState({ emotion: 'amused', theme: 'light' });
    const view = await render(<Screen />);
    expect(flat(view.getByTestId('advice-counter').props.style).color)
      .toBe(emotionText(EMOTIONS.amused.iris, 'light'));
    await view.unmount();
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx jest src/modules`
Expected: FAIL — the grounds and the accents are dark under both themes.

- [ ] **Step 3: Migrate the seven files with sheets**

Task 4's pattern. In each room, the accent read from `EMOTIONS[emotion].iris` passes through `emotionText(iris, theme)` **where it is `color:`** and stays raw where it is a fill or a glyph's background. A star drawn as text is `color:` and therefore type.

- [ ] **Step 4: Migrate `registry.ts`**

It reads one token, for a tile. Take a `Palette` argument or the hook, whichever leaves `registry.ts` free of React — **prefer the argument**, because the registry is read by `Cabinet.tsx` and `ScreenRouter.tsx` and is not a component.

- [ ] **Step 5: Run the suites and the typechecker**

Run: `npx jest src/modules && npx tsc --noEmit`
Expected: PASS, tsc clean. `advice/__tests__/screen.test.tsx` and `notes/__tests__/editor.test.tsx` reference `palette.*`; point them at `DARK.*`.

- [ ] **Step 6: Commit**

```bash
npm test
git add src/modules
git commit -m "feat: the three rooms follow the theme"
```

---

### Task 7: Delete `palette`, and let tsc prove the migration

**Files:**
- Modify: `src/core/theme.ts` — remove `export const palette`
- Test: `src/core/__tests__/palettes.test.ts` (modify)

**Interfaces:**
- Consumes: Tasks 1-6. Produces: the guarantee that no file was left behind.

**This is the verification step, and it is why `palette` survived six tasks.** A file that still reads it is a file the migration never reached — and it would look, in a diff and in a green suite, exactly like a file that was finished. Deleting the export is the only detector.

- [ ] **Step 1: Find out whether anything still reads it**

```bash
grep -rn "palette\b" src --include='*.ts' --include='*.tsx' | grep -v "PALETTES\|palettes.test"
```

Expected: only `src/core/theme.ts`'s own definition. **Every other hit is a file to finish before going on.**

- [ ] **Step 2: Delete it**

Remove the `export const palette = DARK;` block and its TEMPORARY comment from `src/core/theme.ts`.

- [ ] **Step 3: Let the typechecker confirm**

Run: `npx tsc --noEmit`
Expected: **clean.** Any error names a site the migration missed — fix it there, not by restoring the export.

- [ ] **Step 4: Add the test that stops it coming back**

In `palettes.test.ts`:

```ts
// The migration's own guard. A `palette` export would compile, would pass every
// other test in this repo, and would silently pin whatever imported it to one
// theme forever.
it('offers no theme-blind palette to import', async () => {
  const theme = await import('../theme');
  expect('palette' in theme).toBe(false);
});
```

- [ ] **Step 5: Run everything**

Run: `npm test && npx tsc --noEmit`
Expected: all green, tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.ts src/core/__tests__/palettes.test.ts
git commit -m "refactor: no theme-blind palette left to import"
```

---

### Task 8: The documentation, and the device

**Files:**
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: CLAUDE.md**

Under the section the cabinet dock added, record: the two palettes and that `palette` is gone; `themed()` and why both sheets are built at import rather than memoised; `usePalette()` and the cycle that keeps it out of `theme.ts`; `theme` in the soul blob and that switching it is **silent**, on the list with language; `amber` splitting into `amber` and `amberText` with `color:` as the discriminator; **`onLight` at 45% and not the design's 52%**, with AMUSED's 3.82:1 as the reason; the optic being untouched in both themes; and the four things §8 of the spec says cannot be themed.

- [ ] **Step 2: README.md**

The stage paragraph gains the switch. The test count changes — take it from the suite, do not guess.

- [ ] **Step 3: Commit, then hand it to the device**

```bash
git add CLAUDE.md README.md
git commit -m "docs: the light theme"
```

**`npm test` cannot see contrast, and every number in Task 1 is a calculation.** On the phone, in light mode: her emotion label at each of the eight states (AMUSED is the one that was short of AA at the design's own 52%), CLEAR and ERASE in the new red, a kept star in the advice room, a redacted second sentence reading as a solid rather than a hole, and the launch — which will show a dark window for its first frames and cannot be made not to.
