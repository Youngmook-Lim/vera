import React from 'react';
import * as Notifications from 'expo-notifications';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { affirmations } from '../index';
import { useAffirmationsStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;
const Settings = affirmations.Settings as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
  notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  useFacilityStore.setState({ lang: 'en' });
  useAffirmationsStore.setState({ hydrated: true, favorites: new Set(), daily: false, syncedOn: null });
});

describe('the daily affirmation row', () => {
  it('reads OFF until it is switched on', async () => {
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-affirmations').props.children).toBe('OFF');
    await view.unmount();
  });

  it('switches on when the permission is given', async () => {
    const view = await render(<Settings />);
    await fireEvent.press(view.getByTestId('pref-affirmations'));
    await waitFor(() => expect(useAffirmationsStore.getState().daily).toBe(true));
    await view.unmount();
  });

  it('reads BLOCKED when the permission was refused, whatever the store says', async () => {
    notifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    useAffirmationsStore.setState({ daily: true });
    const view = await render(<Settings />);
    await waitFor(() =>
      expect(view.getByTestId('pref-affirmations').props.children).toBe('BLOCKED · SETTINGS'),
    );
    await view.unmount();
  });
});
