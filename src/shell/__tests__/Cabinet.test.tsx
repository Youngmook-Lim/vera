import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { Cabinet } from '../Cabinet';

beforeEach(() =>
  useFacilityStore.setState({ cabinetOpen: true, lang: 'en', view: 'stage', hunger: 82 }));

describe('Cabinet', () => {
  it('counts what is allocated', async () => {
    const view = await render(<Cabinet />);
    expect(view.getByText('CABINET')).toBeTruthy();
    expect(view.getByText('02 / 04 · CLOSE')).toBeTruthy();
  });

  it('opens module 01', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod01'));
    expect(useFacilityStore.getState().view).toBe('mod01');
  });

  it('opens module 02', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod02'));
    expect(useFacilityStore.getState().view).toBe('mod02');
  });

  it('closes itself when a room opens', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod01'));
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });

  it('shows the two unfurnished rooms as numerals, and they do nothing', async () => {
    const view = await render(<Cabinet />);
    expect(view.getByText('03')).toBeTruthy();
    expect(view.getByText('04')).toBeTruthy();
    await fireEvent.press(view.getByText('03'));
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  it('closes on the close control', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByText('02 / 04 · CLOSE'));
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });
});
