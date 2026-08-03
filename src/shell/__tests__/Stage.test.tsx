// src/shell/__tests__/Stage.test.tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { ms } from '../../core/theme';
import * as OpticModule from '../Optic';
import { Stage } from '../Stage';

// The send tests reach the store's speak(), which would otherwise reach the
// network. Nothing in this file is allowed to leave the process.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"calm","line":"Noted."}'),
}));

// The OS keystore has no jsdom implementation — an in-memory vault is enough.
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

const realSpeak = useFacilityStore.getState().speak;

const awake = (over = {}) =>
  useFacilityStore.setState({
    apiKey: 'sk-ant-api03-abcdefghijklmnop', emotion: 'calm', lang: 'en',
    line: '', shown: '', thinking: false, log: [], cabinetOpen: false, ...over,
  });

describe('Stage', () => {
  it('shows her emotion label in the reading language', async () => {
    awake({ emotion: 'suspicious' });
    const view = await render(<Stage />);
    expect(view.getByText('SUSPICIOUS')).toBeTruthy();

    awake({ emotion: 'suspicious', lang: 'ko' });
    const ko = await render(<Stage />);
    expect(ko.getByText('의심스러워요')).toBeTruthy();
  });

  it('sizes a short line loud and a long line small', async () => {
    awake({ shown: 'You returned.' });
    const short = await render(<Stage />);
    expect(short.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(30) }),
    );

    const long = Array.from({ length: 34 }, () => 'word').join(' ');
    awake({ shown: long });
    const wordy = await render(<Stage />);
    expect(wordy.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(15) }),
    );
  });

  it('hides the conversation pill until there is a transcript', async () => {
    awake({ log: [] });
    const empty = await render(<Stage />);
    expect(empty.queryByText('OPEN CONVERSATION')).toBeNull();

    awake({ log: [{ who: 'vera', text: 'Hm.', t: 1, emotion: 'calm' }] });
    const withLog = await render(<Stage />);
    expect(withLog.getByText('OPEN CONVERSATION')).toBeTruthy();
  });

  it('gives a dormant stage no input and no drawer', async () => {
    useFacilityStore.setState({ apiKey: '', emotion: 'dormant', log: [] });
    const view = await render(<Stage />);
    expect(view.queryByPlaceholderText('say something to her')).toBeNull();
    expect(view.queryByText('CABINET')).toBeNull();
  });

  // The stage is the home view, so its input is the app's primary one: SEND has
  // to reach her, and has to refuse the two cases it would silently drop.
  describe('send', () => {
    let spoken: jest.Mock;

    beforeEach(() => {
      spoken = jest.fn(async () => {});
      useFacilityStore.setState({ speak: spoken });
    });

    // Restored after the block, not after each test: the previous render is
    // still mounted until RTL's own cleanup runs, and writing to the store
    // under it would be a state update outside act().
    afterAll(() => {
      useFacilityStore.setState({ speak: realSpeak, draft: '' });
    });

    it('says what you typed, trimmed, and empties the box', async () => {
      awake({ draft: '  did you miss me  ' });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByText('SEND'));
      expect(spoken).toHaveBeenCalledWith('subject_spoke', 'did you miss me');
      expect(useFacilityStore.getState().draft).toBe('');
    });

    it('refuses an empty box', async () => {
      awake({ draft: '   ' });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByText('SEND'));
      expect(spoken).not.toHaveBeenCalled();
    });

    it('refuses to interrupt a reply already in flight', async () => {
      awake({ draft: 'again', thinking: true });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByText('SEND'));
      expect(spoken).not.toHaveBeenCalled();
      expect(useFacilityStore.getState().draft).toBe('again');
    });
  });

  // Poking the eye is the one input on the stage that isn't typed. It refuses
  // the same two cases SEND does: nothing to say to, and already replying.
  describe('the optic', () => {
    let spoken: jest.Mock;

    beforeEach(() => {
      spoken = jest.fn(async () => {});
      useFacilityStore.setState({ speak: spoken });
    });

    afterAll(() => {
      useFacilityStore.setState({ speak: realSpeak, draft: '' });
    });

    it('tells her when you tap her', async () => {
      awake();
      const view = await render(<Stage />);
      await fireEvent.press(view.getByTestId('optic'));
      expect(spoken).toHaveBeenCalledWith('subject_tapped_your_optic');
    });

    it('refuses to interrupt a reply already in flight', async () => {
      awake({ thinking: true });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByTestId('optic'));
      expect(spoken).not.toHaveBeenCalled();
    });

    it('does nothing while she is dormant', async () => {
      awake({ apiKey: '', emotion: 'dormant' });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByTestId('optic'));
      expect(spoken).not.toHaveBeenCalled();
    });

    // The eye is `waking`'s only consumer, and the bloom itself is drawn in
    // Skia — mocked to no-ops here, so it cannot be observed in the tree. The
    // prop handover is the part that can be pinned, and it is the part that
    // was missing: the store set `waking` and nothing read it.
    it('hands the wake bloom down to the eye', async () => {
      const spy = jest.spyOn(OpticModule, 'Optic');
      try {
        awake({ waking: true });
        await render(<Stage />);
        expect(spy.mock.calls[0][0]).toEqual(expect.objectContaining({ waking: true }));
      } finally {
        spy.mockRestore();
      }
    });
  });
});
