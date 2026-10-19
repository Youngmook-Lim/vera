# Her face on every card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every notification the app sends shows one of her faces where Samsung draws the base icon, by posting it as a conversation card.

**Architecture:** the JS half writes `data.face` onto every card when it is scheduled: fixed per room, chosen per note. A local Expo module, `modules/notification-face`, registers a receiver that outranks expo-notifications' own. Its presentation delegate rebuilds any card carrying a face as a conversation card: `MessagingStyle` plus a long-lived dynamic shortcut whose icon is the face's launcher mipmap, in the dark or light finish the app last recorded. The shortcut is removed 3s after posting.

**Tech Stack:** Expo SDK 57 (expo-notifications 57.0.16, prebuilt), Kotlin, TypeScript, Zustand, jest-expo 57 / RTL v14.

**Spec:** `docs/superpowers/specs/2026-10-15-notification-faces-design.md`

## Global Constraints

- Faces: advice `pleased`, horror `alarmed`, both transmission slots `calm`, notes per note with default `calm`.
- Finish follows the app theme **at delivery**, read from a native SharedPreferences value written by `setTheme(dark)`. Never written means dark.
- A note missing a face, or carrying an unknown one, loads as `calm` and is **never dropped**.
- Every failure on the native side returns the card unchanged; a card never fails to arrive over its face.
- The JS wrapper uses `requireOptionalNativeModule` (the `power.ts` rule), never `requireNativeModule`.
- The module has its own `android/build.gradle` (the 2026-09-10 lesson), and depends on expo-notifications' **published artifact**, with the version read from `node_modules/expo-notifications/package.json`.
- All copy from the room's `strings.ts`; all hex from the palette or `EMOTIONS` (the iris is an object here, not type, so the raw hue).
- Single quotes. Verify with `npm test` and `npx tsc --noEmit`. No test makes a network request.
- Commits carry no reference to Claude or the model (user's global CLAUDE.md).

## Review Focus

1. **Notes already on disk have no `face`.** They must load as calm and keep arriving; dropping them would delete every note the subject has. Pinned in Task 2.
2. **Editing only a note's face** must reschedule its cards with the new face, not leave the old triggers carrying the old one. Pinned in Task 2.
3. **A build without the native module** (every dev build before this one): `setTheme` and `hydrate` must not throw. Pinned in Task 4.
4. **The theme the native side holds must match the app's on a cold start**, not only after a switch. `hydrate` must hand it over. Pinned in Task 4.
5. **A card with a face whose mipmap is missing, or on Android < 11**, arrives as today. The device is the only detector; the Kotlin returns `super`'s card on every early exit, and Task 5's device checklist covers it.

---

### Task 1: Every scheduled card says which face it wears

**Files:**
- Modify: `src/vera/emotions.ts` (add `WakingEmotion`, `WAKING_EMOTIONS`, `isWakingEmotion`)
- Modify: `src/modules/notify.ts` (`DailyConfig.face?`, written into `data`)
- Modify: `src/modules/advice/notify.ts`, `src/modules/horror/notify.ts`, `src/vera/transmissionsNotify.ts`
- Test: `src/modules/__tests__/notify.test.ts`, `src/modules/advice/__tests__/notify.test.ts`, `src/modules/horror/__tests__/notify.test.ts`, `src/vera/__tests__/transmissionsNotify.test.ts`, `src/vera/__tests__/emotions.test.ts` (create if absent)

**Interfaces:**
- Produces: `type WakingEmotion = Exclude<EmotionKey, 'dormant'>`; `WAKING_EMOTIONS: readonly WakingEmotion[]` (EMOTIONS order, dormant removed: calm, amused, disappointed, bored, pleased, suspicious, alarmed, affectionate); `isWakingEmotion(v: unknown): v is WakingEmotion`; `DailyConfig.face?: WakingEmotion`; card data `{ room, index, face? }`.

- [ ] **Step 1: Write the failing tests**

`src/modules/__tests__/notify.test.ts`, appended:

```ts
// The native side draws her face on a card only if the card says which one
// (2026-10-19). A room that names none sends cards exactly as before.
describe('the face a card wears', () => {
  it('rides in the data of every card when the room names one', async () => {
    const faced = makeDaily({
      room: 'faced', channel: 'faced-channel', channelName: 'FACED', hour: 9,
      face: 'pleased', count: () => 3, build: () => ({ title: 'T', body: 'b' }),
    });
    await faced.sync(true, 'en', new Date(2026, 8, 8, 8, 0));
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.content.data.face).toBe('pleased');
    }
  });

  it('is absent when the room names none', async () => {
    await daily.sync(true, 'en', new Date(2026, 8, 8, 8, 0));
    const [call] = mocked.scheduleNotificationAsync.mock.calls[0];
    expect(call.content.data).not.toHaveProperty('face');
  });
});
```

`src/modules/advice/__tests__/notify.test.ts`, in `describe('the executor')`:

```ts
  it('wears her pleased face', async () => {
    await syncDaily(true, 'en', new Date(2026, 8, 4, 8, 0));
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.content.data.face).toBe('pleased');
    }
  });
```

`src/modules/horror/__tests__/notify.test.ts`, in `describe('the nightly story')`:

```ts
  it('wears her alarmed face', async () => {
    await syncNightly(true, 'en', new Date(2026, 8, 4, 8, 0));
    for (const [call] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(call.content.data.face).toBe('alarmed');
    }
  });
```

`src/vera/__tests__/transmissionsNotify.test.ts`, in `describe('her transmissions')`:

```ts
  it('wears her calm face in either register', async () => {
    for (const mode of ['default', 'supportive'] as const) {
      jest.clearAllMocks();
      mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
      await syncTransmissions(true, mode, NOW);
      expect(queued().length).toBeGreaterThan(0);
      for (const r of queued()) expect(r.content.data.face).toBe('calm');
    }
  });
```

`src/vera/__tests__/emotions.test.ts` (append, or create with the import):

```ts
import { EMOTIONS, WAKING_EMOTIONS, isWakingEmotion } from '../emotions';

describe('the waking states', () => {
  it('are every state but dormant, in the table’s order', () => {
    expect(WAKING_EMOTIONS).toEqual(Object.keys(EMOTIONS).filter((k) => k !== 'dormant'));
  });

  it('recognise a waking state and nothing else', () => {
    expect(isWakingEmotion('pleased')).toBe(true);
    expect(isWakingEmotion('dormant')).toBe(false);
    expect(isWakingEmotion('wry')).toBe(false);
    expect(isWakingEmotion(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/modules/__tests__/notify.test.ts src/modules/advice/__tests__/notify.test.ts src/modules/horror/__tests__/notify.test.ts src/vera/__tests__/transmissionsNotify.test.ts src/vera/__tests__/emotions.test.ts`
Expected: FAIL. `face` is undefined in the data, and `WAKING_EMOTIONS` is not exported. tsc-level errors in the jest output for `face:` on `makeDaily` count as the failure.

- [ ] **Step 3: Implement**

`src/vera/emotions.ts`, after `isEmotionKey`:

```ts
// Every state she can be in while awake. `dormant` is the app's dead grey, not
// a face of hers: no card is sent by a dormant app, and no note may ask for one.
export type WakingEmotion = Exclude<EmotionKey, 'dormant'>;

export const WAKING_EMOTIONS = (Object.keys(EMOTIONS) as EmotionKey[]).filter(
  (k): k is WakingEmotion => k !== 'dormant',
);

export const isWakingEmotion = (v: unknown): v is WakingEmotion =>
  isEmotionKey(v) && v !== 'dormant';
```

`src/modules/notify.ts`: import `type WakingEmotion` from `'../vera/emotions'`; in `DailyConfig`, after `channelName`:

```ts
  // Which of her faces the card wears where Samsung draws the app's icon
  // (2026-10-19). Drawn by modules/notification-face when the card arrives;
  // a room that names none sends cards exactly as before.
  face?: WakingEmotion;
```

and the content line in `sync`:

```ts
              content: { title, body, data: { room: cfg.room, index, ...(cfg.face ? { face: cfg.face } : {}) } },
```

`src/modules/advice/notify.ts`: add `face: 'pleased',` after `channelName: 'EXCELLENT ADVICE',`.
`src/modules/horror/notify.ts`: add `face: 'alarmed',` after `channelName: 'TWO SENTENCE HORROR',`.
`src/vera/transmissionsNotify.ts`: add `face: 'calm',` after `channelName: TITLE,` (both registers: the subject chose calm for both).

- [ ] **Step 4: Run them to verify they pass**

Run: the Step 2 command.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/vera/emotions.ts src/modules/notify.ts src/modules/advice/notify.ts src/modules/horror/notify.ts src/vera/transmissionsNotify.ts src/modules/__tests__/notify.test.ts src/modules/advice/__tests__/notify.test.ts src/modules/horror/__tests__/notify.test.ts src/vera/__tests__/transmissionsNotify.test.ts src/vera/__tests__/emotions.test.ts
git commit -m "feat(notifications): every room's card says which face it wears"
```

---

### Task 2: A note keeps a face, and its cards carry it

**Files:**
- Modify: `src/modules/notes/stored.ts` (`Note.face`, serialize, parse defaulting)
- Modify: `src/modules/notes/store.ts` (`save` copies `draft.face`)
- Modify: `src/modules/notes/notify.ts` (`scheduleNote` writes `face`)
- Modify (fixtures gain `face: 'calm'`): `src/modules/notes/__tests__/schedule.test.ts`, `notify.test.ts`, `stored.test.ts`, `store.test.ts` (`draft`), `editor.test.tsx` (`NOTE`), `screen.test.tsx` (`NOTE`)
- Modify: `src/modules/notes/NoteEditor.tsx`: pass `face: note?.face ?? 'calm'` so it still type-checks. The picker comes in Task 3.

**Interfaces:**
- Consumes: `WakingEmotion`, `isWakingEmotion` (Task 1).
- Produces: `Note.face: WakingEmotion`; `Draft` (unchanged definition `Omit<Note,'id'> & { id?: string }`, so it now requires `face`); note card data `{ room: 'notes', id, face }`.

- [ ] **Step 1: Write the failing tests**

Add `face: 'calm'` to every fixture listed above first, so the existing suite type-checks against the new field.

`src/modules/notes/__tests__/stored.test.ts`, in `describe('a blob of notes')`:

```ts
  it('keeps the face each note wears', () => {
    const stored = { notes: [note({ face: 'alarmed' })] };
    expect(parse(serialize(stored)).notes[0].face).toBe('alarmed');
  });

  // Every note written before faces existed has none (2026-10-19). Dropping
  // it, as a missing hour is dropped, would delete every note the subject has;
  // a face, unlike an hour, has an honest default.
  it('reads a note with no face as calm, and keeps it', () => {
    const { face: _gone, ...old } = note();
    expect(parse(JSON.stringify({ notes: [old] })).notes).toEqual([note({ face: 'calm' })]);
  });

  it('reads a face that is not a waking state as calm', () => {
    for (const face of ['dormant', 'wry', 7]) {
      expect(parse(JSON.stringify({ notes: [{ ...note(), face }] })).notes[0].face).toBe('calm');
    }
  });
```

`src/modules/notes/__tests__/notify.test.ts`: change the existing assertion at line 45 to

```ts
      expect(r.content.data).toEqual({ room: 'notes', id: 'n1', face: 'calm' });
```

and add

```ts
  it('carries the face the note wears', async () => {
    await scheduleNote(note({ face: 'suspicious' }));
    for (const [r] of mocked.scheduleNotificationAsync.mock.calls) {
      expect(r.content.data.face).toBe('suspicious');
    }
  });
```

(Use the file's own handle on the mocked module, whatever it is named there.)

`src/modules/notes/__tests__/store.test.ts`:

```ts
  // Review Focus 2: a face is part of what a card says, so changing only the
  // face is an edit like any other — old triggers down, new ones up.
  it('reschedules a note whose only change is its face', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    jest.mocked(scheduleNote).mockClear();

    await useNotesStore.getState().save({ ...draft, id, face: 'affectionate' });

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(jest.mocked(scheduleNote).mock.calls[0][0].face).toBe('affectionate');
    expect(parse(await storage.get(KEYS.notes)).notes[0].face).toBe('affectionate');
  });
```

(`scheduleNote`, `cancelNote`, `parse`, `storage`, `KEYS` are already imported or mocked in that file; check the top and reuse its names.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/modules/notes`
Expected: FAIL. The new face assertions fail (`face` undefined, or the note dropped by `readNote`), and tsc errors on `face` not existing on `Note`.

- [ ] **Step 3: Implement**

`src/modules/notes/stored.ts`:

```ts
import { isWakingEmotion, type WakingEmotion } from '../../vera/emotions';
```

In `Note`, after `enabled`:

```ts
  // Which of her faces the card wears (2026-10-19). Drawn by
  // modules/notification-face when the card arrives.
  face: WakingEmotion;
```

In `serialize`'s map: `days: [...n.days], enabled: n.enabled, face: n.face,`

In `readNote`'s return: `days: n.days, enabled: n.enabled,` followed by

```ts
    // DEFAULTED, not dropped — the one field here that is. Every note written
    // before faces existed has none, and a face, unlike an hour, has an
    // honest answer when missing.
    face: isWakingEmotion(n.face) ? n.face : 'calm',
```

`src/modules/notes/store.ts`, in `save`'s `note` literal, after `enabled: draft.enabled,`: `face: draft.face,`

`src/modules/notes/notify.ts`, in `scheduleNote`: `data: { room: ROOM, id: note.id, face: note.face }`

`src/modules/notes/NoteEditor.tsx`, in `onSave`'s draft, after `enabled: …`: `face: note?.face ?? 'calm',`

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/modules/notes && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes
git commit -m "feat(notes): a note keeps a face, and its cards carry it"
```

---

### Task 3: Choosing a note's face

**Files:**
- Create: `src/modules/notes/FacePicker.tsx`
- Modify: `src/modules/notes/NoteEditor.tsx` (FACE legend + picker; `face` state)
- Modify: `src/modules/notes/index.tsx` (a dot in the note's iris on each row)
- Modify: `src/modules/notes/strings.ts` (`face: 'FACE'` / `'표정'`)
- Test: `src/modules/notes/__tests__/pickers.test.tsx`, `editor.test.tsx`, `screen.test.tsx`

**Interfaces:**
- Consumes: `WAKING_EMOTIONS`, `WakingEmotion`, `EMOTIONS`, `emotionLabel` (emotions.ts); `emotionText` (theme.ts).
- Produces: `FacePicker({ face, onChange, lang }: { face: WakingEmotion; onChange: (f: WakingEmotion) => void; lang: Lang })`. testIDs `face-<key>` (radio, `accessibilityState.selected`), `face-label`; row dot `notes-row-<id>-face`.

- [ ] **Step 1: Write the failing tests**

`pickers.test.tsx`:

```tsx
import { FacePicker } from '../FacePicker';
import { EMOTIONS, WAKING_EMOTIONS } from '../../../vera/emotions';

describe('the face picker', () => {
  it('offers every waking face, each in its own iris, and rings the chosen one', async () => {
    const view = await render(<FacePicker face="pleased" onChange={() => {}} lang="en" />);
    for (const key of WAKING_EMOTIONS) {
      const dot = view.getByTestId(`face-${key}`);
      expect(dot.props.accessibilityState.selected).toBe(key === 'pleased');
      expect(StyleSheet.flatten(view.getByTestId(`face-${key}-iris`).props.style).backgroundColor)
        .toBe(EMOTIONS[key].iris);
    }
    expect(view.queryByTestId('face-dormant')).toBeNull();
    expect(view.getByTestId('face-label')).toHaveTextContent('PLEASED');
    await view.unmount();
  });

  it('hands back the face that was tapped', async () => {
    const onChange = jest.fn();
    const view = await render(<FacePicker face="calm" onChange={onChange} lang="en" />);
    await fireEvent.press(view.getByTestId('face-alarmed'));
    expect(onChange).toHaveBeenCalledWith('alarmed');
    await view.unmount();
  });

  it('names the face in her language', async () => {
    const view = await render(<FacePicker face="calm" onChange={() => {}} lang="ko" />);
    expect(view.getByTestId('face-label')).toHaveTextContent(EMOTIONS.calm.label.ko);
    await view.unmount();
  });
});
```

(Add `StyleSheet` from `react-native` and whatever RTL imports the file lacks.)

`editor.test.tsx`:

```tsx
  it('starts a new note on calm, and saves the face chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    expect(view.getByTestId('face-calm').props.accessibilityState.selected).toBe(true);

    await fireEvent.changeText(view.getByTestId('note-text'), 'Breathe');
    await fireEvent.press(view.getByTestId('day-1'));
    await fireEvent.press(view.getByTestId('face-bored'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()[0].face).toBe('bored');
    await view.unmount();
  });

  it('opens an existing note on the face it wears', async () => {
    useNotesStore.setState({ notes: [{ ...NOTE, face: 'amused' }] });
    const view = await render(
      <NoteEditor note={{ ...NOTE, face: 'amused' }} onDone={() => {}} accent="#f4b43a" />,
    );
    expect(view.getByTestId('face-amused').props.accessibilityState.selected).toBe(true);
    await view.unmount();
  });
```

`screen.test.tsx`:

```tsx
  it('marks each row with the face its cards wear', async () => {
    useNotesStore.setState({ notes: [{ ...NOTE, face: 'alarmed' }] });
    const view = await render(<NotesScreen />); // use the file's own way of rendering the room
    expect(StyleSheet.flatten(view.getByTestId('notes-row-n1-face').props.style).backgroundColor)
      .toBe(EMOTIONS.alarmed.iris);
    await view.unmount();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/modules/notes`
Expected: FAIL. `../FacePicker` cannot be found, and testID `face-calm` / `notes-row-n1-face` are not found.

- [ ] **Step 3: Implement**

`src/modules/notes/strings.ts`: add `face: string;` to `NotesStrings` after `days`, plus `face: 'FACE',` (en) and `face: '표정',` (ko).

`src/modules/notes/FacePicker.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { PALETTES, emotionText, font, ms, themed } from '../../core/theme';
import { EMOTIONS, WAKING_EMOTIONS, emotionLabel, type WakingEmotion } from '../../vera/emotions';

// Which of her faces a note's cards wear where Samsung draws the app's icon
// (2026-10-19). Eight dots in their raw iris — an object, not type, so the
// hue is not darkened on light — with the chosen one ringed and named
// underneath in the darkened ink type takes.
export function FacePicker({
  face,
  onChange,
  lang,
}: {
  face: WakingEmotion;
  onChange: (face: WakingEmotion) => void;
  lang: Lang;
}) {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {WAKING_EMOTIONS.map((key) => {
          const on = key === face;
          return (
            <Pressable
              key={key}
              testID={`face-${key}`}
              accessibilityRole="radio"
              accessibilityLabel={emotionLabel(key, lang)}
              accessibilityState={{ selected: on }}
              hitSlop={6}
              onPress={() => onChange(key)}
              style={[styles.ring, { borderColor: on ? p.notes.ink : 'transparent' }]}
            >
              <View
                testID={`face-${key}-iris`}
                style={[styles.iris, { backgroundColor: EMOTIONS[key].iris }]}
              />
            </Pressable>
          );
        })}
      </View>
      <Text
        testID="face-label"
        style={[
          styles.label,
          { fontFamily: font('mono', 500, lang), color: emotionText(EMOTIONS[face].iris, theme) },
        ]}
      >
        {emotionLabel(face, lang)}
      </Text>
    </View>
  );
}

const S = themed((p) => StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  ring: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iris: { width: 18, height: 18, borderRadius: 9 },
  label: { fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.22 },
}));
```

(`p` is unused inside the sheet. If lint objects, drop the parameter name to `_p`; `themed` still needs the function shape.)

`NoteEditor.tsx`:
- Import `FacePicker`.
- Add state `const [face, setFace] = useState<WakingEmotion>(note?.face ?? 'calm');` and import `type WakingEmotion` from `../../vera/emotions`.
- In `onSave`, replace `face: note?.face ?? 'calm',` with `face,`.
- After the `DayPicker` line:

```tsx
      <Text style={[styles.legend, { fontFamily: font('mono', 500, lang) }]}>{t.face}</Text>
      <FacePicker face={face} onChange={setFace} lang={lang} />
```

`index.tsx`, inside each row's `rowText` View: wrap the time `Text` in a row with the dot.

```tsx
              <View style={styles.rowHead}>
                <Text …existing time Text unchanged… />
                {/* The face this note's cards wear. Its raw iris: an object,
                    not type. */}
                <View
                  testID={`notes-row-${note.id}-face`}
                  style={[styles.faceDot, { backgroundColor: EMOTIONS[note.face].iris }]}
                />
              </View>
```

with styles `rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },` and `faceDot: { width: 7, height: 7, borderRadius: 3.5 },`. `EMOTIONS` is already imported in `index.tsx`.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/modules/notes && npx tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notes
git commit -m "feat(notes): choose the face a note's cards wear"
```

---

### Task 4: The native module, and the theme it draws in

**Files:**
- Create: `modules/notification-face/expo-module.config.json`
- Create: `modules/notification-face/android/build.gradle`
- Create: `modules/notification-face/android/src/main/AndroidManifest.xml`
- Create: `modules/notification-face/android/src/main/java/expo/modules/notificationface/NotificationFaceModule.kt`
- Create: `modules/notification-face/android/src/main/java/expo/modules/notificationface/FaceTheme.kt`
- Create: `modules/notification-face/android/src/main/java/expo/modules/notificationface/FaceNotificationsService.kt`
- Create: `modules/notification-face/src/NotificationFaceModule.ts`
- Create: `src/core/notificationFace.ts`
- Modify: `jest.setup.ts` (global mock of the module)
- Modify: `src/core/store.ts` (`setTheme` and `hydrate` hand the theme over)
- Test: `src/core/__tests__/theme-state.test.ts`, `src/core/__tests__/notificationFaceUnlinked.test.ts` (create)

**Interfaces:**
- Consumes: card data `{ room, face }` (Tasks 1–2); mipmaps `ic_launcher_<face>` and `ic_launcher_light_<face>`, generated by `plugins/withRotatingIcons.js`.
- Produces: native module `NotificationFace` with `setTheme(dark: boolean): boolean`; `syncNotificationTheme(theme: Theme): void` in `src/core/notificationFace.ts`.

- [ ] **Step 1: Write the failing tests**

`jest.setup.ts`, beside the power mock:

```ts
// Her face on a notification is drawn natively when the card arrives; the JS
// side only records which finish to draw it in (2026-10-19).
jest.mock('./modules/notification-face/src/NotificationFaceModule', () => ({
  __esModule: true,
  default: { setTheme: jest.fn(() => true) },
}));
```

`src/core/__tests__/theme-state.test.ts`:

```ts
import NotificationFace from '../../../modules/notification-face/src/NotificationFaceModule';

const face = NotificationFace as unknown as { setTheme: jest.Mock };

// The face on a card is drawn when the card ARRIVES, by native code that
// cannot ask the store, so the store tells it (2026-10-19).
describe('the finish her notification face is drawn in', () => {
  beforeEach(() => face.setTheme.mockClear());

  it('follows a switch of theme', async () => {
    await useFacilityStore.getState().setTheme('light');
    expect(face.setTheme).toHaveBeenLastCalledWith(false);
    await useFacilityStore.getState().setTheme('dark');
    expect(face.setTheme).toHaveBeenLastCalledWith(true);
  });

  // Review Focus 4: a cold start must hand it over too, or a phone switched
  // to light before this build would draw dark faces until the next switch.
  it('is handed over at hydrate, before anything is switched', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ theme: 'light' }));
    await useFacilityStore.getState().hydrate();
    expect(face.setTheme).toHaveBeenLastCalledWith(false);
  });
});
```

(Reuse the file's existing `KEYS`/`storage` imports. If the soul blob needs more fields to hydrate cleanly, copy the shape the file's other hydrate test uses.)

`src/core/__tests__/notificationFaceUnlinked.test.ts`:

```ts
// Every dev build made before this module existed has no NotificationFace in
// it. Its own file for the reason powerUnlinked.test.ts is: a file-level
// jest.mock is the only thing that displaces the global one.
jest.mock('../../../modules/notification-face/src/NotificationFaceModule', () => ({
  __esModule: true,
  default: null,
}));

import { syncNotificationTheme } from '../notificationFace';

describe('a build with no notification-face module', () => {
  it('does nothing, and takes nothing down', () => {
    expect(() => syncNotificationTheme('light')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest src/core/__tests__/theme-state.test.ts src/core/__tests__/notificationFaceUnlinked.test.ts`
Expected: FAIL. The module path cannot be resolved, and `../notificationFace` does not exist.

- [ ] **Step 3: Implement**

`modules/notification-face/src/NotificationFaceModule.ts`:

```ts
import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class NotificationFaceModule extends NativeModule<Record<string, never>> {
  // Records which finish her face on a notification is drawn in. The receiver
  // reads it when a card ARRIVES, so a theme switch reschedules nothing.
  setTheme(dark: boolean): boolean;
}

// `requireOptionalNativeModule`, NOT `requireNativeModule` — see
// modules/power/src/PowerModule.ts for the crash that taught this. Every dev
// build made before this module existed has none, and must not die on import.
export default requireOptionalNativeModule<NotificationFaceModule>('NotificationFace');
```

`src/core/notificationFace.ts`:

```ts
// Her face on a notification is drawn natively, when the card arrives — see
// modules/notification-face. All the JS side does is say which finish: the
// receiver cannot ask the store, and the per-app night mode is written only
// on the way out of the app.
import NotificationFace from '../../modules/notification-face/src/NotificationFaceModule';
import type { Theme } from './theme';

export const syncNotificationTheme = (theme: Theme): void => {
  if (!NotificationFace) return;
  try {
    NotificationFace.setTheme(theme === 'dark');
  } catch {
    // A card arriving in the other finish is not worth taking anything down.
  }
};
```

`src/core/store.ts`: `import { syncNotificationTheme } from './notificationFace';`. In `setTheme`, after `set({ theme });`, add `syncNotificationTheme(theme);`. In `hydrate`, immediately after the big `set({ hydrated: true, … })` call, add

```ts
      // The receiver that draws her face on a card reads this, not the store.
      syncNotificationTheme(get().theme);
```

`modules/notification-face/expo-module.config.json`:

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.notificationface.NotificationFaceModule"]
  }
}
```

`modules/notification-face/android/build.gradle`:

```gradle
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}

group = 'expo.modules.notificationface'
version = '0.1.0'

android {
  namespace "expo.modules.notificationface"
  defaultConfig {
    versionCode 1
    versionName "0.1.0"
  }
  lintOptions {
    abortOnError false
  }
}

// expo-notifications ships PREBUILT (the `publication` in its
// expo-module.config.json), so it is not a Gradle project and
// `project(':expo-notifications')` fails the build — the spike's first build
// did exactly that. Its published artifact is what the app itself links, and
// the version is read rather than written so an upgrade cannot leave the two
// disagreeing.
def notificationsVersion = new groovy.json.JsonSlurper()
  .parse(file("${projectDir}/../../../node_modules/expo-notifications/package.json"))
  .version

dependencies {
  if (rootProject.findProject(':expo-notifications') != null) {
    implementation project(':expo-notifications')
  } else {
    implementation "host.exp.exponent:expo.modules.notifications:${notificationsVersion}"
  }
  implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'
}
```

`modules/notification-face/android/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application>
    <!-- Outranks expo-notifications' own receiver (priority -1).
         NotificationsService.findDesignatedBroadcastReceiver hands every
         presentation to the highest-priority receiver for this action in the
         package. Only presentation is changed; everything else is inherited. -->
    <receiver
      android:name="expo.modules.notificationface.FaceNotificationsService"
      android:enabled="true"
      android:exported="false">
      <intent-filter android:priority="10">
        <action android:name="expo.modules.notifications.NOTIFICATION_EVENT" />
      </intent-filter>
    </receiver>
  </application>
</manifest>
```

`FaceTheme.kt`:

```kotlin
package expo.modules.notificationface

import android.content.Context

// Which finish her face on a notification is drawn in. Written by the JS side
// on every theme switch and at hydrate; read by the receiver when a card
// arrives. Never written means dark, which is the app's own default.
object FaceTheme {
  private const val PREFS = "notification-face"
  private const val KEY = "dark"

  fun isDark(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, true)

  fun setDark(context: Context, dark: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY, dark).apply()
  }
}
```

`NotificationFaceModule.kt`:

```kotlin
package expo.modules.notificationface

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationFaceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationFace")

    Function("setTheme") { dark: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      FaceTheme.setDark(context, dark)
      true
    }
  }
}
```

`FaceNotificationsService.kt`:

```kotlin
package expo.modules.notificationface

import android.app.Person
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate

// Her face on every card, where Samsung's One UI draws the app's own icon
// (2026-10-19, spec docs/superpowers/specs/2026-10-15-notification-faces-design.md).
//
// What the phone showed in the spike, and why this is shaped the way it is:
// a large icon goes on the RIGHT; a MessagingStyle sender picture shows only
// when the card is EXPANDED; only a real conversation card — MessagingStyle
// tied to a long-lived shortcut carrying the same Person — shows a face
// collapsed. The face drawn is the SHORTCUT's icon, never the sender's, so
// there is one shortcut per room per face per finish. Android caches a
// conversation's shortcut once a card uses it, so the shortcut is removed
// after posting and the card keeps its face.
class FaceNotificationsService : NotificationsService() {
  override fun getPresentationDelegate(context: Context): PresentationDelegate =
    FacePresentationDelegate(context)
}

class FacePresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  // Every early exit returns `built`: a card never fails to arrive over its face.
  override suspend fun createNotification(
    notification: Notification,
    notificationBehavior: NotificationBehaviorRecord?
  ): android.app.Notification {
    val built = super.createNotification(notification, notificationBehavior)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return built
    return try {
      val data = notification.notificationRequest.content.body ?: return built
      val face = data.optString("face", "")
      if (face !in FACES) return built
      val dark = FaceTheme.isDark(context)
      val bitmap = faceBitmap(face, dark) ?: return built
      val room = data.optString("room", "card")
      asConversation(built, bitmap, "face.$room.$face.${if (dark) "dark" else "light"}")
    } catch (e: Exception) {
      Log.e(TAG, "could not put her face on a card", e)
      built
    }
  }

  private fun asConversation(
    built: android.app.Notification,
    bitmap: Bitmap,
    shortcutId: String
  ): android.app.Notification {
    val title = built.extras.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString()
      ?.ifEmpty { null } ?: "V.E.R.A."
    val text = built.extras.getCharSequence(android.app.Notification.EXTRA_TEXT) ?: ""
    val icon = Icon.createWithBitmap(bitmap)
    val her = Person.Builder().setName(title).setIcon(icon).setKey(shortcutId).build()

    val shortcuts = context.getSystemService(ShortcutManager::class.java)
    // Anything a previous card left behind first, in case its delayed removal
    // never ran — the process can die inside those three seconds.
    shortcuts.removeDynamicShortcuts(
      shortcuts.dynamicShortcuts.map { it.id }.filter { it.startsWith("face.") && it != shortcutId }
    )
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    shortcuts.pushDynamicShortcut(
      ShortcutInfo.Builder(context, shortcutId)
        .setShortLabel(title)
        .setIcon(icon)
        .setIntent(launch.setAction(Intent.ACTION_MAIN))
        .setLongLived(true)
        .setPerson(her)
        .build()
    )

    val you = Person.Builder().setName("You").build()
    val card = android.app.Notification.Builder.recoverBuilder(context, built)
      .setShortcutId(shortcutId)
      .setStyle(
        android.app.Notification.MessagingStyle(you)
          .addMessage(text, System.currentTimeMillis(), her)
      )
      .build()

    // Gone from the launcher's long-press menu; the posted card keeps its
    // face, because Android cached the shortcut when the card used it.
    Handler(Looper.getMainLooper()).postDelayed(
      { shortcuts.removeDynamicShortcuts(listOf(shortcutId)) },
      REMOVE_AFTER_MS
    )
    return card
  }

  // The launcher face already in the APK, generated by withRotatingIcons:
  // ic_launcher_<face> dark, ic_launcher_light_<face> light.
  private fun faceBitmap(face: String, dark: Boolean): Bitmap? {
    val name = if (dark) "ic_launcher_$face" else "ic_launcher_light_$face"
    val id = context.resources.getIdentifier(name, "mipmap", context.packageName)
    if (id == 0) {
      Log.e(TAG, "no mipmap named $name")
      return null
    }
    val drawable = context.resources.getDrawable(id, null) ?: return null
    val bitmap = Bitmap.createBitmap(SIZE_PX, SIZE_PX, Bitmap.Config.ARGB_8888)
    drawable.setBounds(0, 0, SIZE_PX, SIZE_PX)
    drawable.draw(Canvas(bitmap))
    return bitmap
  }

  companion object {
    private const val TAG = "notification-face"
    private const val SIZE_PX = 256
    private const val REMOVE_AFTER_MS = 3000L
    private val FACES = setOf(
      "calm", "amused", "disappointed", "bored", "pleased", "suspicious", "alarmed", "affectionate",
    )
  }
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx jest src/core/__tests__/theme-state.test.ts src/core/__tests__/notificationFaceUnlinked.test.ts && npx tsc --noEmit && npx expo-modules-autolinking resolve --platform android | grep -n "notification-face"`
Expected: PASS, tsc clean, and autolinking lists `notification-face` with `expo.modules.notificationface.NotificationFaceModule`.

- [ ] **Step 5: Commit**

```bash
git add modules/notification-face src/core/notificationFace.ts src/core/store.ts jest.setup.ts src/core/__tests__/theme-state.test.ts src/core/__tests__/notificationFaceUnlinked.test.ts
git commit -m "feat(notifications): her face on every card, drawn as a conversation"
```

---

### Task 5: Documentation, the full suite, and the device checklist

**Files:**
- Modify: `CLAUDE.md`: a section after the voice sections, "What exists" entries for `modules/notification-face` and `src/core/notificationFace.ts`, the notes store row gains "the face its cards wear", and "What cannot be themed" is corrected (the face's finish now follows the theme; the card's colour still does not).
- Modify: `docs/superpowers/specs/2026-10-15-notification-faces-design.md`: the shortcut id is `face.<room>.<face>.<dark|light>`, not `face.<face>.<dark|light>`, so two rooms sharing a face never share a conversation title. Also record the sweep of stale `face.*` shortcuts before each push.

- [ ] **Step 1: Write the docs** (no test: prose).

- [ ] **Step 2: Run the whole suite and tsc**

Run: `npm test 2>&1 | tail -6 && npx tsc --noEmit`
Expected: every suite passes, tsc clean.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-10-15-notification-faces-design.md
git commit -m "docs: her face on every card"
```

- [ ] **Step 4: Device checklist (the subject's, after `npx eas-cli@latest build -p android --profile development`)**

1. A note in two different faces, each collapsed and expanded.
2. The advice and horror cards, the next time each arrives.
3. Switch to light theme, then let a note fire: the light finish.
4. A card arriving with the app open.
5. Long-press the launcher icon: no NOTES / ADVICE shortcuts left behind.

Afterwards, delete the spike: `git worktree remove ../vera-spike-notif-eye && git branch -D spike/notif-eye`.
