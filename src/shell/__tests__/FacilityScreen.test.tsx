import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { FacilityScreen } from '../FacilityScreen';

beforeEach(() => {
  useFacilityStore.setState({
    step: 'facility',
    lang: 'en',
    standing: 'good',
    enrolledAt: null,
    missedPending: false,
  });
});

test('renders identity, transmission, tiles, and locked vitrines', async () => {
  const { getByText, getAllByText } = await render(<FacilityScreen />);
  expect(getByText(/SUBJECT #50640/)).toBeTruthy();
  expect(getByText('You made it. I never doubted you. That is a lie, but a supportive one.')).toBeTruthy();
  for (const title of ['FIELD TRIAL', 'SUPPORT ORGANISM', 'HAZARD ASSESSMENT', 'RESULTS PENDING', 'THE INCINERATOR']) {
    expect(getByText(title)).toBeTruthy();
  }
  expect(getAllByText('BUDGET PENDING')).toHaveLength(2);
});

test('tiles, comply card, and gear route via setStep', async () => {
  const first = await render(<FacilityScreen />);
  await fireEvent.press(first.getByText('FIELD TRIAL'));
  expect(useFacilityStore.getState().step).toBe('field');

  useFacilityStore.setState({ step: 'facility' });
  await fireEvent.press(first.getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('daily');

  useFacilityStore.setState({ step: 'facility' });
  await fireEvent.press(first.getByText('PREFERENCES'));
  expect(useFacilityStore.getState().step).toBe('settings');
});

test('renders Korean when lang is ko', async () => {
  useFacilityStore.setState({ lang: 'ko' });
  const { getByText } = await render(<FacilityScreen />);
  expect(getByText('현장 시험')).toBeTruthy();
  expect(getByText('역량 강화 센터')).toBeTruthy();
});

test('shows real tenure and standing', async () => {
  const past = new Date();
  past.setDate(past.getDate() - 12);
  useFacilityStore.setState({
    enrolledAt: `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`,
    standing: 'probation',
  });
  const { getByText, queryByText } = await render(<FacilityScreen />);
  expect(getByText(/DAY 13/)).toBeTruthy();
  expect(getByText(/PROBATION/)).toBeTruthy();
  expect(queryByText(/GOOD STANDING/)).toBeNull();
});

test('comply card routes to missed when a miss is pending', async () => {
  useFacilityStore.setState({ missedPending: true });
  const { getByText } = await render(<FacilityScreen />);
  await fireEvent.press(getByText('PRESS TO REMAIN COMPLIANT'));
  expect(useFacilityStore.getState().step).toBe('missed');
});
