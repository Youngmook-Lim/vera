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

// The ring's completion is animation glue; drive the screen through a stub.
jest.mock('../daily/ComplyRing', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    ComplyRing: ({ onComplete }: { onComplete: () => void }) =>
      React.createElement(
        Pressable,
        { onPress: onComplete, accessibilityLabel: 'ring-stub' },
        React.createElement(Text, null, 'RING'),
      ),
  };
});

beforeEach(async () => {
  useFacilityStore.setState({
    step: 'facility',
    lang: 'en',
    streak: 0,
    standing: 'good',
    lastComply: null,
    enrolledAt: null,
    missedPending: false,
    forfeited: 0,
  });
  await Promise.all([
    storage.remove(KEYS.streak),
    storage.remove(KEYS.standing),
    storage.remove(KEYS.lastComply),
    storage.remove(KEYS.enrolledAt),
    storage.remove(KEYS.missedPending),
    storage.remove(KEYS.forfeited),
  ]);
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

test('module steps render their real screens', async () => {
  useFacilityStore.setState({ step: 'hazard' });
  const { getByText } = await render(<ScreenRouter />);
  expect(getByText('HAZARD ASSESSMENT')).toBeTruthy();
  expect(getByText('4 UNAUTHORIZED')).toBeTruthy();
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

test('hardware back steps backward through enrollment, exiting only from intake', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  useFacilityStore.setState({ step: 'consent' });
  await render(<ScreenRouter />);
  const handler = spy.mock.calls[0][1] as () => boolean;

  // mid-enrollment: back goes to the previous step and is consumed
  expect(handler()).toBe(true);
  expect(useFacilityStore.getState().step).toBe('baseline');
  expect(handler()).toBe(true);
  expect(useFacilityStore.getState().step).toBe('intake');

  // from the first step: not consumed (OS closes the app), step unchanged
  expect(handler()).toBe(false);
  expect(useFacilityStore.getState().step).toBe('intake');
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

test('daily and missed steps render the real screens', async () => {
  useFacilityStore.setState({ step: 'daily', lastComply: null });
  const daily = await render(<ScreenRouter />);
  expect(daily.getByText('Confirm you have not been replaced.')).toBeTruthy();

  useFacilityStore.setState({ step: 'missed', standing: 'review', forfeited: 5 });
  const missed = await render(<ScreenRouter />);
  expect(missed.getByText('COMPLIANCE MISSED')).toBeTruthy();
});

test('miss detected at hydrate routes comply card to the consequence', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.enrolledAt, '2026-01-01');
  await storage.set(KEYS.streak, '7');
  await storage.set(KEYS.lastComply, '2026-01-05');
  await useFacilityStore.getState().hydrate();
  const r = await render(<ScreenRouter />);
  await fireEvent.press(r.getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('missed');
  expect(r.getByText('7-DAY STREAK FORFEITED')).toBeTruthy();
});
