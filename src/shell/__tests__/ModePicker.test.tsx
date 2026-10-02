import React from 'react';
import { Text as RNText } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { DARK } from '../../core/theme';
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
  it('is her name and nothing under it', async () => {
    const view = await render(<ModePicker />);

    expect(view.getByText('V.E.R.A.')).toBeTruthy();
    expect(view.queryByText('Very Emotional Robot Assistant')).toBeNull();

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
    expect(flat(view.getByTestId('mode-tag').props.style).color).toBe(DARK.mode.default.ink);
    await view.unmount();

    useFacilityStore.setState({ mode: 'supportive' });
    const supportive = await render(<ModePicker />);
    expect(flat(supportive.getByTestId('mode-tag').props.style).color)
      .toBe(DARK.mode.supportive.ink);
    await supportive.unmount();
  });

  // A pill of its own, filled and edged in the register's colour, so it reads
  // as a badge she is wearing rather than a second word of her name.
  it('sits the tag in a pill wearing that colour', async () => {
    useFacilityStore.setState({ mode: 'supportive' });
    const view = await render(<ModePicker />);

    const pill = flat(view.getByTestId('mode-tag-pill').props.style);
    expect(pill.backgroundColor).toBe(DARK.mode.supportive.wash);
    expect(pill.borderColor).toBe(DARK.mode.supportive.edge);
    expect(pill.borderRadius).toBeGreaterThan(0);

    await view.unmount();
  });

  // Her pulse dot goes in the title row, level with the wordmark and the tag —
  // NOT beside the logo as a whole, where it would sit halfway down two lines
  // of text and be level with neither. Structural rather than visual, because
  // where a thing sits in the tree is the most a jsdom test can see.
  it('puts the leading slot in the title row, level with the wordmark', async () => {
    const view = await render(
      <ModePicker leading={<RNText testID="leading-probe">•</RNText>} />,
    );

    const row = within(view.getByTestId('mode-title-row'));
    expect(row.getByTestId('leading-probe')).toBeTruthy();
    expect(row.getByText('V.E.R.A.')).toBeTruthy();
    expect(row.getByTestId('mode-tag-pill')).toBeTruthy();

    await view.unmount();
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

  it('still carries her name', async () => {
    const view = await render(<ModePicker />);

    expect(view.getByText('V.E.R.A.')).toBeTruthy();

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
      .toBe(DARK.mode.supportive.ink);

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

  // The bubble hangs out of the header and over the row below it, which holds
  // the conversation pill. Later siblings paint on top in React Native, so
  // without both of these the bubble opens BEHIND the pill — and nothing but a
  // device can see that happen.
  it('paints over what is under the header', async () => {
    useFacilityStore.setState({ modePickerOpen: true });
    const view = await render(<ModePicker />);

    const bubble = flat(view.getByTestId('mode-bubble').props.style);
    expect(bubble.zIndex).toBeGreaterThan(0);
    expect(bubble.elevation).toBeGreaterThan(0);

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
