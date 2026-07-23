import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { organismStrings } from '../strings';
import { organism } from '../index';

const Screen = organism.Screen;
const t = organismStrings.en;

beforeEach(async () => {
  await storage.remove(KEYS.organismHunger);
  await storage.remove(KEYS.organismLastFed);
  useFacilityStore.setState({ step: 'organism', lang: 'en' });
});

test('first visit shows hungry status, mood, and hungry V.E.R.A. line', async () => {
  const { findByText, getByText } = await render(<Screen />);
  expect(await findByText(t.statusHungry)).toBeTruthy();
  expect(getByText(t.moodHungry)).toBeTruthy();
  expect(getByText(t.veraHungry)).toBeTruthy();
});

test('tapping the blob feeds it: hunger drops and both keys persist', async () => {
  const { findByLabelText } = await render(<Screen />);
  const target = await findByLabelText('feed'); // the tappable blob
  // 82 -> below 50 needs several taps (10 each).
  for (let i = 0; i < 4; i++) await fireEvent.press(target);
  expect(await storage.get(KEYS.organismHunger)).toBe('42'); // 82 - 40
  expect(await storage.get(KEYS.organismLastFed)).not.toBeNull();
});

test('crossing the threshold flips status/mood/V.E.R.A. to fed', async () => {
  const { findByLabelText, findByText } = await render(<Screen />);
  const target = await findByLabelText('feed');
  for (let i = 0; i < 4; i++) await fireEvent.press(target); // 82 -> 42 (< 50)
  expect(await findByText(t.statusFed)).toBeTruthy();
  expect(await findByText(t.moodFed)).toBeTruthy();
  expect(await findByText(t.veraFed)).toBeTruthy();
});

test('drift-on-open computes hunger from stored state', async () => {
  await storage.set(KEYS.organismHunger, '20');
  await storage.set(KEYS.organismLastFed, new Date(Date.now() - 10 * 3_600_000).toISOString());
  const { findByText } = await render(<Screen />);
  // 20 + 10h*2.5 = 45 -> below threshold, so it reads FED, not the START_HUNGER default.
  expect(await findByText(t.statusFed)).toBeTruthy();
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
