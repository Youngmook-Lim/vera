import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { dayKey } from '../../../core/compliance';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { queueForDay } from '../queue';
import { resultsStrings } from '../strings';
import { results } from '../index';

const Screen = results.Screen;

beforeEach(async () => {
  await storage.remove(KEYS.lastSeenQueue);
  useFacilityStore.setState({ step: 'results', lang: 'en', enrolledAt: '2026-07-01' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders the position label and back arrow returns to facility', async () => {
  const { getByText, getByLabelText } = await render(<Screen />);
  expect(getByText(resultsStrings.en.rPosition)).toBeTruthy();
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('the 9th tick jumps the position up and V.E.R.A. switches to the worsened line', async () => {
  jest.useFakeTimers();
  const { getByText, queryByText } = await render(<Screen />);
  expect(getByText(resultsStrings.en.rVera)).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(9 * 1100);
  });
  expect(getByText(resultsStrings.en.rVeraUp)).toBeTruthy();
  expect(queryByText(resultsStrings.en.rVera)).toBeNull();
});

test('shows the real since-yesterday delta from the last visit', async () => {
  jest.useFakeTimers();
  const start = queueForDay('2026-07-01', dayKey(new Date()));
  await storage.set(KEYS.lastSeenQueue, String(start - 5000)); // worsened by 5,000 (delta +5,000, ▲)
  const { getByText } = await render(<Screen />);
  await act(async () => {}); // flush the storage read microtask
  expect(getByText(/5,000.*SINCE YESTERDAY/)).toBeTruthy();
  expect(await storage.get(KEYS.lastSeenQueue)).toBe(String(start));
});

test('clears the ticker on unmount', async () => {
  jest.useFakeTimers();
  const clearSpy = jest.spyOn(globalThis, 'clearInterval');
  const { unmount } = await render(<Screen />);
  await unmount();
  expect(clearSpy).toHaveBeenCalled();
  clearSpy.mockRestore();
});
