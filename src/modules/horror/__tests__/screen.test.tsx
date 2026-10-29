import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../../core/store';
import { storage } from '../../../core/storage';
import { HorrorScreen, horror } from '..';
import { STORIES } from '../stories';
import { newDeck } from '../../deck';
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
  useFacilityStore.setState({ view: 'mod02', lang: 'en', emotion: 'calm', pendingStory: null });
  await storage.clearAll();
  // The deck outlives a render now, so it outlives a TEST too unless it is
  // put back.
  useHorrorStore.setState({
    hydrated: true, favorites: new Set(), hidden: true, deck: newDeck(STORIES.length),
  });
});

// The counter had no test at all until 2026-09-22, which is how the two rooms
// came to disagree about what it means: the advice room reported how far
// through the shuffle you were while this one reported the story's own number.
// This room was right and the advice room moved. Pinned in both now.
// The once-per-pass guarantee, at the SCREEN. deck.test.ts pins it for the
// pure module; this is the room actually walking the shuffled order.
describe('dealing through the shelf', () => {
  it('walks the shuffle in order, dealing no story twice', async () => {
    // Withholding off, so one tap is one deal rather than a reveal.
    useHorrorStore.setState({ hidden: false });
    const view = await render(<HorrorScreen />);
    const order = useHorrorStore.getState().deck.order;

    const seen = [view.getByTestId('horror-setup').props.children];
    for (let i = 1; i < 8; i++) {
      await fireEvent.press(view.getByTestId('horror-card'));
      seen.push(view.getByTestId('horror-setup').props.children);
    }

    expect(seen).toEqual(order.slice(0, 8).map((i) => STORIES[i].setup));
    expect(new Set(seen).size).toBe(8);
    await view.unmount();
  });
});

// A pass you did not finish is worth keeping (2026-09-22).
describe('leaving the room', () => {
  it('does not reshuffle the shelf', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('horror-card'));
    await fireEvent.press(view.getByTestId('horror-card'));
    const left = useHorrorStore.getState().deck;
    expect(left.at).toBe(1);
    await view.unmount();

    const again = await render(<HorrorScreen />);

    expect(useHorrorStore.getState().deck.order).toEqual(left.order);
    expect(useHorrorStore.getState().deck.at).toBe(1);
    expect(again.getByTestId('horror-setup').props.children)
      .toBe(STORIES[left.order[1]].setup);
    await again.unmount();
  });
});

describe('the counter', () => {
  const counterFor = (setup: string) =>
    `${String(STORIES.findIndex((st) => st.setup === setup) + 1).padStart(4, '0')} / ${STORIES.length}`;

  it('numbers a story by where it lives, not by how far through the deck you are', async () => {
    const view = await render(<HorrorScreen />);
    const first = view.getByTestId('horror-setup').props.children as string;

    expect(view.getByTestId('horror-counter').props.children).toBe(counterFor(first));

    await fireEvent.press(view.getByTestId('horror-card'));
    await fireEvent.press(view.getByTestId('horror-card'));

    const second = view.getByTestId('horror-setup').props.children as string;
    expect(second).not.toBe(first);
    expect(view.getByTestId('horror-counter').props.children).toBe(counterFor(second));

    await view.unmount();
  });

  // Tap the row numbered 0004 and the card says 0004.
  it('carries the list row’s own numeral onto the card', async () => {
    const view = await render(<HorrorScreen />);
    await fireEvent.press(view.getByTestId('mode-list'));
    await fireEvent.press(view.getByTestId('horror-row-3'));

    expect(view.getByTestId('horror-counter').props.children)
      .toBe(`0004 / ${STORIES.length}`);

    await view.unmount();
  });
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

describe('a tapped notification', () => {
  // The notification withheld the turn and the tap was the asking. Making you
  // tap the card again for the thing you already asked for would be coy.
  it('opens the story it named, already turned over', async () => {
    const view = await render(<HorrorScreen />);
    expect(useHorrorStore.getState().hidden).toBe(true);

    await act(async () => {
      useFacilityStore.getState().openStory(12);
    });

    expect(view.getByTestId('horror-setup').props.children).toBe(STORIES[12].setup);
    expect(view.getByTestId('horror-turn').props.children).toBe(STORIES[12].turn);
    expect(view.queryByTestId('horror-redaction')).toBeNull();
    await view.unmount();
  });

  // Taken once: walking back into the room later deals an ordinary card, and a
  // pending index surviving would re-deal a story tapped hours ago.
  it('clears the pending story once the room has taken it', async () => {
    const view = await render(<HorrorScreen />);
    await act(async () => {
      useFacilityStore.getState().openStory(12);
    });
    expect(useFacilityStore.getState().pendingStory).toBeNull();
    await view.unmount();
  });

  it('leaves the withholding preference alone for the next card', async () => {
    const view = await render(<HorrorScreen />);
    await act(async () => {
      useFacilityStore.getState().openStory(12);
    });
    expect(useHorrorStore.getState().hidden).toBe(true);

    await fireEvent.press(view.getByTestId('horror-card'));
    expect(view.queryByTestId('horror-turn')).toBeNull();
    expect(view.getByTestId('horror-redaction')).toBeTruthy();
    await view.unmount();
  });
});

// A room paints full bleed, under Android's status bar and gesture bar, so it
// has to pad itself back off them. Forgetting it put this room's header
// underneath the system bar on the phone while the advice room sat clear.
describe('the safe area', () => {
  it('pads the room off the system bars, top and bottom', async () => {
    const view = await render(<HorrorScreen />);
    const style = view.getByTestId('view-mod02').props.style as Record<string, unknown>[];
    const applied = Object.assign({}, ...(Array.isArray(style) ? style : [style]));
    expect(applied).toHaveProperty('paddingTop');
    expect(applied).toHaveProperty('paddingBottom');
    await view.unmount();
  });
});

// Going back (2026-10-29): a swipe right on the card, reached here through its
// screen-reader action. You only ever deal past a story after turning it, so
// the one you return to comes back turned.
describe('going back', () => {
  const back = (view: Awaited<ReturnType<typeof render>>) =>
    fireEvent(view.getByTestId('horror-card'), 'accessibilityAction', { nativeEvent: { actionName: 'back' } });
  const setupOn = (view: Awaited<ReturnType<typeof render>>) =>
    view.getByTestId('horror-setup').props.children as string;

  it('returns to the story before, with its ending showing', async () => {
    const view = await render(<HorrorScreen />);
    const first = setupOn(view);
    await fireEvent.press(view.getByTestId('horror-card')); // turn it
    await fireEvent.press(view.getByTestId('horror-card')); // deal the next
    expect(setupOn(view)).not.toBe(first);
    expect(view.queryByTestId('horror-turn')).toBeNull();
    await back(view);
    expect(setupOn(view)).toBe(first);
    expect(view.getByTestId('horror-turn')).toBeTruthy();
    await view.unmount();
  });

  // Nothing to go back to, so nothing changes — not even the redaction.
  it('stays put, still withheld, at the first story of a pass', async () => {
    const view = await render(<HorrorScreen />);
    const first = setupOn(view);
    await back(view);
    expect(setupOn(view)).toBe(first);
    expect(view.queryByTestId('horror-turn')).toBeNull();
    await view.unmount();
  });

  it('offers the way back to a screen reader by name', async () => {
    const view = await render(<HorrorScreen />);
    const actions = view.getByTestId('horror-card').props.accessibilityActions;
    expect(actions).toEqual([{ name: 'back', label: 'previous story' }]);
    await view.unmount();
  });
});
