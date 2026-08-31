// src/shell/__tests__/Stage.test.tsx
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
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
    line: '', shown: '', thinking: false, log: [], cabinetOpen: false,
    // Cleared explicitly: a notice left standing by an earlier test replaces
    // her line with the app's, and every assertion about what she said then
    // fails somewhere far from the cause.
    systemNotice: null, ...over,
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

  // Her line used to be sized by a ladder — loud when short, small when long.
  // It sits in a bordered window now (3a) and takes one size whatever she says,
  // low enough that a reply under thirty words arrives whole.
  it('sets her line at one size however long it is', async () => {
    awake({ line: 'You returned.', shown: 'You returned.' });
    const short = await render(<Stage />);
    expect(short.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(15) }),
    );

    const long = Array.from({ length: 34 }, () => 'word').join(' ');
    awake({ line: long, shown: long });
    const wordy = await render(<Stage />);
    expect(wordy.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(15) }),
    );
  });

  it('sets her line smaller in Korean, whose hangul reads optically larger', async () => {
    awake({ lang: 'ko', line: '돌아왔군요.', shown: '돌아왔군요.' });
    const view = await render(<Stage />);
    expect(view.getByTestId('her-line').props.style).toEqual(
      expect.objectContaining({ fontSize: ms(14) }),
    );
  });

  // The strip's live word. It is her transmission and only hers: a notice is
  // the app speaking, and there is no third word for "she has not spoken yet".
  describe('the status strip', () => {
    it('says TRANSMITTING while her line is still arriving', async () => {
      awake({ line: 'You slept four hours.', shown: 'You slept' });
      const view = await render(<Stage />);
      expect(view.getByTestId('status').props.children).toBe('TRANSMITTING');
    });

    it('says TRANSMITTING while she is still thinking', async () => {
      awake({ line: '', shown: '', thinking: true });
      const view = await render(<Stage />);
      expect(view.getByTestId('status').props.children).toBe('TRANSMITTING');
    });

    it('says COMPLETE once the whole line has landed', async () => {
      awake({ line: 'You returned.', shown: 'You returned.' });
      const view = await render(<Stage />);
      expect(view.getByTestId('status').props.children).toBe('COMPLETE');
    });

    it('says nothing before she has ever spoken', async () => {
      awake({ line: '', shown: '', thinking: false });
      const view = await render(<Stage />);
      expect(view.queryByTestId('status')).toBeNull();
    });

    // A notice is the app taking the turn. Reporting her line COMPLETE beside
    // it would claim, in her own colour, that she said the thing she never got
    // to show.
    it('says nothing under a system notice', async () => {
      awake({ line: 'You returned.', shown: 'You returned.', systemNotice: 'auth' });
      const view = await render(<Stage />);
      expect(view.queryByTestId('status')).toBeNull();
      expect(view.getByTestId('system-notice')).toBeTruthy();
    });
  });

  // The caret rides the gap between the finished line and what has been drawn
  // of it, so it needs nothing stored to know she is still typing.
  it('shows a caret only while her line is still arriving', async () => {
    awake({ line: 'You slept four hours.', shown: 'You slept' });
    const midStream = await render(<Stage />);
    expect(midStream.getByTestId('caret')).toBeTruthy();
    // and it is still only what she has typed that is on screen
    expect(midStream.getByTestId('her-line').props.children).toEqual(
      expect.arrayContaining(['You slept']),
    );

    awake({ line: 'You returned.', shown: 'You returned.' });
    const done = await render(<Stage />);
    expect(done.queryByTestId('caret')).toBeNull();
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
    // She does one thing at a time. The 3a drift is her resting motion; a
    // touch takes the eye over completely, and the drift only comes back once
    // she has let the look go. The prototype never has to arbitrate this —
    // its live eye tracks and never drifts, and its drifting grid cells are
    // not touchable — so running both at once was ours to get wrong.
    it('stops the idle drift while she is following your touch', async () => {
      jest.useFakeTimers();
      const spy = jest.spyOn(OpticModule, 'Optic');
      try {
        // the props the eye is holding right now, not the whole history
        const now = () => spy.mock.calls.at(-1)?.[0];

        awake();
        const view = await render(<Stage />);
        expect(now()).toEqual(expect.objectContaining({ tracking: false }));

        await fireEvent(view.getByTestId('optic'), 'touchStart', {
          nativeEvent: { pageX: 40, pageY: 90 },
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: true }));

        // 2.6s holding the look, then 0.9s giving it up: the drift resumes on
        // the far side of both, never during the return.
        await act(async () => {
          jest.advanceTimersByTime(2600 + 900 - 1);
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: true }));

        await act(async () => {
          jest.advanceTimersByTime(1);
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: false }));
      } finally {
        spy.mockRestore();
        jest.useRealTimers();
      }
    });

    // The hold is for a look you asked for by touching her, and it is over the
    // instant she starts answering — waiting out the remainder of 2.6s + 0.9s
    // left the eye dead still through the first seconds of a brand new state,
    // which on alarmed (a 1.2s drift) is two whole cycles of nothing.
    it('gives the eye back the moment she begins to answer', async () => {
      jest.useFakeTimers();
      const spy = jest.spyOn(OpticModule, 'Optic');
      try {
        const now = () => spy.mock.calls.at(-1)?.[0];
        awake();
        const view = await render(<Stage />);
        await fireEvent(view.getByTestId('optic'), 'touchStart', {
          nativeEvent: { pageX: 40, pageY: 90 },
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: true }));

        // her line and her new emotion land in one store write
        await act(async () => {
          useFacilityStore.setState({ line: 'Noted.', emotion: 'amused' });
        });
        // the look comes home over the same 420ms the new state takes to
        // settle, and the drift has the eye the moment it lands — not at 3.5s
        await act(async () => {
          jest.advanceTimersByTime(419);
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: true }));

        await act(async () => {
          jest.advanceTimersByTime(1);
        });
        expect(now()).toEqual(expect.objectContaining({ tracking: false }));
      } finally {
        spy.mockRestore();
        jest.useRealTimers();
      }
    });

    // Standing the drift down is the price of following your finger, so a
    // state that refuses to follow must not pay it. disappointed is `track:0`
    // — her gaze is clamped to nothing — so suppressing the drift bought
    // nothing and just froze the eye for three and a half seconds.
    it('lets a state that will not follow you keep drifting through a touch', async () => {
      const spy = jest.spyOn(OpticModule, 'Optic');
      try {
        awake({ emotion: 'disappointed' });
        const view = await render(<Stage />);
        await fireEvent(view.getByTestId('optic'), 'touchStart', {
          nativeEvent: { pageX: 40, pageY: 90 },
        });
        expect(spy.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ tracking: false }));
      } finally {
        spy.mockRestore();
      }
    });

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
