import { render } from '@testing-library/react-native';
import React from 'react';
import { Compass } from '../Compass';

test('renders idle', async () => {
  const r = await render(<Compass dist={340} walking={false} arrived={false} />);
  expect(r).toBeTruthy();
});

test('renders walking', async () => {
  const r = await render(<Compass dist={200} walking={true} arrived={false} />);
  expect(r).toBeTruthy();
});

test('renders arrived and unmounts cleanly', async () => {
  const { unmount } = await render(<Compass dist={0} walking={false} arrived={true} />);
  await unmount();
  expect(true).toBe(true);
});
