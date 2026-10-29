import React from 'react';
import { render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { DARK, LIGHT, emotionText, type Palette } from '../../core/theme';
import { EMOTIONS } from '../../vera/emotions';
import { AdviceScreen } from '../advice';
import { affirmations } from '../affirmations';
import { HorrorScreen } from '../horror';
// The notes room exposes only its ModuleDef, as its own suite does it.
import { notes } from '../notes';

const NotesScreen = notes.Screen;
const AffirmationsScreen = affirmations.Screen;

jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));
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

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({ theme: 'dark', lang: 'en', emotion: 'amused' });
});

// A room added to the registry without a row here is a room nothing checks.
const ROOMS: [string, React.ComponentType, string, (p: Palette) => string][] = [
  ['advice', AdviceScreen, 'view-mod01', (p) => p.advice.bg],
  ['horror', HorrorScreen, 'view-mod02', (p) => p.horror.bg],
  ['notes', NotesScreen, 'view-mod03', (p) => p.notes.bg],
  ['affirmations', AffirmationsScreen, 'view-mod04', (p) => p.affirmations.room.bg],
];

describe.each(ROOMS)('the %s room', (_name, Screen, testID, ground) => {
  it('takes its ground from the theme', async () => {
    const dark = await render(<Screen />);
    expect(flat(dark.getByTestId(testID).props.style).backgroundColor).toBe(ground(DARK));
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<Screen />);
    expect(flat(light.getByTestId(testID).props.style).backgroundColor).toBe(ground(LIGHT));
    await light.unmount();
  });
});

// The rooms are lit in whatever she is wearing, and everything they draw with
// her iris is type — a counter, a mode label, a kept star, a caret. On a pale
// ground AMUSED's yellow is 1.10:1, so the accent is the darkened form here
// and the raw hue only on the stage's dots and her optic.
describe.each([
  ['advice', AdviceScreen, 'advice-counter'],
  ['horror', HorrorScreen, 'horror-counter'],
  // The notes room has no counter — nothing is dealt in it — so its accent is
  // read off the one control that is always on its front door.
  ['notes', NotesScreen, 'notes-new-text'],
] as const)('the %s room accent', (_name, Screen, counter) => {
  it('is her iris in the dark and darkened in the light', async () => {
    const dark = await render(<Screen />);
    expect(flat(dark.getByTestId(counter).props.style).color).toBe(EMOTIONS.amused.iris);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<Screen />);
    expect(flat(light.getByTestId(counter).props.style).color)
      .toBe(emotionText(EMOTIONS.amused.iris, 'light'));
    await light.unmount();
  });
});
