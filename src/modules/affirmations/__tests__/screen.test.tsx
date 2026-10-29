import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { LIGHT } from '../../../core/theme';
import { newDeck } from '../../deck';
import { fieldFor } from '../colour';
import { affirmations } from '../index';
import { LINES } from '../lines';
import { useAffirmationsStore } from '../store';

// The status bar stood in by a file-local mock that renders its style as text,
// the router's own way of reading it: expo-status-bar's exports cannot be spied on.
jest.mock('expo-status-bar', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    StatusBar: ({ style }: { style: string }) => createElement(Text, { testID: 'status-bar' }, style),
  };
});

const Screen = affirmations.Screen;
const pad3 = (n: number) => String(n).padStart(3, '0');
const swipe = (view: Awaited<ReturnType<typeof render>>, actionName: 'increment' | 'decrement') =>
  fireEvent(view.getByTestId('affirmations-card'), 'accessibilityAction', { nativeEvent: { actionName } });
const lineOn = (view: Awaited<ReturnType<typeof render>>) =>
  view.getByTestId('affirmations-line').props.children as string;

beforeEach(async () => {
  useFacilityStore.setState({ view: 'mod04', lang: 'en', theme: 'dark', pendingAffirmation: null });
  await storage.clearAll();
  useAffirmationsStore.setState({ hydrated: true, favorites: new Set(), deck: newDeck(LINES.length) });
});

describe('the poster', () => {
  it('shows one of her lines, numbered by where it lives', async () => {
    const view = await render(<Screen />);
    const line = lineOn(view);
    expect(LINES).toContain(line);
    expect(view.getByTestId('affirmations-numeral').props.children).toBe(pad3(LINES.indexOf(line) + 1));
    await view.unmount();
  });

  it('wears the card\'s own field', async () => {
    const view = await render(<Screen />);
    const index = LINES.indexOf(lineOn(view));
    const style = StyleSheet.flatten(view.getByTestId('affirmations-field').props.style);
    expect(style.backgroundColor).toBe(fieldFor(index).bg);
    await view.unmount();
  });

  it('moves on with a swipe and comes back with one the other way', async () => {
    const view = await render(<Screen />);
    const first = lineOn(view);
    await swipe(view, 'increment');
    const second = lineOn(view);
    expect(second).not.toBe(first);
    await swipe(view, 'decrement');
    expect(lineOn(view)).toBe(first);
    await view.unmount();
  });

  // Review Focus 1.
  it('stays on the first card of a pass when swiped back', async () => {
    const view = await render(<Screen />);
    const first = lineOn(view);
    await swipe(view, 'decrement');
    expect(lineOn(view)).toBe(first);
    expect(useAffirmationsStore.getState().deck.at).toBe(0);
    await view.unmount();
  });

  // Review Focus 3: the swipe is the whole gesture.
  it('does nothing on a tap', async () => {
    const view = await render(<Screen />);
    const first = lineOn(view);
    await fireEvent.press(view.getByTestId('affirmations-card'));
    expect(lineOn(view)).toBe(first);
    await view.unmount();
  });

  it('keeps the card on the star, and remembers it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('affirmations-star'));
    expect(view.getByTestId('affirmations-star').props.accessibilityState.selected).toBe(true);
    expect(useAffirmationsStore.getState().favorites.has(lineOn(view))).toBe(true);
    await view.unmount();
  });

  it('leaves through the one exit', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));
    expect(useFacilityStore.getState().view).toBe('stage');
    await view.unmount();
  });

  it('takes its ground from the theme where the posters do not cover it', async () => {
    useFacilityStore.setState({ theme: 'light' });
    const view = await render(<Screen />);
    const style = StyleSheet.flatten(view.getByTestId('view-mod04').props.style);
    expect(style.backgroundColor).toBe(LIGHT.affirmations.room.bg);
    await view.unmount();
  });
});

describe('the list', () => {
  const openList = async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('affirmations-mode-list'));
    return view;
  };

  it('shows every card with a chip in its own field', async () => {
    const view = await openList();
    expect(view.getByTestId('affirmations-list')).toBeTruthy();
    const chip = StyleSheet.flatten(view.getByTestId('affirmations-row-2-chip').props.style);
    expect(chip.backgroundColor).toBe(fieldFor(2).bg);
    await view.unmount();
  });

  it('opens a card from its row, on the poster', async () => {
    const view = await openList();
    await fireEvent.press(view.getByTestId('affirmations-row-4'));
    expect(lineOn(view)).toBe(LINES[4]);
    await view.unmount();
  });

  it('keeps a card from its row without opening it', async () => {
    const view = await openList();
    await fireEvent.press(view.getByTestId('affirmations-row-4-star'));
    expect(useAffirmationsStore.getState().favorites.has(LINES[4])).toBe(true);
    expect(view.getByTestId('affirmations-list')).toBeTruthy();
    await view.unmount();
  });

  it('offers the sort only in the list, and only with something kept', async () => {
    const poster = await render(<Screen />);
    expect(poster.queryByTestId('affirmations-sort')).toBeNull();
    await poster.unmount();

    const view = await openList();
    expect(view.getByTestId('affirmations-sort').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId('affirmations-row-9-star'));
    expect(view.getByTestId('affirmations-sort').props.accessibilityState.disabled).toBe(false);
    await view.unmount();
  });
});

describe('a card tapped on the lock screen', () => {
  it('opens the poster on that card, and is taken once', async () => {
    const view = await render(<Screen />);
    await act(async () => {
      useFacilityStore.getState().openAffirmation(12);
    });
    await waitFor(() => expect(lineOn(view)).toBe(LINES[12]));
    expect(useFacilityStore.getState().pendingAffirmation).toBeNull();
    await view.unmount();
  });

  // Review Focus 5.
  it('takes the room off the list to show it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('affirmations-mode-list'));
    await act(async () => {
      useFacilityStore.getState().openAffirmation(12);
    });
    await waitFor(() => expect(lineOn(view)).toBe(LINES[12]));
    await view.unmount();
  });
});

describe('the boot', () => {
  it('opens the room on a card Android held while the app was dead', async () => {
    const notifs = jest.requireMock('expo-notifications') as Record<string, jest.Mock>;
    notifs.getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: { request: { content: { data: { room: 'affirmations', index: 7 } } } },
    });
    useFacilityStore.setState({ view: 'stage' });
    const off = await affirmations.onBoot!();
    expect(useFacilityStore.getState().view).toBe('mod04');
    expect(useFacilityStore.getState().pendingAffirmation).toBe(7);
    if (typeof off === 'function') off();
  });
});

// The final review's two (2026-10-29).
describe('what the poster owes the phone around it', () => {
  // The poster is painted behind the status bar, and the fields do not follow
  // the theme, so the clock and battery have to follow the field instead.
  it('draws the status bar\'s icons in whichever ink the field carries', async () => {
    for (const index of [0, 2, 4, 5]) {
      useAffirmationsStore.setState({ deck: { order: [index, ...LINES.map((_, i) => i).filter((i) => i !== index)], at: 0 } });
      const view = await render(<Screen />);
      expect(view.getByTestId('status-bar').props.children).toBe(fieldFor(index).bar);
      await view.unmount();
    }
  });

  it('leaves the status bar to the theme on the list', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('affirmations-mode-list'));
    expect(view.queryByTestId('status-bar')).toBeNull();
    await view.unmount();
  });

  // A card already in the shade from before a re-run that dropped lines can
  // name an index that no longer exists. It must not take the room down.
  it('ignores a tapped card that is no longer in the corpus', async () => {
    const view = await render(<Screen />);
    const before = lineOn(view);
    await act(async () => {
      useFacilityStore.getState().openAffirmation(LINES.length + 5);
    });
    expect(lineOn(view)).toBe(before);
    expect(useFacilityStore.getState().pendingAffirmation).toBeNull();
    await view.unmount();
  });
});
