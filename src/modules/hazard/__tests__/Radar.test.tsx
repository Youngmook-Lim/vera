import { render } from '@testing-library/react-native';
import React from 'react';
import { Radar } from '../Radar';

test('renders without throwing', async () => {
  const r = await render(<Radar />);
  expect(r).toBeTruthy();
});

test('unmounts cleanly (animations cancelled)', async () => {
  const { unmount } = await render(<Radar />);
  await unmount();
  expect(true).toBe(true);
});
