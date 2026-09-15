import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { MODES } from '../../vera/modes/registry';
import { ModePicker } from '../ModePicker';

// setMode speaks, and her line comes out of the authored bank — but the guard
// belongs here anyway: nothing in this file is allowed to leave the process.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({
    mode: 'default', modePickerOpen: false, lang: 'en',
    apiKey: 'sk-ant-api03-abcdefghijklmnop',
  });
});

describe('the logo', () => {
  it('spells her name out underneath the wordmark', async () => {
    const view = await render(<ModePicker />);

    expect(view.getByText('V.E.R.A.')).toBeTruthy();
    expect(view.getByText('Very Emotional Robot Assistant')).toBeTruthy();

    await view.unmount();
  });

  // The acronym is English, so its expansion is too. Expanding it in Korean
  // would be expanding a different acronym.
  it('keeps the expansion in English whatever the interface is set to', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<ModePicker />);

    expect(view.getByText('Very Emotional Robot Assistant')).toBeTruthy();

    await view.unmount();
  });

  it('names the register she is in, beside the wordmark', async () => {
    const view = await render(<ModePicker />);
    expect(view.getByText(MODES.default.tag.en)).toBeTruthy();
    await view.unmount();

    useFacilityStore.setState({ mode: 'supportive' });
    const supportive = await render(<ModePicker />);
    expect(supportive.getByText(MODES.supportive.tag.en)).toBeTruthy();
    await supportive.unmount();
  });

  it('follows the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<ModePicker />);

    expect(view.getByText(MODES.default.tag.ko)).toBeTruthy();

    await view.unmount();
  });

  // Each register wears the iris of the state it is most often in: calm's
  // amber for the default, affectionate's rose for the supportive.
  it('paints the tag in that register’s own colour', async () => {
    const view = await render(<ModePicker />);
    expect(flat(view.getByTestId('mode-tag').props.style).color).toBe(palette.mode.default);
    await view.unmount();

    useFacilityStore.setState({ mode: 'supportive' });
    const supportive = await render(<ModePicker />);
    expect(flat(supportive.getByTestId('mode-tag').props.style).color)
      .toBe(palette.mode.supportive);
    await supportive.unmount();
  });

  // The flag is the store's, not this component's, so hardware back can close
  // the bubble without the stage knowing anything about it.
  it('opens the bubble when the logo is pressed', async () => {
    const view = await render(<ModePicker />);
    await fireEvent.press(view.getByTestId('mode-trigger'));

    expect(useFacilityStore.getState().modePickerOpen).toBe(true);

    await view.unmount();
  });
});

// The logo is the app's identity and is on screen before she has been woken.
// The register is not: she has none until there is a key, so the tag is absent
// and the logo is not a control.
describe('before she is awake', () => {
  beforeEach(() => useFacilityStore.setState({ apiKey: '' }));

  it('still spells out her name', async () => {
    const view = await render(<ModePicker />);

    expect(view.getByText('V.E.R.A.')).toBeTruthy();
    expect(view.getByText('Very Emotional Robot Assistant')).toBeTruthy();

    await view.unmount();
  });

  it('offers no register and no way to open one', async () => {
    const view = await render(<ModePicker />);

    expect(view.queryByTestId('mode-tag')).toBeNull();
    await fireEvent.press(view.getByTestId('mode-trigger'));
    expect(useFacilityStore.getState().modePickerOpen).toBe(false);

    await view.unmount();
  });
});

describe('the bubble', () => {
  it('offers every register, and marks the one she is in', async () => {
    useFacilityStore.setState({ modePickerOpen: true });
    const view = await render(<ModePicker />);

    expect(view.getByTestId('mode-choice-default').props.accessibilityState.selected).toBe(true);
    expect(view.getByTestId('mode-choice-supportive').props.accessibilityState.selected).toBe(false);

    await view.unmount();
  });

  it('paints each choice in its own register’s colour', async () => {
    useFacilityStore.setState({ modePickerOpen: true });
    const view = await render(<ModePicker />);

    expect(flat(view.getByTestId('mode-choice-supportive').props.style).borderLeftColor)
      .toBe(palette.mode.supportive);

    await view.unmount();
  });

  it('is not rendered at all while it is closed', async () => {
    const view = await render(<ModePicker />);

    expect(view.queryByTestId('mode-choice-supportive')).toBeNull();

    await view.unmount();
  });

  it('sets the register that was chosen', async () => {
    useFacilityStore.setState({ modePickerOpen: true });
    const view = await render(<ModePicker />);
    await fireEvent.press(view.getByTestId('mode-choice-supportive'));

    expect(useFacilityStore.getState().mode).toBe('supportive');

    await view.unmount();
  });

  it('closes on a tap outside it, without changing anything', async () => {
    useFacilityStore.setState({ modePickerOpen: true });
    const view = await render(<ModePicker />);
    await fireEvent.press(view.getByTestId('mode-backdrop'));

    expect(useFacilityStore.getState().modePickerOpen).toBe(false);
    expect(useFacilityStore.getState().mode).toBe('default');

    await view.unmount();
  });
});
