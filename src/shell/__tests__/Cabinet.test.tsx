import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { Cabinet } from '../Cabinet';

beforeEach(() => {
  useFacilityStore.setState({ cabinetOpen: true, lang: 'en', view: 'stage' });
});

describe('Cabinet', () => {
  it('counts what is allocated', async () => {
    const view = await render(<Cabinet />);
    expect(view.getByText('CABINET')).toBeTruthy();
    expect(view.getByText('01 / 06 · CLOSE')).toBeTruthy();
  });

  it('opens the first room', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod01'));
    expect(useFacilityStore.getState().view).toBe('mod01');
  });

  it('closes itself when a room opens', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod01'));
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });

  it('shows the five unfurnished rooms as numerals, and they do nothing', async () => {
    const view = await render(<Cabinet />);
    for (const slot of ['02', '03', '04', '05', '06']) {
      expect(view.getByText(slot)).toBeTruthy();
    }
    await fireEvent.press(view.getByText('02'));
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  // Every slot is the same square now — there is no feature row, so no tile
  // takes a whole row to itself.
  it('lays six equal slots out three to a row', async () => {
    const view = await render(<Cabinet />);
    expect(view.getByTestId('cabinet-row-0').props.children.length).toBe(3);
    expect(view.getByTestId('cabinet-row-1').props.children.length).toBe(3);
    expect(view.queryByTestId('cabinet-row-2')).toBeNull();
  });

  // Specimen-03 is off the registry, not deleted. The cabinet reads the
  // registry, so benching a room is enough to take its door away.
  it('has no door to a benched room', async () => {
    const view = await render(<Cabinet />);
    expect(view.queryByTestId('tile-mod06')).toBeNull();
  });

  it('closes on the close control', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByText('01 / 06 · CLOSE'));
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });
});
