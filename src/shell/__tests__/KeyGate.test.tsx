import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { KeyGate } from '../KeyGate';

// The OS keystore has no jsdom implementation; activate()/removeKey() touch it
// via the store's secure seam, so it needs the same in-memory vault mock used
// in store.test.ts and storage.test.ts.
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

beforeEach(() => useFacilityStore.setState({ apiKey: '', emotion: 'dormant', lang: 'en' }));

describe('KeyGate', () => {
  it('asks for a key in her voice', async () => {
    const view = await render(<KeyGate />);
    expect(view.getByText('Insert a key to awaken her.')).toBeTruthy();
    expect(view.getByText('BRING HER ALIVE')).toBeTruthy();
  });

  // The doc's copy never names a provider, so the routes are apparatus, not
  // dialogue — but a gate that refuses you has to say what it wants (spec §9).
  it('lists the accepted routes without her mentioning them', async () => {
    const view = await render(<KeyGate />);
    expect(view.getByText('ANTHROPIC · OPENROUTER · OPENAI · DEEPSEEK · GROQ · GOOGLE')).toBeTruthy();
  });

  it('refuses a key it does not recognise and stays dormant', async () => {
    const view = await render(<KeyGate />);
    await fireEvent.changeText(view.getByPlaceholderText('paste your key'), 'xai-abcdefghijklmnop');
    await fireEvent.press(view.getByText('BRING HER ALIVE'));
    expect(view.getByText('That does not look like a key.')).toBeTruthy();
    expect(useFacilityStore.getState().apiKey).toBe('');
  });

  it('refuses a key that is too short', async () => {
    const view = await render(<KeyGate />);
    await fireEvent.changeText(view.getByPlaceholderText('paste your key'), 'sk-a');
    await fireEvent.press(view.getByText('BRING HER ALIVE'));
    expect(useFacilityStore.getState().apiKey).toBe('');
  });

  it('accepts a routed key and wakes her', async () => {
    const view = await render(<KeyGate />);
    await fireEvent.changeText(view.getByPlaceholderText('paste your key'), 'sk-ant-api03-abcdefghijklmnop');
    await fireEvent.press(view.getByText('BRING HER ALIVE'));
    expect(useFacilityStore.getState().apiKey).toBe('sk-ant-api03-abcdefghijklmnop');
    expect(useFacilityStore.getState().emotion).not.toBe('dormant');
  });

  it('clears the error as soon as you type again', async () => {
    const view = await render(<KeyGate />);
    const input = view.getByPlaceholderText('paste your key');
    await fireEvent.changeText(input, 'nope');
    await fireEvent.press(view.getByText('BRING HER ALIVE'));
    await fireEvent.changeText(input, 'sk-ant-');
    expect(view.queryByText('That does not look like a key.')).toBeNull();
  });
});
