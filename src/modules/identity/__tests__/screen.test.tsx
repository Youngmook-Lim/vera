import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { KEYS, storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { identity } from '../index';
import { SEED, stamp } from '../identity';

const Screen = identity.Screen;

beforeEach(async () => {
  useFacilityStore.setState({ view: 'mod02', lang: 'en' });
  await storage.clearAll();
});

describe('Module 02', () => {
  it('shows the statements as written', async () => {
    const view = await render(<Screen />);
    expect(view.getByDisplayValue('I am kind to people who cannot help me.')).toBeTruthy();
  });

  it('carries the stamp', async () => {
    const view = await render(<Screen />);
    expect(view.getByText(/^written in \w+ · /)).toBeTruthy();
  });

  it('adds a line on the mark', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('add-line'));
    expect(view.getAllByTestId(/^line-/)).toHaveLength(5);
  });

  it('removes a line', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('remove-0'));
    expect(view.getAllByTestId(/^line-/)).toHaveLength(3);
  });

  it('says so when the page is empty', async () => {
    const view = await render(<Screen />);
    for (const _ of [0, 1, 2, 3]) await fireEvent.press(view.getByTestId('remove-0'));
    expect(view.getByText('Nothing written yet. Use the mark above to begin a line.')).toBeTruthy();
  });

  // The doorway rule: one exit, top-left, in the module's own ink.
  it('exits to the stage', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  // The hard-won lesson: a round trip through the REAL save path (a user
  // action, not a hand-built object poked into storage) and then the real
  // load path on a fresh mount. Every field must survive the trip.
  it('round-trips a save through the real save and load paths', async () => {
    const first = await render(<Screen />);
    // Bumps revs (a removal) and touches the line list, but never the month.
    await fireEvent.press(first.getByTestId('remove-0'));
    await fireEvent.press(first.getByTestId('add-line'));
    await first.unmount();

    const raw = await storage.get(KEYS.identity);
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw as string);

    const second = await render(<Screen />);
    expect(await second.findByDisplayValue(SEED.lines[1])).toBeTruthy(); // survivor of the removal
    expect(await second.findByDisplayValue(SEED.title)).toBeTruthy();
    expect(second.getAllByTestId(/^line-/)).toHaveLength(SEED.lines.length); // -1 removed, +1 blank added
    expect(second.getByText(stamp({ ...SEED, revs: 1 }))).toBeTruthy();
    expect(persisted.revs).toBe(1);
    expect(persisted.month).toBe(SEED.month);
  });

  // The blur-commit wiring (not covered by identity.test.ts, which only
  // exercises the pure functions) — typing then blurring a line must bump
  // the revision the same way calling editLine() directly does.
  it('rewrites a line on blur and counts the revision', async () => {
    const view = await render(<Screen />);
    const input = view.getByTestId('line-0');
    await fireEvent.changeText(input, 'I ship before I feel ready.');
    await fireEvent(input, 'blur');
    expect(view.getByDisplayValue('I ship before I feel ready.')).toBeTruthy();
    expect(view.getByText(stamp({ ...SEED, revs: 1 }))).toBeTruthy();
  });

  it('leaves the revision alone when a blurred line is unchanged', async () => {
    const view = await render(<Screen />);
    const input = view.getByTestId('line-0');
    await fireEvent.changeText(input, SEED.lines[0]);
    await fireEvent(input, 'blur');
    expect(view.getByText(stamp(SEED))).toBeTruthy();
  });

  it('rewrites the title on blur and counts the revision', async () => {
    const view = await render(<Screen />);
    const input = view.getByDisplayValue(SEED.title);
    await fireEvent.changeText(input, 'who I am becoming instead');
    await fireEvent(input, 'blur');
    expect(view.getByDisplayValue('who I am becoming instead')).toBeTruthy();
    expect(view.getByText(stamp({ ...SEED, revs: 1 }))).toBeTruthy();
  });
});
