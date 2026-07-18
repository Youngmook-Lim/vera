import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { dayKey, rollAudit } from '../../../core/compliance';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { DailyScreen } from '../DailyScreen';

jest.mock('../../../core/compliance', () => ({
  ...jest.requireActual('../../../core/compliance'),
  rollAudit: jest.fn(() => false),
}));

// The ring's completion is animation glue; drive the screen through a stub.
jest.mock('../ComplyRing', () => {
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
  await storage.remove(KEYS.streak);
  await storage.remove(KEYS.lastComply);
  (rollAudit as jest.Mock).mockReturnValue(false);
  useFacilityStore.setState({ step: 'daily', lang: 'en', streak: 0, lastComply: null, standing: 'good' });
});

test('directive phase shows the directive and idle V.E.R.A. line', async () => {
  const { getByText } = await render(<DailyScreen />);
  expect(getByText('Confirm you have not been replaced.')).toBeTruthy();
  expect(getByText(/hold to confirm you mean it/)).toBeTruthy();
});

test('completed hold without audit logs compliance and shows the verdict', async () => {
  const { getByText, getByLabelText } = await render(<DailyScreen />);
  await fireEvent.press(getByLabelText('ring-stub'));
  await waitFor(() => expect(getByText('COMPLIANT')).toBeTruthy());
  expect(getByText('DAY 1 · 1-DAY STREAK')).toBeTruthy();
  expect(useFacilityStore.getState().streak).toBe(1);
  expect(await storage.get(KEYS.lastComply)).toBe(dayKey(new Date()));
});

test('audited hold deliberates, then is provisionally compliant', async () => {
  (rollAudit as jest.Mock).mockReturnValue(true);
  const { getByText, getByLabelText } = await render(<DailyScreen />);
  await fireEvent.press(getByLabelText('ring-stub'));
  expect(getByText('AUDITING THIS SUBMISSION…')).toBeTruthy();
  await waitFor(() => expect(getByText('PROVISIONALLY COMPLIANT')).toBeTruthy(), { timeout: 4000 });
  expect(useFacilityStore.getState().streak).toBe(1);
});

test('already complied today opens straight in the done phase', async () => {
  useFacilityStore.setState({ streak: 4, lastComply: dayKey(new Date()) });
  const { getByText } = await render(<DailyScreen />);
  expect(getByText('COMPLIANT')).toBeTruthy();
  expect(getByText('DAY 4 · 4-DAY STREAK')).toBeTruthy();
});
