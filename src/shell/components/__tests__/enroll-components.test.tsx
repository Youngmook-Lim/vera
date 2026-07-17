import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AmberButton } from '../AmberButton';
import { EnrollHeader } from '../EnrollHeader';
import { OpticEye } from '../OpticEye';
import { Scanline } from '../Scanline';
import { VeraPanel } from '../VeraPanel';

test('AmberButton renders arrow variant and fires onPress', async () => {
  const onPress = jest.fn();
  const { getByText } = await render(<AmberButton label="BEGIN INTAKE" onPress={onPress} lang="en" />);
  await fireEvent.press(getByText('BEGIN INTAKE ▸'));
  expect(onPress).toHaveBeenCalled();
});

test('AmberButton can omit the arrow', async () => {
  const { getByText } = await render(<AmberButton label="I ACCEPT" onPress={() => {}} lang="en" arrow={false} />);
  expect(getByText('I ACCEPT')).toBeTruthy();
});

test('EnrollHeader shows the center label and right slot', async () => {
  const { getByText } = await render(<EnrollHeader mood="dark" right="00:00 · INTAKE" lang="en" />);
  expect(getByText('ENRICHMENT CENTER')).toBeTruthy();
  expect(getByText('00:00 · INTAKE')).toBeTruthy();
});

test('OpticEye and Scanline render without crashing', async () => {
  await render(<OpticEye size={150} />);
  await render(<OpticEye size={104} inner={false} />);
  await render(<Scanline />);
});

test('VeraPanel cursor variant still renders the line', async () => {
  const { getByText } = await render(<VeraPanel line="Speaking." lang="en" cursor />);
  expect(getByText(/Speaking\./)).toBeTruthy();
});
