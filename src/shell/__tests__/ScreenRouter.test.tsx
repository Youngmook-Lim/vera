import { render } from '@testing-library/react-native';
import React from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

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
