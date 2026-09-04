import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import AppIcon from '../../../modules/app-icon/src/AppIconModule';
import { faceFor } from '../../core/appIcon';
import { syncLauncherIcon } from '../../core/launcher';
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
    expect(view.getByText('SOUL.md')).toBeTruthy();
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
});

// The rotation sat stuck for weeks with nothing on any screen to say so: the
// swap swallowed its own failures, and `getIcon` — which exists to answer
// exactly this — was never called. This row is the answer, read at render.
describe('the launcher readout', () => {
  const icon = AppIcon as unknown as { getIcon: () => string; setIcon: (f: string) => boolean };
  const original = icon.getIcon;
  afterEach(() => { icon.getIcon = original; });

  const awake = () => useFacilityStore.setState({
    apiKey: 'sk-ant-api03-abcdefghijklmnop', lang: 'en', authFails: 0,
  });

  it('shows the one face when the launcher agrees with today', async () => {
    awake();
    icon.getIcon = () => faceFor(Date.now(), true);
    const view = await render(<SystemScreen />);
    expect(view.getByTestId('launcher-face').props.children).toBe(faceFor(Date.now(), true));
  });

  it('shows both faces when the home screen is wearing something else', async () => {
    awake();
    // Dormant is never today's face while she has a key, so this is always a
    // disagreement whatever day the suite runs on.
    icon.getIcon = () => 'Dormant';
    const view = await render(<SystemScreen />);
    expect(view.getByTestId('launcher-face').props.children)
      .toBe(`Dormant \u2192 ${faceFor(Date.now(), true)}`);
  });

  it('says so when the state cannot be read at all', async () => {
    awake();
    icon.getIcon = () => { throw new Error('no package manager'); };
    const view = await render(<SystemScreen />);
    expect(view.getByTestId('launcher-face').props.children).toBe('UNREADABLE');
  });

  // Silence is the good case, so the line only appears when the last swap had
  // something to report.
  it('keeps the complaint line out of the way until there is a complaint', async () => {
    awake();
    icon.getIcon = () => faceFor(Date.now(), true);
    const quiet = await render(<SystemScreen />);
    expect(quiet.queryByTestId('launcher-result')).toBeNull();
    await quiet.unmount();

    icon.getIcon = () => 'Bored';
    syncLauncherIcon(true, Date.now());
    const loud = await render(<SystemScreen />);
    expect(loud.getByTestId('launcher-result').props.children).toContain('launcher reports Bored');
  });
});
