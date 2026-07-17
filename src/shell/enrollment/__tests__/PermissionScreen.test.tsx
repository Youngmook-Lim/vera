import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { PermissionScreen } from '../PermissionScreen';

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
const { requestPermissionsAsync } = jest.requireMock('expo-notifications');

beforeEach(async () => {
  await storage.remove(KEYS.enrolled);
  useFacilityStore.setState({ step: 'permission', lang: 'en', permDenied: false, notif: true });
  requestPermissionsAsync.mockClear();
});

test('allow requests the real permission and finishes enrollment', async () => {
  const { getByText } = await render(<PermissionScreen />);
  expect(getByText(/Kindly permit it/)).toBeTruthy();
  await fireEvent.press(getByText('Allow'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(requestPermissionsAsync).toHaveBeenCalled();
  expect(await storage.get(KEYS.enrolled)).toBe('1');
});

test('deny gets the passive-aggressive line and an enter-anyway button', async () => {
  const { getByText, queryByText } = await render(<PermissionScreen />);
  await fireEvent.press(getByText("Don't allow"));
  expect(useFacilityStore.getState().permDenied).toBe(true);
  expect(getByText(/That prompt was a courtesy/)).toBeTruthy();
  expect(queryByText('Allow')).toBeNull();
  await fireEvent.press(getByText('ENTER THE FACILITY ▸'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(requestPermissionsAsync).not.toHaveBeenCalled();
});
