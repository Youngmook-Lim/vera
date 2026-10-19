import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { NoteEditor } from '../NoteEditor';
import { MAX_NOTES } from '../schedule';
import { useNotesStore } from '../store';
import { T } from '../strings';

jest.mock('../notify', () => ({
  scheduleNote: jest.fn(async () => {}),
  cancelNote: jest.fn(async () => {}),
  reconcile: jest.fn(async () => {}),
  requestNotes: jest.fn(async () => true),
  notesPermission: jest.fn(async () => 'granted'),
}));

const NOTE = {
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, face: 'calm' as const,
};

const saved = () => useNotesStore.getState().notes;

beforeEach(async () => {
  await storage.clearAll();
  useFacilityStore.setState({ lang: 'en', emotion: 'calm' });
  useNotesStore.setState({ hydrated: true, notes: [] });
});

describe('the editor', () => {
  it('opens blank, with no day chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    expect(view.getByTestId('note-text').props.value).toBe('');
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      expect(view.getByTestId(`day-${day}`).props.accessibilityState.selected).toBe(false);
    }

    await view.unmount();
  });

  it('opens filled for a note being edited', async () => {
    const view = await render(<NoteEditor note={NOTE} onDone={() => {}} accent="#f4b43a" />);

    expect(view.getByTestId('note-text').props.value).toBe('Stay positive');
    expect(view.getByTestId('picked-hour')).toHaveTextContent('09');
    expect(view.getByTestId('day-1').props.accessibilityState.selected).toBe(true);

    await view.unmount();
  });

  it('starts a new note on calm, and saves the face chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    expect(view.getByTestId('face-calm').props.accessibilityState.selected).toBe(true);

    await fireEvent.changeText(view.getByTestId('note-text'), 'Breathe');
    await fireEvent.press(view.getByTestId('day-1'));
    await fireEvent.press(view.getByTestId('face-bored'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()[0].face).toBe('bored');
    await view.unmount();
  });

  it('opens an existing note on the face it wears', async () => {
    const amused = { ...NOTE, face: 'amused' as const };
    useNotesStore.setState({ notes: [amused] });
    const view = await render(<NoteEditor note={amused} onDone={() => {}} accent="#f4b43a" />);

    expect(view.getByTestId('face-amused').props.accessibilityState.selected).toBe(true);
    await view.unmount();
  });

  // fireEvent.press on a DISABLED element is a silent no-op, so pressing it
  // alone would pass against a save with no guard at all. Both halves.
  it('cannot be saved with nothing written', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    await fireEvent.press(view.getByTestId('day-1'));

    expect(view.getByTestId('note-save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId('note-save'));
    expect(saved()).toHaveLength(0);

    await view.unmount();
  });

  it('cannot be saved with no day chosen', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);
    await fireEvent.changeText(view.getByTestId('note-text'), 'Drink water');

    expect(view.getByTestId('note-save').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId('note-save'));
    expect(saved()).toHaveLength(0);

    await view.unmount();
  });

  it('saves the words, the hour and the days together', async () => {
    const onDone = jest.fn();
    const view = await render(<NoteEditor onDone={onDone} accent="#f4b43a" />);

    await fireEvent.changeText(view.getByTestId('note-text'), 'Drink water');
    await fireEvent.press(view.getByTestId('day-2'));
    await fireEvent.press(view.getByTestId('hour-up'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()).toHaveLength(1);
    expect(saved()[0].text).toBe('Drink water');
    expect(saved()[0].days).toEqual([2]);
    expect(saved()[0].hour).toBe(10);
    expect(onDone).toHaveBeenCalled();

    await view.unmount();
  });

  // The id is what every pending notification for this note carries.
  it('keeps the id it was opened with', async () => {
    useNotesStore.setState({ notes: [NOTE] });
    const view = await render(<NoteEditor note={NOTE} onDone={() => {}} accent="#f4b43a" />);

    await fireEvent.changeText(view.getByTestId('note-text'), 'Stay hydrated');
    await fireEvent.press(view.getByTestId('note-save'));

    expect(saved()).toHaveLength(1);
    expect(saved()[0].id).toBe('n1');
    expect(saved()[0].text).toBe('Stay hydrated');

    await view.unmount();
  });

  it('offers no delete on a note that does not exist yet', async () => {
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    expect(view.queryByTestId('note-delete')).toBeNull();

    await view.unmount();
  });

  it('deletes an existing note', async () => {
    useNotesStore.setState({ notes: [NOTE] });
    const onDone = jest.fn();
    const view = await render(<NoteEditor note={NOTE} onDone={onDone} accent="#f4b43a" />);

    await fireEvent.press(view.getByTestId('note-delete'));

    expect(saved()).toHaveLength(0);
    expect(onDone).toHaveBeenCalled();

    await view.unmount();
  });

  // A refusal that said nothing would read as a broken button.
  it('says why a valid note was refused', async () => {
    useNotesStore.setState({
      notes: Array.from({ length: MAX_NOTES }, (_, i) => ({ ...NOTE, id: `n${i}` })),
    });
    const view = await render(<NoteEditor onDone={() => {}} accent="#f4b43a" />);

    await fireEvent.changeText(view.getByTestId('note-text'), 'One too many');
    await fireEvent.press(view.getByTestId('day-1'));
    await fireEvent.press(view.getByTestId('note-save'));

    expect(view.getByText(T.en.full)).toBeTruthy();

    await view.unmount();
  });
});
