import { act, render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

// Rendering every room pulls in her whole surface area. Nothing here is
// allowed to leave the process: `callLlm` is stubbed (requireActual is kept so
// AuthError stays a real class for speech.ts's `instanceof`), and the OS
// keystore, which has no jsdom implementation, becomes an in-memory vault.
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

beforeEach(() => {
  jest.restoreAllMocks();
  useFacilityStore.setState({
    hydrated: true, view: 'stage', lang: 'en', emotion: 'dormant',
    apiKey: 'sk-ant-api03-abcdefghijklmnop',
    log: [], impressions: [],
    cabinetOpen: false, keyPanelOpen: false, confirmingClear: false,
  });
});

// BackHandler in react-native 0.86 has no `mockPressBack` helper in its jest
// setup, so the handler the router registers is captured off a spy and called
// directly. Each press is wrapped in act(): stepBack writes to the store,
// which re-renders the router.
const captureBack = () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  return async () => {
    const handler = spy.mock.calls[0][1] as () => boolean;
    let consumed = false;
    await act(async () => {
      consumed = handler();
    });
    return consumed;
  };
};

test('the stage is what she boots into', async () => {
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('DORMANT')).toBeTruthy();
});

test('every view renders its own room', async () => {
  const views = ['stage', 'log', 'sys', 'mem', 'soul', 'mod01', 'mod02'] as const;
  for (const view of views) {
    useFacilityStore.setState({ view });
    const rendered = await render(<ScreenRouter />);
    expect(rendered.toJSON()).toBeTruthy();
    await rendered.unmount();
  }
});

test('sys is the SYSTEM screen now, not a placeholder', async () => {
  useFacilityStore.setState({ view: 'sys' });
  const { getByText, queryByText } = await render(<ScreenRouter />);
  expect(getByText('MEMORY.md')).toBeTruthy();
  expect(getByText('SOUL.md')).toBeTruthy();
  expect(queryByText('DORMANT')).toBeNull();
});

test('both documents come out of one screen', async () => {
  useFacilityStore.setState({ view: 'mem' });
  const mem = await render(<ScreenRouter />);
  expect(mem.getByText('MEMORY.md')).toBeTruthy();
  await mem.unmount();

  useFacilityStore.setState({ view: 'soul' });
  const soul = await render(<ScreenRouter />);
  expect(soul.getByText('SOUL.md')).toBeTruthy();
});

test('the rooms come from the registry', async () => {
  useFacilityStore.setState({ view: 'mod01' });
  const mod01 = await render(<ScreenRouter />);
  expect(mod01.getByTestId('view-mod01')).toBeTruthy();
  await mod01.unmount();

  useFacilityStore.setState({ view: 'mod02' });
  const mod02 = await render(<ScreenRouter />);
  expect(mod02.getByTestId('view-mod02')).toBeTruthy();
});

test('the cabinet is an overlay, not a view', async () => {
  useFacilityStore.setState({ view: 'stage', cabinetOpen: true });
  const { getByText, getByTestId } = await render(<ScreenRouter />);
  // The drawer's own header, not the stage's handle label — both say CABINET.
  expect(getByText('02 / 04 · CLOSE')).toBeTruthy();
  // The stage is still underneath it.
  expect(getByTestId('her-line')).toBeTruthy();
});

test('the credential panel is an overlay over SYSTEM', async () => {
  useFacilityStore.setState({ view: 'sys', keyPanelOpen: true });
  const { getByText } = await render(<ScreenRouter />);
  // The panel's own subtitle — 'ACCESS' alone is ambiguous, SYSTEM has a
  // section under that name underneath.
  expect(getByText('Replace her credential.')).toBeTruthy();
  expect(getByText('MEMORY.md')).toBeTruthy();
});

test('a file steps back to SYSTEM, and SYSTEM to the stage', async () => {
  const back = captureBack();
  useFacilityStore.setState({ view: 'mem' });
  await render(<ScreenRouter />);

  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().view).toBe('sys');
  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().view).toBe('stage');
  expect(await back()).toBe(false);
});

test('a room steps back to the stage', async () => {
  const back = captureBack();
  useFacilityStore.setState({ view: 'mod01' });
  await render(<ScreenRouter />);

  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().view).toBe('stage');
});

test('an open cabinet closes before it leaves the stage', async () => {
  const back = captureBack();
  useFacilityStore.setState({ view: 'stage', cabinetOpen: true });
  await render(<ScreenRouter />);

  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  expect(useFacilityStore.getState().view).toBe('stage');
});

test('an open credential panel closes before the view moves', async () => {
  const back = captureBack();
  useFacilityStore.setState({ view: 'sys', keyPanelOpen: true });
  await render(<ScreenRouter />);

  expect(await back()).toBe(true);
  expect(useFacilityStore.getState().keyPanelOpen).toBe(false);
  expect(useFacilityStore.getState().view).toBe('sys');
});
