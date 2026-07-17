import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import { isLocked, registry } from '../registry';
import type { ModuleDef } from '../types';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

const active = registry.filter((e): e is ModuleDef => !isLocked(e));

test('registry lists the five evaluations in home-grid order plus two locked slots', () => {
  expect(active.map((m) => m.id)).toEqual(['field', 'organism', 'hazard', 'results', 'incinerator']);
  expect(registry.filter(isLocked)).toHaveLength(2);
});

test('only the incinerator tile is wide', () => {
  expect(active.filter((m) => m.layout === 'wide').map((m) => m.id)).toEqual(['incinerator']);
});

test('tiles localize', () => {
  const field = active.find((m) => m.id === 'field')!;
  expect(field.tile('en')).toEqual({ title: 'FIELD TRIAL', sub: 'proceed as directed', tag: 'ACTIVE', tagScheme: 'amber' });
  expect(field.tile('ko').title).toBe('현장 시험');
});

test('placeholder back arrow returns to facility', async () => {
  useFacilityStore.setState({ step: 'field' });
  const { getByLabelText } = await render(<PlaceholderScreen title="FIELD TRIAL" />);
  await fireEvent.press(getByLabelText('back'));
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('pressing the header title also goes back', async () => {
  useFacilityStore.setState({ step: 'field' });
  const { getByText } = await render(<PlaceholderScreen title="FIELD TRIAL" />);
  await fireEvent.press(getByText('FIELD TRIAL'));
  expect(useFacilityStore.getState().step).toBe('facility');
});
