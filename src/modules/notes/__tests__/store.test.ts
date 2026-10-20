import { KEYS, storage } from '../../../core/storage';
import { MAX_NOTES } from '../schedule';
import { useNotesStore } from '../store';
import { parse } from '../stored';

jest.mock('../notify', () => ({
  scheduleNote: jest.fn(async () => {}),
  cancelNote: jest.fn(async () => {}),
  reconcile: jest.fn(async () => {}),
  requestNotes: jest.fn(async () => true),
  notesPermission: jest.fn(async () => 'granted'),
}));
const { scheduleNote, cancelNote, reconcile, requestNotes } = jest.requireMock('../notify');

const draft = { text: 'Stay positive', hour: 9, minute: 0, days: [1, 3, 5], enabled: true };

beforeEach(async () => {
  await storage.clearAll();
  useNotesStore.setState({ hydrated: true, notes: [] });
  jest.clearAllMocks();
  requestNotes.mockResolvedValue(true);
});

describe('saving a note', () => {
  it('writes it to the disk and hands it to Android', async () => {
    await useNotesStore.getState().save(draft);

    expect(useNotesStore.getState().notes[0].text).toBe('Stay positive');
    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ text: 'Stay positive' }));
    expect(parse(await storage.get(KEYS.notes)).notes).toHaveLength(1);
  });

  // Android never re-prompts once refused, so a refusal must not leave a note
  // on the disk that will never arrive.
  it('is refused when the permission is', async () => {
    requestNotes.mockResolvedValue(false);

    expect(await useNotesStore.getState().save(draft)).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(0);
  });

  it('asks for the permission once, not on every note', async () => {
    await useNotesStore.getState().save(draft);
    await useNotesStore.getState().save({ ...draft, text: 'Drink water' });

    expect(requestNotes).toHaveBeenCalledTimes(1);
  });

  it('replaces a note it is given an id for, rather than adding one', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];

    await useNotesStore.getState().save({ ...draft, id, text: 'Stay hydrated' });

    expect(useNotesStore.getState().notes).toHaveLength(1);
    expect(useNotesStore.getState().notes[0].id).toBe(id);
    expect(useNotesStore.getState().notes[0].text).toBe('Stay hydrated');
  });

  // The id is what the pending notifications carry, so an edit has to take the
  // old triggers down BEFORE it puts the new ones up — the other order cancels
  // what it has just scheduled.
  it('takes an edited note’s old triggers down first', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().save({ ...draft, id, hour: 18 });

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ hour: 18 }));
    expect(cancelNote.mock.invocationCallOrder[0])
      .toBeLessThan(scheduleNote.mock.invocationCallOrder[0]);
  });

  it('refuses past the cap', async () => {
    useNotesStore.setState({
      notes: Array.from({ length: MAX_NOTES }, (_, i) => ({
        id: `n${i}`, text: 't', hour: 9, minute: 0, days: [1], enabled: true,
      })),
    });

    expect(await useNotesStore.getState().save(draft)).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(MAX_NOTES);
  });

  it('lets an existing note be edited even at the cap', async () => {
    useNotesStore.setState({
      notes: Array.from({ length: MAX_NOTES }, (_, i) => ({
        id: `n${i}`, text: 't', hour: 9, minute: 0, days: [1], enabled: true,
      })),
    });

    expect(await useNotesStore.getState().save({ ...draft, id: 'n0' })).toBe(true);
    expect(useNotesStore.getState().notes).toHaveLength(MAX_NOTES);
  });
});

describe('the switch', () => {
  it('takes a note’s triggers down without deleting it', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().setEnabled(id, false);

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(scheduleNote).not.toHaveBeenCalled();
    expect(useNotesStore.getState().notes[0].enabled).toBe(false);
    expect(useNotesStore.getState().notes).toHaveLength(1);
  });

  it('puts them back up', async () => {
    await useNotesStore.getState().save({ ...draft, enabled: false });
    const { id } = useNotesStore.getState().notes[0];
    jest.clearAllMocks();

    await useNotesStore.getState().setEnabled(id, true);

    expect(scheduleNote).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('survives a restart', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];
    await useNotesStore.getState().setEnabled(id, false);

    useNotesStore.setState({ hydrated: false, notes: [] });
    await useNotesStore.getState().hydrate();

    expect(useNotesStore.getState().notes[0].enabled).toBe(false);
  });
});

describe('deleting', () => {
  it('takes the note and its triggers together', async () => {
    await useNotesStore.getState().save(draft);
    const { id } = useNotesStore.getState().notes[0];

    await useNotesStore.getState().remove(id);

    expect(cancelNote).toHaveBeenCalledWith(id);
    expect(useNotesStore.getState().notes).toHaveLength(0);
    expect(parse(await storage.get(KEYS.notes)).notes).toHaveLength(0);
  });
});

describe('booting', () => {
  it('reconciles the whole queue against what is on the disk', async () => {
    await storage.set(KEYS.notes, JSON.stringify({
      notes: [{ id: 'n1', text: 't', hour: 9, minute: 0, days: [1], enabled: true }],
    }));
    useNotesStore.setState({ hydrated: false, notes: [] });

    await useNotesStore.getState().reconcileAll();

    expect(useNotesStore.getState().notes).toHaveLength(1);
    expect(reconcile).toHaveBeenCalledWith(useNotesStore.getState().notes);
  });
});
