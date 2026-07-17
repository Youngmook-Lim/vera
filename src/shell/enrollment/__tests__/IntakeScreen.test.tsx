import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { IntakeScreen } from '../IntakeScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'intake', lang: 'en' });
});

test('renders V.E.R.A. power-on and routes to baseline', async () => {
  const { getByText } = await render(<IntakeScreen />);
  expect(getByText('V.E.R.A.')).toBeTruthy();
  expect(getByText(/Enrollment is not optional/)).toBeTruthy();
  expect(getByText('NO OTHER OPTIONS ARE AVAILABLE')).toBeTruthy();
  await fireEvent.press(getByText('BEGIN INTAKE ▸'));
  expect(useFacilityStore.getState().step).toBe('baseline');
});
