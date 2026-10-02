import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { DARK } from '../../core/theme';
import { Cabinet } from '../Cabinet';

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({ cabinetOpen: true, lang: 'en', view: 'stage' });
});

describe('Cabinet', () => {
  it('counts what is allocated', async () => {
    const view = await render(<Cabinet />);
    expect(view.getByText('CABINET')).toBeTruthy();
    expect(view.getByText('03 / 06')).toBeTruthy();
  });

  // The word left the header with the rest of `1d` — the sheet reads CABINET
  // and a count, nothing else. It did not leave the screen reader, which is
  // not looking at the design: the label is the same sentence it always was,
  // so the control still announces what pressing it does.
  it('says CLOSE to a screen reader and not to the eye', async () => {
    const view = await render(<Cabinet />);
    expect(view.queryByText('03 / 06 · CLOSE')).toBeNull();
    expect(view.getByLabelText('ALLOCATED 03 / 06 · CLOSE')).toBeTruthy();
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

  it('opens the second room', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod02'));
    expect(useFacilityStore.getState().view).toBe('mod02');
  });

  it('shows the three unfurnished rooms as numerals, and they do nothing', async () => {
    const view = await render(<Cabinet />);
    for (const slot of ['04', '05', '06']) {
      expect(view.getByText(slot)).toBeTruthy();
    }
    await fireEvent.press(view.getByText('04'));
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  it('opens the third room', async () => {
    const view = await render(<Cabinet />);
    await fireEvent.press(view.getByTestId('tile-mod03'));
    expect(useFacilityStore.getState().view).toBe('mod03');
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
    await fireEvent.press(view.getByText('03 / 06'));
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });

  // `1d` lifts the drawer off the screen edges. It was flush and rounded only
  // at the top, which is what a sheet dragged up from the bottom looks like;
  // it is now a card floating clear of all four, which is what a sheet a
  // BUTTON opened looks like. The 100 underneath is what holds it above the
  // input row the dock button sits in.
  it('floats clear of all four edges', async () => {
    const view = await render(<Cabinet />);
    const sheet = flat(view.getByTestId('cabinet-sheet').props.style);
    expect(sheet).toMatchObject({
      marginHorizontal: 12,
      marginBottom: 100,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: DARK.hairline,
    });
  });

  // The corners used to disagree on purpose — 20 at the top, 34 at the bottom,
  // because the bottom two were off-screen. All four are on screen now, so a
  // per-corner radius left over from that would show.
  it('has no per-corner radius left over from the flush drawer', async () => {
    const view = await render(<Cabinet />);
    const sheet = flat(view.getByTestId('cabinet-sheet').props.style);
    for (const corner of [
      'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomLeftRadius', 'borderBottomRightRadius',
    ]) {
      expect(sheet[corner]).toBeUndefined();
    }
  });

  // The grab bar was the drawer saying it could be dragged. Nothing drags any
  // more: the dock button opens this and the scrim closes it.
  it('offers no grab bar', async () => {
    const view = await render(<Cabinet />);
    expect(view.queryByTestId('cabinet-grab')).toBeNull();
  });
});
