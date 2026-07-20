import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { BaselineScreen } from '../BaselineScreen';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

beforeEach(() => {
  useFacilityStore.setState({ step: 'baseline', lang: 'en', name: '', adequacy: 64, motive: 1 });
});

test('renders the form with the detected device language in the hint', async () => {
  const { getByText, getByPlaceholderText } = await render(<BaselineScreen />);
  expect(getByText('Establishing your baseline.')).toBeTruthy();
  expect(getByPlaceholderText('Dana')).toBeTruthy(); // sample name is now an editable placeholder
  expect(getByText(/Detected from device: English\./)).toBeTruthy();
});

test('typing a designation updates the store', async () => {
  const { getByLabelText } = await render(<BaselineScreen />);
  await fireEvent.changeText(getByLabelText('designation'), 'Youngmook');
  expect(useFacilityStore.getState().name).toBe('Youngmook');
});

test('selecting a motive updates the store', async () => {
  const { getByText } = await render(<BaselineScreen />);
  await fireEvent.press(getByText('Unsure / frightened'));
  expect(useFacilityStore.getState().motive).toBe(2);
});

test('language toggle switches the whole screen live and persists', async () => {
  const first = await render(<BaselineScreen />);
  await fireEvent.press(first.getByText('한국어'));
  expect(useFacilityStore.getState().lang).toBe('ko');
  expect(first.getByText('귀하의 기준을 설정합니다.')).toBeTruthy();
});

test('submit routes to consent', async () => {
  const { getByText } = await render(<BaselineScreen />);
  await fireEvent.press(getByText('SUBMIT BASELINE ▸'));
  expect(useFacilityStore.getState().step).toBe('consent');
});
