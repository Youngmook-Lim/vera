import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { storage } from '../../../core/storage';
import { HorrorScreen, horror } from '..';
import { STORIES } from '../stories';
import { useHorrorStore } from '../store';

jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});

beforeEach(async () => {
  useFacilityStore.setState({ view: 'mod02', lang: 'en', emotion: 'calm' });
  await storage.clearAll();
  useHorrorStore.setState({ hydrated: true, favorites: new Set(), hidden: true });
});

describe('the card', () => {
  it('withholds the turn behind a redaction, and the hint says which tap you are on', async () => {
    const view = await render(<HorrorScreen />);
    expect(view.getByTestId('horror-setup')).toBeTruthy();
    expect(view.queryByTestId('horror-turn')).toBeNull();
    expect(view.getByTestId('horror-redaction')).toBeTruthy();
    expect(view.getByTestId('horror-hint').props.children).toBe('tap the card to reveal');
    await view.unmount();
  });

  it('turns the card on the first tap and deals on the second', async () => {
    const view = await render(<HorrorScreen />);
    const first = view.getByTestId('horror-setup').props.children;

    await fireEvent.press(view.getByTestId('horror-card'));
    expect(view.getByTestId('horror-turn')).toBeTruthy();
    expect(view.queryByTestId('horror-redaction')).toBeNull();
    expect(view.getByTestId('horror-hint').props.children).toBe('tap the card for another');
    // The first tap must not have dealt.
    expect(view.getByTestId('horror-setup').props.children).toBe(first);

    await fireEvent.press(view.getByTestId('horror-card'));
    expect(view.getByTestId('horror-setup').props.children).not.toBe(first);
    await view.unmount();
  });

  // A story you have already been shown the end of is not a story.
  it('re-hides the next card', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('horror-card'));
    await fireEvent.press(view.getByTestId('horror-card'));
    expect(view.queryByTestId('horror-turn')).toBeNull();
    expect(view.getByTestId('horror-redaction')).toBeTruthy();
    await view.unmount();
  });

  it('deals on the first tap when the room is not withholding', async () => {
    useHorrorStore.setState({ hidden: false });
    const view = await render(<HorrorScreen />);
    const first = view.getByTestId('horror-setup').props.children;
    expect(view.getByTestId('horror-turn')).toBeTruthy();

    await fireEvent.press(view.getByTestId('horror-card'));
    expect(view.getByTestId('horror-setup').props.children).not.toBe(first);
    expect(view.getByTestId('horror-turn')).toBeTruthy();
    await view.unmount();
  });

  it('shows the upvotes and the community, since no story carries an author', async () => {
    const view = await render(<HorrorScreen />);
    expect(view.getByTestId('horror-score').props.children).toMatch(
      /^▲ [\d.]+k? · r\/TwoSentenceHorror$/,
    );
    await view.unmount();
  });
});

describe('the withholding toggle', () => {
  it('is offered on the card and replaced by the sort on the list', async () => {
    const view = await render(<HorrorScreen />);
    expect(view.getByTestId('toggle-hidden')).toBeTruthy();
    expect(view.queryByTestId('sort-favorites')).toBeNull();

    await fireEvent.press(view.getByTestId('mode-list'));
    expect(view.queryByTestId('toggle-hidden')).toBeNull();
    expect(view.getByTestId('sort-favorites')).toBeTruthy();
    await view.unmount();
  });

  it('is kept, unlike the sort', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('toggle-hidden'));
    expect(useHorrorStore.getState().hidden).toBe(false);
    expect(view.getByTestId('horror-turn')).toBeTruthy();
    await view.unmount();
  });

  // Otherwise the control would read HIDDEN over a card showing its own ending.
  it('takes the sentence on screen with it when it is turned back on', async () => {
    useHorrorStore.setState({ hidden: false });
    const view = await render(<HorrorScreen />);
    expect(view.getByTestId('horror-turn')).toBeTruthy();

    await fireEvent.press(view.getByTestId('toggle-hidden'));
    expect(view.queryByTestId('horror-turn')).toBeNull();
    expect(view.getByTestId('horror-redaction')).toBeTruthy();
    await view.unmount();
  });
});

describe('the list', () => {
  it('always reads whole, whatever the card is doing', async () => {
    const view = await render(<HorrorScreen />);
    expect(useHorrorStore.getState().hidden).toBe(true);
    await fireEvent.press(view.getByTestId('mode-list'));

    expect(view.getByTestId('horror-row-0')).toBeTruthy();
    expect(view.getByText(STORIES[0].setup)).toBeTruthy();
    expect(view.getByText(STORIES[0].turn)).toBeTruthy();
    await view.unmount();
  });

  it('opens a story on the card, re-hidden', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    await fireEvent.press(view.getByTestId('horror-row-0'));

    expect(view.getByTestId('horror-setup').props.children).toBe(STORIES[0].setup);
    expect(view.queryByTestId('horror-turn')).toBeNull();
    await view.unmount();
  });
});

describe('keeping a story', () => {
  it('keys on both sentences, so a kept story survives a regenerated corpus', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('horror-star'));
    const kept = [...useHorrorStore.getState().favorites];
    expect(kept).toHaveLength(1);
    expect(kept[0]).toContain('\n');
    await view.unmount();
  });
});

describe('the cabinet tile', () => {
  it('opens the room', async () => {
    const Tile = horror.Tile;
    const onPress = jest.fn();
    const view = await render(<Tile onPress={onPress} />);
    await fireEvent.press(view.getByTestId('tile-mod02'));
    expect(onPress).toHaveBeenCalled();
    await view.unmount();
  });
});
