import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { LIGHT } from '../../../core/theme';
import { newDeck } from '../../deck';
import { fieldFor } from '../colour';
import { affirmations } from '../index';
import { LINES } from '../lines';
import { useAffirmationsStore } from '../store';

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
