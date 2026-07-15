import { render } from '@testing-library/react-native';
import React from 'react';
import { VeraPanel } from '../VeraPanel';

test('renders the transmission line, LIVE label, and REC stamp', async () => {
  const { getByText } = await render(<VeraPanel line="Testing is mandatory." lang="en" />);
  expect(getByText('Testing is mandatory.')).toBeTruthy();
  expect(getByText('LIVE TRANSMISSION')).toBeTruthy();
  expect(getByText('REC 00:00:09')).toBeTruthy();
});
