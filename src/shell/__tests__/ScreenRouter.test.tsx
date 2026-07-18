import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
jest.mock('@react-native-community/slider', () => 'Slider');

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
  jest.restoreAllMocks();
});

test('hardware back returns to facility from a module, exits only from home', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  useFacilityStore.setState({ step: 'field' });
  await render(<ScreenRouter />);
  const handler = spy.mock.calls[0][1] as () => boolean;

  // On a module screen: back is consumed and routes home.
  expect(handler()).toBe(true);
  expect(useFacilityStore.getState().step).toBe('facility');

  // On the home screen: back is not consumed (default = leave the app).
  expect(handler()).toBe(false);
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('facility step renders the launcher home', async () => {
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText(/SUBJECT #50640/)).toBeTruthy();
});

test('module steps render their (placeholder) screens', async () => {
  useFacilityStore.setState({ step: 'field' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('FIELD TRIAL')).toBeTruthy();
  expect(getByText('UNDER CONSTRUCTION')).toBeTruthy();
});

test('not-yet-built shell steps fall back to a placeholder', async () => {
  useFacilityStore.setState({ step: 'settings' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('SETTINGS')).toBeTruthy();
});

test('enrollment steps render their screens', async () => {
  useFacilityStore.setState({ step: 'intake' });
  const intake = await render(<ScreenRouter />);
  expect(intake.getByText('BEGIN INTAKE ▸')).toBeTruthy();

  useFacilityStore.setState({ step: 'consent' });
  const consent = await render(<ScreenRouter />);
  expect(consent.getByText('Enrichment Agreement')).toBeTruthy();
});

test('hardware back is consumed during enrollment (no navigation)', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  useFacilityStore.setState({ step: 'consent' });
  await render(<ScreenRouter />);
  const handler = spy.mock.calls[0][1] as () => boolean;
  expect(handler()).toBe(true); // consumed
  expect(useFacilityStore.getState().step).toBe('consent'); // did not move
});

test('first run walks intake through to the facility and persists the gate', async () => {
  await storage.remove(KEYS.enrolled);
  useFacilityStore.setState({ step: 'intake', lang: 'en', permDenied: false, decline: 0, poked: false });
  const r = await render(<ScreenRouter />);
  await fireEvent.press(r.getByText('BEGIN INTAKE ▸'));
  await fireEvent.press(r.getByText('SUBMIT BASELINE ▸'));
  await fireEvent.press(r.getByText('I ACCEPT'));
  await fireEvent.press(r.getByText('ENTER THE FACILITY ▸'));
  await fireEvent.press(r.getByText('Allow'));
  await waitFor(() => expect(useFacilityStore.getState().step).toBe('facility'));
  expect(r.getByText(/SUBJECT #50640/)).toBeTruthy();
  expect(await storage.get(KEYS.enrolled)).toBe('1');
});
