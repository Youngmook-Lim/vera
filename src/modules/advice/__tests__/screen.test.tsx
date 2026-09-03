import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { palette } from '../../../core/theme';
import { storage } from '../../../core/storage';
import { useFacilityStore } from '../../../core/store';
import { advice } from '../index';
import { QUOTES, SOURCE } from '../quotes';
import { useAdviceStore } from '../store';
import { EMOTIONS } from '../../../vera/emotions';

const Screen = advice.Screen;

const marked = (node: { props: { accessibilityState?: { selected?: boolean } } }) =>
  node.props.accessibilityState?.selected;

beforeEach(async () => {
  useFacilityStore.setState({ view: 'mod02', lang: 'en', emotion: 'calm' });
  await storage.clearAll();
  useAdviceStore.setState({ hydrated: true, favorites: new Set() });
});

describe('Module 02', () => {
  it('deals a card from the book', async () => {
    const view = await render(<Screen />);
    expect(QUOTES).toContain(view.getByTestId('advice-quote').props.children);
    await view.unmount();
  });

  it('names the book under the card', async () => {
    const view = await render(<Screen />);
    expect(view.getByText(`${SOURCE.author} · ${SOURCE.shortTitle}`)).toBeTruthy();
    await view.unmount();
  });

  it('deals a different card on a tap, and counts the pass', async () => {
    const view = await render(<Screen />);
    const first = view.getByTestId('advice-quote').props.children;
    expect(view.getByTestId('advice-counter').props.children).toBe('001 / 232');

    await fireEvent.press(view.getByTestId('advice-card'));

    expect(view.getByTestId('advice-quote').props.children).not.toBe(first);
    expect(view.getByTestId('advice-counter').props.children).toBe('002 / 232');
    await view.unmount();
  });

  it('lists the book in the order the book puts it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    expect(view.getByTestId('advice-row-0')).toBeTruthy();
    expect(view.getByText(QUOTES[0])).toBeTruthy();
    expect(view.getByText(QUOTES[3])).toBeTruthy();
    await view.unmount();
  });

  it('deals a card picked out of the list', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    await fireEvent.press(view.getByTestId('advice-row-3'));
    expect(view.getByTestId('advice-quote').props.children).toBe(QUOTES[3]);
    await view.unmount();
  });

  // The mode row sits in its own air: the gap down to whatever is showing
  // below it matches the gap up to the header rule, and one number owns both.
  // Before this the two containers below set it themselves and disagreed —
  // 22px under a card, 8px under the list.
  it('leaves the same air under the mode row as above it, in both modes', async () => {
    const view = await render(<Screen />);
    const modes = StyleSheet.flatten(view.getByTestId('advice-modes').props.style);
    expect(modes.paddingBottom).toBe(modes.paddingTop);

    const shuffle = StyleSheet.flatten(view.getByTestId('advice-card-scroll').props.style);
    expect(shuffle.paddingTop).toBeFalsy();

    await fireEvent.press(view.getByTestId('mode-list'));
    const list = StyleSheet.flatten(view.getByTestId('advice-list').props.contentContainerStyle);
    expect(list.paddingTop).toBeFalsy();
    await view.unmount();
  });

  // The star is outside the card on purpose: it is the one control on this
  // screen you could otherwise hit while meaning to deal the next card.
  it('keeps the dealt card without dealing another', async () => {
    const view = await render(<Screen />);
    const dealt = view.getByTestId('advice-quote').props.children;
    expect(marked(view.getByTestId('advice-star'))).toBe(false);

    await fireEvent.press(view.getByTestId('advice-star'));

    expect(view.getByTestId('advice-quote').props.children).toBe(dealt);
    expect(marked(view.getByTestId('advice-star'))).toBe(true);
    expect(useAdviceStore.getState().favorites.has(dealt)).toBe(true);
    await view.unmount();
  });

  it('shows in the list which cards were kept', async () => {
    useAdviceStore.setState({ hydrated: true, favorites: new Set([QUOTES[3]]) });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    expect(marked(view.getByTestId('advice-row-3-star'))).toBe(true);
    expect(marked(view.getByTestId('advice-row-0-star'))).toBe(false);
    await view.unmount();
  });

  it('keeps and releases a card from the list without leaving it', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));

    await fireEvent.press(view.getByTestId('advice-row-3-star'));
    expect(view.getByTestId('advice-list')).toBeTruthy();
    expect(marked(view.getByTestId('advice-row-3-star'))).toBe(true);

    await fireEvent.press(view.getByTestId('advice-row-3-star'));
    expect(view.getByTestId('advice-list')).toBeTruthy();
    expect(marked(view.getByTestId('advice-row-3-star'))).toBe(false);
    await view.unmount();
  });

  it('lifts the kept cards to the top on the sort, and counts them', async () => {
    useAdviceStore.setState({ hydrated: true, favorites: new Set([QUOTES[3], QUOTES[1]]) });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    expect(view.getByTestId('sort-favorites')).toHaveTextContent('★ FIRST 2');

    const before = view.getAllByTestId(/^advice-row-\d+$/).map((r) => r.props.testID);
    expect(before.slice(0, 3)).toEqual(['advice-row-0', 'advice-row-1', 'advice-row-2']);

    await fireEvent.press(view.getByTestId('sort-favorites'));

    const after = view.getAllByTestId(/^advice-row-\d+$/).map((r) => r.props.testID);
    expect(after.slice(0, 3)).toEqual(['advice-row-1', 'advice-row-3', 'advice-row-0']);
    await view.unmount();
  });

  it('offers the sort only while the list is showing', async () => {
    const view = await render(<Screen />);
    expect(view.queryByTestId('sort-favorites')).toBeNull();
    await fireEvent.press(view.getByTestId('mode-list'));
    expect(view.getByTestId('sort-favorites')).toBeTruthy();
    await fireEvent.press(view.getByTestId('mode-shuffle'));
    expect(view.queryByTestId('sort-favorites')).toBeNull();
    await view.unmount();
  });

  // The room is in her building, so it takes her mood: everything the room
  // draws in its accent reads her current iris, the star included.
  it('draws its accent in the colour she is currently wearing', async () => {
    useFacilityStore.setState({ emotion: 'pleased' });
    useAdviceStore.setState({ hydrated: true, favorites: new Set([QUOTES[0]]) });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('advice-star'));

    const hue = EMOTIONS.pleased.iris;
    expect(StyleSheet.flatten(view.getByTestId('advice-counter').props.style).color).toBe(hue);
    expect(StyleSheet.flatten(view.getByTestId('mode-shuffle-label').props.style).color).toBe(hue);
    await view.unmount();
  });

  it('paints a kept card in her colour and an unkept one in the room ghost', async () => {
    useFacilityStore.setState({ emotion: 'suspicious' });
    useAdviceStore.setState({ hydrated: true, favorites: new Set([QUOTES[3]]) });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));

    const kept = StyleSheet.flatten(view.getByTestId('advice-row-3-star-glyph').props.style);
    const unkept = StyleSheet.flatten(view.getByTestId('advice-row-0-star-glyph').props.style);
    expect(kept.color).toBe(EMOTIONS.suspicious.iris);
    expect(unkept.color).toBe(palette.advice.inkGhost);
    await view.unmount();
  });

  // Her dead grey, deliberately: a building nobody has woken is not lit in a
  // colour of its own. The cost is that a kept card and an unkept one sit
  // closer together than they ever do once she is awake.
  it('goes grey with her while she is dormant', async () => {
    useFacilityStore.setState({ emotion: 'dormant' });
    const view = await render(<Screen />);
    expect(StyleSheet.flatten(view.getByTestId('advice-counter').props.style).color).toBe(
      EMOTIONS.dormant.iris,
    );
    await view.unmount();
  });

  // A sort with nothing to lift is a control that cannot do anything, so it
  // says so rather than accepting a tap and looking broken.
  it('refuses the sort while nothing is kept', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));

    const sort = view.getByTestId('sort-favorites');
    expect(sort.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(sort);
    expect(sort.props.accessibilityState.selected).toBe(false);
    await view.unmount();
  });

  it('offers the sort as soon as a card is kept', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    await fireEvent.press(view.getByTestId('advice-row-3-star'));

    const sort = view.getByTestId('sort-favorites');
    expect(sort.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(sort);
    expect(view.getAllByTestId(/^advice-row-\d+$/)[0].props.testID).toBe('advice-row-3');
    await view.unmount();
  });

  it('withdraws the sort again when the last kept card is let go', async () => {
    useAdviceStore.setState({ hydrated: true, favorites: new Set([QUOTES[3]]) });
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    await fireEvent.press(view.getByTestId('sort-favorites'));
    expect(view.getAllByTestId(/^advice-row-\d+$/)[0].props.testID).toBe('advice-row-3');

    await fireEvent.press(view.getByTestId('advice-row-3-star'));

    const sort = view.getByTestId('sort-favorites');
    expect(sort.props.accessibilityState.disabled).toBe(true);
    expect(sort.props.accessibilityState.selected).toBe(false);
    expect(view.getAllByTestId(/^advice-row-\d+$/)[0].props.testID).toBe('advice-row-0');
    await view.unmount();
  });

  // The doorway rule: one exit, top-left, in the module's own ink.
  it('exits to the stage', async () => {
    const view = await render(<Screen />);
    await fireEvent.press(view.getByTestId('module-exit'));
    expect(useFacilityStore.getState().view).toBe('stage');
    await view.unmount();
  });

  it('sets its own labels in a face that has hangul', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<Screen />);
    const families = [
      view.getByText('V.E.R.A.'),
      view.getByTestId('advice-label'),
      view.getByTestId('advice-hint'),
    ].map((node) => StyleSheet.flatten(node.props.style).fontFamily);
    for (const family of families) expect(family).toBe('Pretendard-Medium');
    await view.unmount();
  });

  // The quotes are English whatever the interface is set to, so they keep the
  // face they were typeset in — the same rule the mono telemetry follows.
  it('leaves the English cards in their own face when the interface is Korean', async () => {
    useFacilityStore.setState({ lang: 'ko' });
    const view = await render(<Screen />);
    const quote = StyleSheet.flatten(view.getByTestId('advice-quote').props.style);
    expect(quote.fontFamily).toBe('InstrumentSerif_400Regular');
    await view.unmount();
  });
});

describe('the cabinet tile', () => {
  it('opens the room', async () => {
    const Tile = advice.Tile;
    const onPress = jest.fn();
    const view = await render(<Tile onPress={onPress} />);
    await fireEvent.press(view.getByTestId('tile-mod02'));
    expect(onPress).toHaveBeenCalled();
    await view.unmount();
  });
});
