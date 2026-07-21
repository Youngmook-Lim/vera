import { render } from '@testing-library/react-native';
import React from 'react';
import { Chamber } from '../Chamber';

test('renders the chamber label at idle', async () => {
  const { getByText } = await render(<Chamber burning={false} label="CHAMBER · 1,400°C" lang="en" />);
  expect(getByText('CHAMBER · 1,400°C')).toBeTruthy();
});

test('renders while burning', async () => {
  const { getByText } = await render(<Chamber burning={true} label="CHAMBER · 1,400°C" lang="en" />);
  expect(getByText('CHAMBER · 1,400°C')).toBeTruthy();
});

test('unmounts without throwing (animation cleanup)', async () => {
  const { unmount } = await render(<Chamber burning={true} label="CHAMBER · 1,400°C" lang="en" />);
  await unmount();
  expect(true).toBe(true);
});
