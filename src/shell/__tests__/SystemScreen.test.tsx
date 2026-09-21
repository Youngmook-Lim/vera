import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { registry } from '../../modules/registry';
import { isModule } from '../../modules/types';
import { providerFor } from '../../vera/providers';
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
    view: 'sys', lang: 'en', apiKey: RAW_KEY, authFails: 0,
    memory: { facts: [], verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 1 }], threads: [], pending: [] },
    keyPanelOpen: false,
  }));

describe('SystemScreen', () => {
  it('lists both her files', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByText('RECORD')).toBeTruthy();
    expect(view.getByText('CORE_SOUL_MD')).toBeTruthy();
  });

  it('opens a file', async () => {
    const view = await render(<SystemScreen />);
    await fireEvent.press(view.getByText('RECORD'));
    expect(useFacilityStore.getState().view).toBe('mem');
  });

  it('shows only the last four digits of the key', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByText('•••• 1234')).toBeTruthy();
    expect(view.queryByText(RAW_KEY)).toBeNull();
  });

  // The model is not chosen by the subject yet, so the route line reports
  // which one their key actually reaches rather than offering a choice.
  it('names the route the key is on, and the model it reaches', async () => {
    const view = await render(<SystemScreen />);
    const route = view.getByTestId('key-route').props.children as string;
    expect(route).toContain('ANTHROPIC');
    expect(route).toContain(providerFor(RAW_KEY)?.model);
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
  // Finding 6, final review: runSpeech has always computed authFailed and
  // nothing consumed it. Repeated refusals are the subject's cue to change the
  // credential, and this row is where that happens — she is never sent dormant
  // for it and the key is never cleared (spec §10).
  it('leaves the credential alone on a single refusal', async () => {
    useFacilityStore.setState({ authFails: 1 });
    const view = await render(<SystemScreen />);
    // 4a sets the mask as the row's dim sub-line; amber belongs to CHANGE.
    // What matters here is that one refusal leaves it unmarked.
    const style = StyleSheet.flatten(view.getByTestId('key-mask').props.style);
    expect(style.color).toBe(palette.textFaint);
    expect(style.color).not.toBe(palette.danger);
  });

  it('marks the credential once refusals repeat', async () => {
    useFacilityStore.setState({ authFails: 2 });
    const view = await render(<SystemScreen />);
    const style = StyleSheet.flatten(view.getByTestId('key-mask').props.style);
    expect(style.color).toBe(palette.danger);
    expect(useFacilityStore.getState().apiKey).toBe(RAW_KEY); // still hers to change
  });

  it('never renders the raw key anywhere in the tree', async () => {
    const view = await render(<SystemScreen />);
    const serialized = JSON.stringify(view.toJSON());
    expect(serialized).not.toContain(RAW_KEY);
  });
});

describe('preferences row', () => {
  // The shell owns the tile, the bleed, the exit and her dot — and names no
  // module. A preferences row belonging to a room is contributed by that room,
  // so this asserts the shell renders whatever the registry offers rather than
  // asserting on any particular room's row.
  it('renders whatever preferences rows the registry offers', async () => {
    const seen = jest.fn();
    const target = registry.filter(isModule)[0];
    const previous = target.Settings;
    target.Settings = () => {
      seen();
      return null;
    };
    try {
      const view = await render(<SystemScreen />);
      expect(seen).toHaveBeenCalled();
      await view.unmount();
    } finally {
      target.Settings = previous;
    }
  });

  it('still shows the language row after the row extraction', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByTestId('pref-language')).toBeTruthy();
    await view.unmount();
  });

  // Hers is the one preferences row that is NOT a room's and is named here
  // directly. Nothing else in the suite would notice it going: its own test
  // file renders the component alone.
  it('carries her transmissions row, above whatever the rooms offer', async () => {
    const view = await render(<SystemScreen />);
    expect(view.getByTestId('pref-transmissions')).toBeTruthy();
    await view.unmount();
  });
});

// The rotation sat stuck for weeks with nothing on any screen to say so: the
// swap swallowed its own failures, and `getIcon` — which exists to answer
// exactly this — was never called. This row is the answer, read at render.

describe('the register row', () => {
  // Named after the constant it actually is, like CORE_SOUL_MD above it, so
  // the two read as one document in two halves.
  it('names the register she is currently in, and opens its document', async () => {
    useFacilityStore.setState({ mode: 'supportive', lang: 'en' });
    const view = await render(<SystemScreen />);

    expect(view.getByText('CORE_SOUL_MD')).toBeTruthy();
    expect(view.getByText('SUPPORTIVE_SOUL_MD')).toBeTruthy();
    await fireEvent.press(view.getByTestId('tile-mode'));
    expect(useFacilityStore.getState().view).toBe('mode');

    await view.unmount();
  });

  it('follows the register she is in', async () => {
    useFacilityStore.setState({ mode: 'default', lang: 'en' });
    const view = await render(<SystemScreen />);

    expect(view.getByText('DEFAULT_SOUL_MD')).toBeTruthy();
    expect(view.queryByText('SUPPORTIVE_SOUL_MD')).toBeNull();

    await view.unmount();
  });

  // An identifier is not copy, so it does not translate.
  it('keeps the identifier out of the translation', async () => {
    useFacilityStore.setState({ mode: 'supportive', lang: 'ko' });
    const view = await render(<SystemScreen />);

    expect(view.getByText('SUPPORTIVE_SOUL_MD')).toBeTruthy();

    await view.unmount();
  });
});
