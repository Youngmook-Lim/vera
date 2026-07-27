import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { fieldStrings } from '../strings';
import { field } from '../index';

const Screen = field.Screen;
const t = fieldStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'field', lang: 'en' });
});

afterEach(() => {
  jest.useRealTimers();
});

test('renders idle: directive, start distance, idle V.E.R.A. line', async () => {
  const { getByText, getByTestId } = await render(<Screen />);
  expect(getByText(t.task)).toBeTruthy();
  expect(getByTestId('distance').props.children).toBe(340);
  expect(getByText(t.vera)).toBeTruthy();
});

test('holding walks the distance down; releasing pauses it', async () => {
  jest.useFakeTimers();
  const { getByLabelText, getByTestId } = await render(<Screen />);
  const btn = getByLabelText('walk');
  expect(getByTestId('distance').props.children).toBe(340);
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 3);
  });
  expect(getByTestId('distance').props.children).toBeLessThan(340); // distance decreased
  await fireEvent(btn, 'pressOut');
});

test('walking to zero arrives: TARGET REACHED and the exit-labelled button', async () => {
  jest.useFakeTimers();
  const { getByLabelText, findByText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 80); // plenty to reach 0
  });
  expect(await findByText(t.arrivedBig)).toBeTruthy();
  expect(await findByText(t.walkDone)).toBeTruthy();
  expect(await findByText(t.veraArrived)).toBeTruthy();
});

test('arrival guard: the finishing press-out does NOT exit; a fresh press does', async () => {
  jest.useFakeTimers();
  const { getByLabelText } = await render(<Screen />);
  const btn = getByLabelText('walk');
  await fireEvent(btn, 'pressIn');
  await act(async () => {
    jest.advanceTimersByTime(220 * 80);
  });
  await fireEvent(btn, 'pressOut'); // this release finished the walk — must NOT exit
  expect(useFacilityStore.getState().step).toBe('field');
  await fireEvent(btn, 'pressIn'); // fresh press after arrival
  await fireEvent(btn, 'pressOut');
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('back arrow returns to facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
