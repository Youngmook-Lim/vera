import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { ConsentScreen } from '../ConsentScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'consent', lang: 'en', poked: false, decline: 0 });
});

test('renders the agreement with all four clauses', async () => {
  const { getByText } = await render(<ConsentScreen />);
  expect(getByText('Enrichment Agreement')).toBeTruthy();
  expect(getByText('CLAUSE 4.')).toBeTruthy();
  expect(getByText('42 CLAUSES · SCROLL DISABLED')).toBeTruthy();
});

test('poking the checkbox refuses to uncheck', async () => {
  const { getByText } = await render(<ConsentScreen />);
  expect(getByText('PRE-SELECTED · CANNOT BE UNCHECKED')).toBeTruthy();
  await fireEvent.press(getByText('I consent, freely and enthusiastically.'));
  expect(useFacilityStore.getState().poked).toBe(true);
  expect(getByText('IT WILL NOT UNCHECK. PLEASE STOP.')).toBeTruthy();
});

test('decline dodges and escalates its label, never leaving consent', async () => {
  const { getByText } = await render(<ConsentScreen />);
  await fireEvent(getByText('decline'), 'pressIn');
  expect(useFacilityStore.getState().decline).toBe(1);
  expect(getByText('are you sure?')).toBeTruthy();
  await fireEvent(getByText('are you sure?'), 'pressIn');
  await fireEvent(getByText('think again'), 'pressIn');
  await fireEvent(getByText('no'), 'pressIn');
  await fireEvent(getByText('stop'), 'pressIn');
  await fireEvent(getByText('stop'), 'pressIn'); // label caps at the last entry
  expect(getByText('stop')).toBeTruthy();
  expect(useFacilityStore.getState().step).toBe('consent');
});

test('accept routes to assigned', async () => {
  const { getByText } = await render(<ConsentScreen />);
  await fireEvent.press(getByText('I ACCEPT'));
  expect(useFacilityStore.getState().step).toBe('assigned');
});
