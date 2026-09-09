import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Power from '../../../modules/power/src/PowerModule';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { BatteryRow } from '../BatteryRow';

const native = Power as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  native.isIgnoringBatteryOptimizations.mockReturnValue(true);
  native.requestIgnoreBatteryOptimizations.mockReturnValue(true);
  useFacilityStore.setState({ lang: 'en' });
});

const valueOf = (view: ReturnType<typeof render> extends Promise<infer T> ? T : never) =>
  view.getByTestId('pref-battery');

describe('the battery row', () => {
  it('says nothing is holding the cards when the exemption is held', async () => {
    const view = await render(<BatteryRow />);
    expect(valueOf(view).props.children).toBe('UNRESTRICTED');
    await view.unmount();
  });

  // The warning is the point of the row: this setting is invisible from
  // inside the app, and a card silently arriving five hours late is what it
  // costs.
  it('warns in the app’s error red when it is not', async () => {
    native.isIgnoringBatteryOptimizations.mockReturnValue(false);
    const view = await render(<BatteryRow />);

    const value = valueOf(view);
    expect(value.props.children).toBe('OPTIMISED · FIX');
    expect(value.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: palette.danger })]),
    );
    await view.unmount();
  });

  // `null` is "could not ask", not "not set". An old build with no native
  // module behind it must not accuse the subject in red.
  it('goes faint rather than red when it cannot read the setting', async () => {
    native.isIgnoringBatteryOptimizations.mockImplementation(() => {
      throw new Error('unlinked');
    });
    const view = await render(<BatteryRow />);

    const value = valueOf(view);
    expect(value.props.children).toBe('—');
    expect(value.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: palette.textFaint })]),
    );
    await view.unmount();
  });

  it('opens the system dialog when it is not held', async () => {
    native.isIgnoringBatteryOptimizations.mockReturnValue(false);
    const view = await render(<BatteryRow />);

    await fireEvent.press(valueOf(view));
    expect(native.requestIgnoreBatteryOptimizations).toHaveBeenCalled();
    await view.unmount();
  });

  // Nothing to fix, so nothing to press: the dialog would only tell the
  // subject what the row already says.
  it('offers no press when the exemption is already held', async () => {
    const view = await render(<BatteryRow />);

    await fireEvent.press(valueOf(view));
    expect(native.requestIgnoreBatteryOptimizations).not.toHaveBeenCalled();
    await view.unmount();
  });

  it('is translated', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<BatteryRow />);
    expect(view.getByText('배터리')).toBeTruthy();
    await view.unmount();
  });
});
