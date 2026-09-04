import React from 'react';
import * as Notifications from 'expo-notifications';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { advice } from '../index';
import { useAdviceStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;
const Settings = advice.Settings as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
  notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useFacilityStore.setState({ lang: 'en' });
  useAdviceStore.setState({ hydrated: true, favorites: new Set(), daily: false, syncedOn: null });
});

describe('the daily advice row', () => {
  it('reads OFF until it is switched on', async () => {
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-daily').props.children).toBe('OFF');
    await view.unmount();
  });

  it('reads ON once it is', async () => {
    useAdviceStore.setState({ daily: true });
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-daily').props.children).toBe('ON');
    await view.unmount();
  });

  it('switches on when the permission is given', async () => {
    const view = await render(<Settings />);
    await fireEvent.press(view.getByTestId('pref-daily'));
    await waitFor(() => expect(useAdviceStore.getState().daily).toBe(true));
    await view.unmount();
  });

  // Read at render, the way the LAUNCHER row reads the launcher's real face:
  // the store would still say `daily` after the permission was revoked in the
  // OS settings, and only asking catches that nothing is arriving.
  it('reads BLOCKED when the permission was refused, whatever the store says', async () => {
    notifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    useAdviceStore.setState({ daily: true });
    const view = await render(<Settings />);
    await waitFor(() =>
      expect(view.getByTestId('pref-daily').props.children).toBe('BLOCKED · SETTINGS'),
    );
    await view.unmount();
  });

  it('says it in the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<Settings />);
    expect(view.getByText('매일의 조언')).toBeTruthy();
    await view.unmount();
  });
});
