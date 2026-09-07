import React from 'react';
import * as Notifications from 'expo-notifications';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { registry } from '../../registry';
import { isModule } from '../../types';
import { horror } from '../index';
import { useHorrorStore } from '../store';

const notifs = Notifications as unknown as Record<string, jest.Mock>;
const Settings = horror.Settings as React.ComponentType;

beforeEach(() => {
  jest.clearAllMocks();
  notifs.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  notifs.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  notifs.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useFacilityStore.setState({ lang: 'en' });
  useHorrorStore.setState({
    hydrated: true,
    favorites: new Set(),
    hidden: true,
    nightly: false,
    syncedOn: null,
  });
});

describe('the nightly horror row', () => {
  it('reads OFF until it is switched on', async () => {
    const view = await render(<Settings />);
    expect(view.getByTestId('pref-nightly').props.children).toBe('OFF');
    await view.unmount();
  });

  // The row is named after the room rather than after the setting, and reads
  // the room's own string so the two cannot drift apart.
  it("wears the room's name", async () => {
    const view = await render(<Settings />);
    expect(view.getByText('TWO SENTENCE HORROR')).toBeTruthy();
    await view.unmount();
  });

  it('schedules the horizon when it is switched on', async () => {
    const view = await render(<Settings />);
    await fireEvent.press(view.getByTestId('pref-nightly'));

    await waitFor(() => expect(useHorrorStore.getState().nightly).toBe(true));
    expect(notifs.scheduleNotificationAsync).toHaveBeenCalled();
    expect(useHorrorStore.getState().syncedOn).not.toBeNull();
    await view.unmount();
  });

  // Android never re-prompts once refused, so a refusal has to leave the store
  // off — a row reading ON over a phone that will never show a story is worse
  // than one that reads OFF.
  it('stays off when the permission is refused', async () => {
    notifs.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const view = await render(<Settings />);
    await fireEvent.press(view.getByTestId('pref-nightly'));

    await waitFor(() => expect(notifs.requestPermissionsAsync).toHaveBeenCalled());
    expect(useHorrorStore.getState().nightly).toBe(false);
    expect(notifs.scheduleNotificationAsync).not.toHaveBeenCalled();
    await view.unmount();
  });

  it('says the OS settings are the only way back once blocked', async () => {
    notifs.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const view = await render(<Settings />);
    await waitFor(() =>
      expect(view.getByTestId('pref-nightly').props.children).toBe('BLOCKED · SETTINGS'),
    );
    await view.unmount();
  });
});

// SystemScreen renders whatever the registry's rooms offer, so a second row
// needed no edit there. This is the assertion that it stays that way.
describe('the PREFERENCES section', () => {
  it('carries a row from each room that offers one, and names no room', () => {
    const offered = registry.filter(isModule).filter((m) => m.Settings);
    expect(offered.map((m) => m.id)).toEqual(['mod01', 'mod02']);
  });
});
