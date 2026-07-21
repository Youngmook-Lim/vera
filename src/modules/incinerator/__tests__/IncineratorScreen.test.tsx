import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { incineratorStrings } from '../strings';
import { incinerator } from '../index';

const Screen = incinerator.Screen;
const t = incineratorStrings.en;

beforeEach(async () => {
  await storage.remove(KEYS.burnedCount);
  useFacilityStore.setState({ step: 'incinerator', lang: 'en' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders compose state: grievance label, awaiting status, compose V.E.R.A. line', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.iGrievance)).toBeTruthy();
  expect(getByText(t.iAwaiting)).toBeTruthy();
  expect(getByText(t.iVeraCompose)).toBeTruthy();
});

test('empty grievance: pressing incinerate is a no-op', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText } = await render(<Screen />);
  await act(async () => {}); // flush storage read
  await fireEvent.press(getByLabelText('incinerate'));
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(getByText(t.iVeraCompose)).toBeTruthy(); // still composing
});

test('full burn: compose → burning → done, with counter increment and persistence', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText, findByText } = await render(<Screen />);
  await act(async () => {}); // flush storage read (starts at 0)
  await fireEvent.changeText(getByLabelText('grievance'), 'Craig read the email aloud');
  await fireEvent.press(getByLabelText('incinerate'));
  expect(getByText(t.iVeraBurn)).toBeTruthy(); // burning
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(await findByText(t.iVeraDone)).toBeTruthy(); // done
  expect(getByText(t.iAsh)).toBeTruthy();
  expect(await storage.get(KEYS.burnedCount)).toBe('1');
});

test('state another grievance returns to compose and clears the text', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByText } = await render(<Screen />);
  await act(async () => {});
  await fireEvent.changeText(getByLabelText('grievance'), 'x');
  await fireEvent.press(getByLabelText('incinerate'));
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  await fireEvent.press(getByLabelText('incinerate')); // "state another"
  expect(getByText(t.iAwaiting)).toBeTruthy();
  expect(getByLabelText('grievance').props.value).toBe('');
});

test('header shows the persisted burned count on mount', async () => {
  await storage.set(KEYS.burnedCount, '7');
  const { findByText } = await render(<Screen />);
  expect(await findByText('DISPOSAL · 7 BURNED')).toBeTruthy();
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
