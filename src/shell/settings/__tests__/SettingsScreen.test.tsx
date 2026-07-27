import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { KEYS, storage } from '../../../core/storage';
import { settingsStrings } from '../strings';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../../core/notifications', () => ({
  syncScheduledTransmissions: jest.fn(async () => {}),
}));

const t = settingsStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'settings', lang: 'en', notif: true });
});

test('renders language buttons, all program rows, VERA line, and footer', async () => {
  const { getByText } = await render(<SettingsScreen />);
  expect(getByText(t.settingsTitle)).toBeTruthy();
  expect(getByText('English')).toBeTruthy();
  expect(getByText('한국어')).toBeTruthy();
  expect(getByText(t.reprocess)).toBeTruthy();
  expect(getByText(t.notif)).toBeTruthy();
  expect(getByText(t.notifLog)).toBeTruthy();
  expect(getByText(t.settingsVera)).toBeTruthy();
  expect(getByText(t.build)).toBeTruthy();
});

test('tapping 한국어 switches the language', async () => {
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText('한국어'));
  expect(useFacilityStore.getState().lang).toBe('ko');
});

test('re-process wipes storage and routes to intake', async () => {
  await storage.set(KEYS.enrolled, '1');
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText(t.reprocess));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('intake'));
  expect(await storage.get(KEYS.enrolled)).toBeNull();
});

test('toggling notifications persists the flag', async () => {
  const { getByLabelText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('notifications'));
  expect(useFacilityStore.getState().notif).toBe(false);
  await waitFor(async () => expect(await storage.get(KEYS.notif)).toBe('0'));
});

test('transmission-log row opens the notiflog step', async () => {
  const { getByText } = await render(<SettingsScreen />);
  await fireEvent.press(getByText(t.notifLog));
  expect(useFacilityStore.getState().step).toBe('notiflog');
});

test('back arrow returns to the facility', async () => {
  const { getByLabelText } = await render(<SettingsScreen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'settings', lang: 'ko' });
  const { getByText } = await render(<SettingsScreen />);
  expect(getByText(settingsStrings.ko.settingsTitle)).toBeTruthy();
});
