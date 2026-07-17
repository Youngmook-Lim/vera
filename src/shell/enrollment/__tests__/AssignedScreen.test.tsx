import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useFacilityStore } from '../../../core/store';
import { AssignedScreen } from '../AssignedScreen';

beforeEach(() => {
  useFacilityStore.setState({ step: 'assigned', lang: 'en' });
});

test('renders the subject stamp and routes to permission', async () => {
  const { getByText } = await render(<AssignedScreen />);
  expect(getByText('#50640')).toBeTruthy();
  expect(getByText('GOOD STANDING')).toBeTruthy();
  expect(getByText('ENROLLMENT COMPLETE')).toBeTruthy();
  expect(getByText(/Welcome, Subject #50640/)).toBeTruthy();
  await fireEvent.press(getByText('ENTER THE FACILITY ▸'));
  expect(useFacilityStore.getState().step).toBe('permission');
});
