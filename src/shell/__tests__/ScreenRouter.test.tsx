import { render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { ScreenRouter } from '../ScreenRouter';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
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
