import { DISPLAY_ORDER, MAX_TEXT, MINUTE_STEP, isSavable, toExpoWeekday, triggersFor } from '../schedule';
import type { Note } from '../stored';

const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1', text: 'Stay positive', hour: 9, minute: 0,
  days: [1, 3, 5], enabled: true, face: 'calm', ...over,
});

describe('the weekday a notification is filed under', () => {
  // A TABLE, never a formula. A test that recomputes `day + 1` would agree
  // with an implementation that had the offset wrong in the same direction.
  it('is expo’s, which counts from one and starts on Sunday', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('puts Sunday at one and Saturday at seven', () => {
    expect(toExpoWeekday(0)).toBe(1);
    expect(toExpoWeekday(6)).toBe(7);
  });
});

describe('the order the row reads in', () => {
  it('starts on Monday and ends on Sunday', () => {
    expect(DISPLAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('is every day exactly once', () => {
    expect([...DISPLAY_ORDER].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('what a note asks Android for', () => {
  it('is one trigger a day, at the note’s own hour', () => {
    expect(triggersFor(note())).toEqual([
      { weekday: 2, hour: 9, minute: 0 },
      { weekday: 4, hour: 9, minute: 0 },
      { weekday: 6, hour: 9, minute: 0 },
    ]);
  });

  // Sunday is 0 stored and 1 to expo, so a note including it is where an
  // off-by-one surfaces as a notification on the wrong day.
  it('files a Sunday note under expo’s first weekday', () => {
    expect(triggersFor(note({ days: [0] }))).toEqual([{ weekday: 1, hour: 9, minute: 0 }]);
  });

  it('asks for nothing at all while the note is switched off', () => {
    expect(triggersFor(note({ enabled: false }))).toEqual([]);
  });

  it('asks for nothing when no day is chosen', () => {
    expect(triggersFor(note({ days: [] }))).toEqual([]);
  });

  it('is in day order however the days were chosen', () => {
    expect(triggersFor(note({ days: [5, 0, 3] })).map((t) => t.weekday)).toEqual([1, 4, 6]);
  });
});

describe('whether a draft can be saved', () => {
  it('needs something to say', () => {
    expect(isSavable({ text: '', days: [1] })).toBe(false);
    expect(isSavable({ text: '   ', days: [1] })).toBe(false);
  });

  // A note with no day never fires. Saving it would be a control that accepts
  // a tap and does nothing, which is the rule SEND already follows.
  it('needs a day to arrive on', () => {
    expect(isSavable({ text: 'Stay positive', days: [] })).toBe(false);
  });

  it('takes a note with both', () => {
    expect(isSavable({ text: 'Stay positive', days: [1] })).toBe(true);
  });

  it('refuses more than a notification body can show', () => {
    expect(isSavable({ text: 'x'.repeat(MAX_TEXT + 1), days: [1] })).toBe(false);
    expect(isSavable({ text: 'x'.repeat(MAX_TEXT), days: [1] })).toBe(true);
  });
});

describe('the minute', () => {
  it('moves in steps that divide the hour', () => {
    expect(60 % MINUTE_STEP).toBe(0);
  });
});
