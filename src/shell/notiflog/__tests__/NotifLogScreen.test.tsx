import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { notifStrings } from '../../../core/notifications';
import { notiflogStrings } from '../strings';
import { NotifLogScreen } from '../NotifLogScreen';

const m = notifStrings.en;
const c = notiflogStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'notiflog', lang: 'en' });
});

test('renders all five transmission cards, titles, remain badge, and footer', async () => {
  const { getByText } = await render(<NotifLogScreen />);
  expect(getByText(c.notifLogTitle)).toBeTruthy();
  expect(getByText(m.n1Body)).toBeTruthy();
  expect(getByText(m.n2Body)).toBeTruthy();
  expect(getByText(m.n3Body)).toBeTruthy();
  expect(getByText(m.n4Body)).toBeTruthy();
  expect(getByText(m.n5Body)).toBeTruthy();
  expect(getByText(m.n1Title)).toBeTruthy();
  expect(getByText(m.n5Title)).toBeTruthy();
  expect(getByText(c.nRemain)).toBeTruthy();
  expect(getByText(c.nFooter)).toBeTruthy();
});

test('a COMPLY NOW action opens the daily loop', async () => {
  const { getAllByText } = await render(<NotifLogScreen />);
  await fireEvent.press(getAllByText(c.nComply)[0]);
  expect(useFacilityStore.getState().step).toBe('daily');
});

test('back arrow returns to settings', async () => {
  const { getByLabelText } = await render(<NotifLogScreen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('settings');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'notiflog', lang: 'ko' });
  const { getByText } = await render(<NotifLogScreen />);
  expect(getByText(notiflogStrings.ko.notifLogTitle)).toBeTruthy();
  expect(getByText(notifStrings.ko.n1Body)).toBeTruthy();
});
