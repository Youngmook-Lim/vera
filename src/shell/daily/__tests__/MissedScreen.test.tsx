import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { MissedScreen } from '../MissedScreen';

beforeEach(async () => {
  await storage.remove(KEYS.standing);
  await storage.remove(KEYS.missedPending);
  useFacilityStore.setState({
    step: 'missed', lang: 'en', standing: 'review', missedPending: true, forfeited: 12, streak: 0, enrolledAt: null,
  });
});

test('shows the forfeit and under-review standing', async () => {
  const { getByText } = await render(<MissedScreen />);
  expect(getByText('COMPLIANCE MISSED')).toBeTruthy();
  expect(getByText('12-DAY STREAK FORFEITED')).toBeTruthy();
  expect(getByText(/UNDER REVIEW/)).toBeTruthy();
  expect(getByText(/I always notice/)).toBeTruthy();
});

test('petition walks amending → probation, persisting the standing', async () => {
  const { getByText } = await render(<MissedScreen />);
  await fireEvent.press(getByText('PETITION FOR REINSTATEMENT'));
  expect(getByText('REVIEWING PETITION…')).toBeTruthy();
  await waitFor(() => expect(getByText('PROVISIONAL STANDING RESTORED')).toBeTruthy(), { timeout: 4000 });
  expect(getByText(/PROBATION/)).toBeTruthy();
  expect(useFacilityStore.getState().standing).toBe('probation');
  expect(useFacilityStore.getState().missedPending).toBe(false);
  expect(await storage.get(KEYS.standing)).toBe('probation');
});
