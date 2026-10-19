import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { notes as mod } from '..';
import { useNotesStore } from '../store';
import { T } from '../strings';

jest.mock('../notify', () => ({
  scheduleNote: jest.fn(async () => {}),
  cancelNote: jest.fn(async () => {}),
  reconcile: jest.fn(async () => {}),
  requestNotes: jest.fn(async () => true),
  notesPermission: jest.fn(async () => 'granted'),
  readTapTarget: jest.fn(async () => null),
  onTap: jest.fn(() => () => {}),
}));

const Screen = mod.Screen;

const NOTE = {
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, face: 'calm' as const,
};

beforeEach(async () => {
  await storage.clearAll();
  useFacilityStore.setState({ view: 'mod03', lang: 'en', emotion: 'calm', pendingNote: null });
  useNotesStore.setState({ hydrated: true, notes: [NOTE] });
});

describe('the room', () => {
  // Both other rooms open on a card, because they have something to deal.
  // There is nothing to deal here: a note is a thing you made.
  it('opens on the list', async () => {
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-list')).toBeTruthy();
    expect(view.queryByTestId('notes-card')).toBeNull();

    await view.unmount();
  });

  it('says so when nothing has been written', async () => {
    useNotesStore.setState({ notes: [] });
    const view = await render(<Screen />);

    expect(view.getByText(T.en.empty)).toBeTruthy();

    await view.unmount();
  });

  it('gives each note a row carrying its hour, its days and its words', async () => {
    const view = await render(<Screen />);

    const row = within(view.getByTestId('notes-row-n1'));
    expect(row.getByText('09:00')).toBeTruthy();
    expect(row.getByText('Stay positive')).toBeTruthy();
    // Monday, Wednesday, Friday — in the row's own Monday-first order.
    expect(view.getByTestId('notes-row-n1-days')).toHaveTextContent('M W F');

    await view.unmount();
  });

  // [1,3,5] is already ascending, so storage order and row order agree on it
  // and a row rendering the raw days would pass. Sunday is stored as 0 and
  // READ last, so it is the only case that tells the two apart.
  it('reads Sunday last in the row, though it is stored first', async () => {
    useNotesStore.setState({ notes: [{ ...NOTE, days: [0, 1] }] });
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-row-n1-days')).toHaveTextContent('M S');

    await view.unmount();
  });

  it('switches a note off from its row, without deleting it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-row-n1-switch'));

    expect(useNotesStore.getState().notes[0].enabled).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(1);

    await view.unmount();
  });

  // A nested Pressable takes the touch itself, so the switch never opens it.
  it('does not open the editor when the switch is pressed', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-row-n1-switch'));

    expect(view.queryByTestId('note-editor')).toBeNull();

    await view.unmount();
  });

  it('opens the editor on a row, filled in', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-row-n1'));

    expect(view.getByTestId('note-editor')).toBeTruthy();
    expect(view.getByTestId('note-text').props.value).toBe('Stay positive');

    await view.unmount();
  });

  it('opens the editor blank on a new note', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-new'));

    expect(view.getByTestId('note-text').props.value).toBe('');

    await view.unmount();
  });
});

describe('a tapped notification', () => {
  it('opens that note alone, as a card', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-card')).toHaveTextContent('Stay positive');
    expect(view.queryByTestId('notes-list')).toBeNull();

    await view.unmount();
  });

  // Taken once and cleared, like pendingQuote and pendingStory: walking back
  // into the room later is an ordinary visit.
  it('is spent on arrival', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);

    expect(useFacilityStore.getState().pendingNote).toBeNull();

    await view.unmount();
  });

  // Deleted between the notification firing and the tap.
  it('opens the list when the note is gone', async () => {
    useFacilityStore.setState({ pendingNote: 'deleted' });
    const view = await render(<Screen />);

    expect(view.getByTestId('notes-list')).toBeTruthy();

    await view.unmount();
  });

  it('goes back to the list from the card', async () => {
    useFacilityStore.setState({ pendingNote: 'n1' });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('notes-card-back'));

    expect(view.getByTestId('notes-list')).toBeTruthy();

    await view.unmount();
  });
});

// The doorway rule: one exit, top-left, in the room's own ink.
describe('the threshold', () => {
  it('leaves by the one exit', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));

    expect(useFacilityStore.getState().view).toBe('stage');

    await view.unmount();
  });
});
