import { renderHook } from '@testing-library/react-native';
import { useFacilityStore } from '../store';
import { KEYS, storage } from '../storage';
import { DARK, LIGHT } from '../theme';
import { usePalette } from '../useTheme';
import NotificationFace from '../../../modules/notification-face/src/NotificationFaceModule';

const face = NotificationFace as unknown as { setTheme: jest.Mock };

// Nothing in this file is allowed to leave the process.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));

// The OS keystore has no jsdom implementation — an in-memory vault is enough.
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});

describe('the theme', () => {
  it('starts dark, so nothing changes for anyone who never touches it', () => {
    expect(useFacilityStore.getState().theme).toBe('dark');
  });

  it('is written to the soul blob, so it survives a launch', async () => {
    await useFacilityStore.getState().setTheme('light');
    expect(useFacilityStore.getState().theme).toBe('light');

    const blob = JSON.parse((await storage.get(KEYS.soul)) ?? '{}');
    expect(blob.theme).toBe('light');
  });

  // The five stimuli are what she answers, and a theme is not one of them: this
  // is the subject rearranging their own furniture. It joins erasing the
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
    await storage.set(KEYS.soul, JSON.stringify({ visits: 3, theme: 'light' }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('light');

    await storage.set(KEYS.soul, JSON.stringify({ visits: 3 }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('dark');
  });

  it('rejects a stored value that is neither', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ visits: 3, theme: 'chartreuse' }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().theme).toBe('dark');
  });
});

describe('usePalette', () => {
  it('hands back the palette the store is set to', async () => {
    useFacilityStore.setState({ theme: 'dark' });
    const dark = await renderHook(() => usePalette());
    expect(dark.result.current).toBe(DARK);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await renderHook(() => usePalette());
    expect(light.result.current).toBe(LIGHT);
    await light.unmount();
  });
});

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

  // A cold start must hand it over too, or a phone switched to light before
  // this build would draw dark faces until the next switch.
  it('is handed over at hydrate, before anything is switched', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ visits: 3, theme: 'light' }));
    await useFacilityStore.getState().hydrate();
    expect(face.setTheme).toHaveBeenLastCalledWith(false);
  });
});
