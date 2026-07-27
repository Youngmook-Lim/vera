import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { hazardStrings } from '../strings';
import { hazard } from '../index';

const Screen = hazard.Screen;
const t = hazardStrings.en;

beforeEach(() => {
  useFacilityStore.setState({ step: 'hazard', lang: 'en' });
});

test('renders header, status pills, and the you-note', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.title)).toBeTruthy();
  expect(getByText(t.unauthorized)).toBeTruthy();
  expect(getByText(t.sector)).toBeTruthy();
  expect(getByText(t.youNote)).toBeTruthy();
});

test('renders all four census entities with ids, descriptions, and tags', async () => {
  const { getByText } = await render(<Screen />);
  for (const e of t.entities) {
    expect(getByText(e.id)).toBeTruthy();
    expect(getByText(e.desc)).toBeTruthy();
    expect(getByText(e.tag)).toBeTruthy();
  }
});

test('renders the V.E.R.A. transmission line', async () => {
  const { getByText } = await render(<Screen />);
  expect(getByText(t.vera)).toBeTruthy();
});

test('back arrow returns to the facility', async () => {
  const { getByLabelText } = await render(<Screen />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('renders in Korean', async () => {
  useFacilityStore.setState({ step: 'hazard', lang: 'ko' });
  const { getByText } = await render(<Screen />);
  expect(getByText(hazardStrings.ko.title)).toBeTruthy();
  expect(getByText(hazardStrings.ko.entities[0].id)).toBeTruthy();
});
