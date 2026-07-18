import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ComplyRing } from '../ComplyRing';

test('press-in reports holding, release cancels without completing', async () => {
  const onComplete = jest.fn();
  const onHoldChange = jest.fn();
  const { getByLabelText } = await render(
    <ComplyRing onComplete={onComplete} onHoldChange={onHoldChange} lang="en" />,
  );
  const ring = getByLabelText('hold to comply');
  await fireEvent(ring, 'pressIn');
  expect(onHoldChange).toHaveBeenLastCalledWith(true);
  await fireEvent(ring, 'pressOut');
  expect(onHoldChange).toHaveBeenLastCalledWith(false);
  expect(onComplete).not.toHaveBeenCalled();
});

test('renders the directive label', async () => {
  const { getByText } = await render(
    <ComplyRing onComplete={() => {}} onHoldChange={() => {}} lang="en" />,
  );
  expect(getByText('HOLD TO COMPLY')).toBeTruthy();
});
