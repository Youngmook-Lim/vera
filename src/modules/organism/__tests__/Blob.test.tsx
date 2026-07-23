import { render } from '@testing-library/react-native';
import React from 'react';
import { Blob } from '../Blob';

test('renders while hungry without throwing (skia mocked)', async () => {
  const r = await render(<Blob hunger={82} tapNonce={0} />);
  expect(r).toBeTruthy();
});

test('renders while fed without throwing', async () => {
  const r = await render(<Blob hunger={10} tapNonce={0} />);
  expect(r).toBeTruthy();
});

test('unmounts without throwing (animation cleanup)', async () => {
  const { unmount } = await render(<Blob hunger={82} tapNonce={3} />);
  await unmount();
  expect(true).toBe(true);
});
