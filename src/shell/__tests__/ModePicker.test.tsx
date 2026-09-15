import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { MODES } from '../../vera/modes/registry';
import { ModePicker } from '../ModePicker';

// setMode speaks, and her line comes out of the authored bank — but the guard
// belongs here anyway: nothing in this file is allowed to leave the process.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));

beforeEach(() => {
  useFacilityStore.setState({ mode: 'default', modePickerOpen: false, lang: 'en' });
});

describe('the register pill', () => {
  it('wears the name of the register she is in', async () => {
    const view = await render(<ModePicker />);

    expect(view.getByTestId('mode-pill')).toBeTruthy();
    expect(view.getByText(MODES.default.label.en)).toBeTruthy();

    await view.unmount();
  });

  it('follows the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<ModePicker />);

    expect(view.getByText(MODES.default.label.ko)).toBeTruthy();

    await view.unmount();
  });

  // The flag is the store's, not this component's, so hardware back can close
  // the bubble without the stage knowing anything about it.
  it('opens the bubble when pressed', async () => {
    const view = await render(<ModePicker />);
    await fireEvent.press(view.getByTestId('mode-pill'));

    expect(useFacilityStore.getState().modePickerOpen).toBe(true);

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
