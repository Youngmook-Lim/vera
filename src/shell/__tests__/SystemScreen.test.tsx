import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { SystemScreen } from '../SystemScreen';

// setLang calls speak(), which would otherwise reach the network. Nothing in
// this file is allowed to leave the process.
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

const RAW_KEY = 'sk-ant-api03-abcd1234';

beforeEach(() =>
  useFacilityStore.setState({
    view: 'sys', lang: 'en', apiKey: RAW_KEY,
    impressions: [{ text: 'Deflects.', at: 'JUL 30', sealed: false }],
    keyPanelOpen: false,
  }));

describe('SystemScreen', () => {
  it('lists both her files', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByText('MEMORY.md')).toBeTruthy();
    expect(view.getByText('SOUL.md')).toBeTruthy();
  });

  it('opens a file', async () => {
    const view = await render(<SystemScreen />);
    await fireEvent.press(view.getByText('MEMORY.md'));
    expect(useFacilityStore.getState().view).toBe('mem');
  });

  it('shows only the last four digits of the key', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByText('•••• 1234')).toBeTruthy();
    expect(view.queryByText(RAW_KEY)).toBeNull();
  });

  it('names the route the key is on', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByText('ANTHROPIC')).toBeTruthy();
  });

  it('switches language', async () => {
    const view = await render(<SystemScreen />);
    await fireEvent.press(view.getByText('LANGUAGE'));
    expect(useFacilityStore.getState().lang).toBe('ko');
  });

  // Critical: the raw credential must never reach the render tree — not in a
  // Text node, not in a prop, not in a testID or accessibility label. Checking
  // the whole serialized tree (not just queryByText) catches a leak through
  // any of those other channels.
  it('never renders the raw key anywhere in the tree', async () => {
    const view = await render(<SystemScreen />);
    const serialized = JSON.stringify(view.toJSON());
    expect(serialized).not.toContain(RAW_KEY);
  });
});
