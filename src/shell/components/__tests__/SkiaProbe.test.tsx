import { render } from '@testing-library/react-native';
import React from 'react';
import { SkiaProbe } from '../SkiaProbe';

test('renders without throwing (skia mocked in jest)', async () => {
  const r = await render(<SkiaProbe />);
  expect(r).toBeTruthy();
});
