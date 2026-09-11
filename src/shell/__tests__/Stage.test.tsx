// src/shell/__tests__/Stage.test.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { act, fireEvent, render } from '@testing-library/react-native';
import { LONG_AFTER } from '../../core/conversation';
import { useFacilityStore } from '../../core/store';
import { ms, palette } from '../../core/theme';
import * as OpticModule from '../Optic';
import { SEND_LATCH_MS, Stage } from '../Stage';

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
      // Static text, not the animated ellipsis: the dots are the WAITING, and
      // by the time this shows she has already started arriving.
      expect(view.getByTestId('status').props.children).toBe('TRANSMITTING...');
      expect(view.queryByTestId('thinking')).toBeNull();
    });

    // Reversed on 2026-09-04. TRANSMITTING while she was only THINKING claimed
    // a transmission that had not started, and the dots moved up into this
    // strip — so they now carry the waiting, which is the state the design
    // never had a word for. The word means what it says again.
    it('says nothing while she is only thinking, and lets the dots carry it', async () => {
      awake({ line: '', shown: '', thinking: true });
      const view = await render(<Stage />);
      expect(view.queryByTestId('status')).toBeNull();
      expect(view.getByTestId('thinking')).toBeTruthy();
    });

    it('puts the dots in the strip, not under her last line', async () => {
      // A previous reply still on screen is exactly when the dots used to
      // appear beneath it and squeeze the body.
      awake({ line: 'You returned.', shown: 'You returned.', thinking: true });
      const view = await render(<Stage />);
      const strip = view.getByTestId('status-strip');
      const dots = view.getByTestId('thinking');
      const inStrip = (node: unknown): boolean =>
        node === dots || (Array.isArray((node as { children?: unknown[] })?.children)
          && (node as { children: unknown[] }).children.some(inStrip));
      expect(inStrip(strip)).toBe(true);
    });

    // `hasBody` counted `thinking` only because the dots used to live in the
    // body. With them in the strip, the first message of a session would open
    // an empty box and hold it there for the whole wait.
    it('collapses to the strip while she thinks with nothing yet to show', async () => {
      awake({ line: '', shown: '', thinking: true });
      const view = await render(<Stage />);
      expect(view.queryByTestId('her-line')).toBeNull();
      expect(view.getByTestId('thinking')).toBeTruthy();
    });

    it('keeps her last line up while she thinks about the next one', async () => {
      awake({ line: 'You returned.', shown: 'You returned.', thinking: true });
      const view = await render(<Stage />);
      expect(view.getByTestId('her-line')).toBeTruthy();
      expect(view.getByTestId('thinking')).toBeTruthy();
    });

    // The ellipsis and the live word are the same slot in the strip, not two
    // places: the dots used to be pushed to the far edge on a marginLeft auto
    // while the word sat against the label.
    it('puts the ellipsis exactly where the status word goes', async () => {
      const slotOf = (view: { getByTestId: (id: string) => unknown }, id: string) => {
        const strip = view.getByTestId('status-strip') as { children: unknown[] };
        return strip.children.indexOf(view.getByTestId(id));
      };

      awake({ line: 'You returned.', shown: 'You returned.', thinking: true });
      const waiting = await render(<Stage />);
      const dotsSlot = slotOf(waiting, 'thinking');
      // Both are pushed to the right edge of the strip, away from the label.
      expect(StyleSheet.flatten(waiting.getByTestId('thinking').props.style).marginLeft)
        .toBe('auto');
      await waiting.unmount();

      awake({ line: 'You returned.', shown: 'You ret', thinking: false });
      const speaking = await render(<Stage />);
      expect(slotOf(speaking, 'status')).toBe(dotsSlot);
      expect(StyleSheet.flatten(speaking.getByTestId('status').props.style).marginLeft)
        .toBe('auto');
      await speaking.unmount();
    });

    it('shows no dots once she has stopped thinking', async () => {
      awake({ line: 'You returned.', shown: 'You returned.', thinking: false });
      const view = await render(<Stage />);
      expect(view.queryByTestId('thinking')).toBeNull();
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

  // With the keyboard up the stage has three things worth the height — the
  // eye, her window and the box being typed into — and the cabinet handle is
  // not one of them. It cannot be reached while typing anyway.
  describe('with the keyboard up', () => {
    const keyboard = (isVisible: boolean) =>
      (useKeyboardState as jest.Mock).mockImplementation((selector?: (s: unknown) => unknown) => {
        const state = { isVisible, height: isVisible ? 300 : 0 };
        return selector ? selector(state) : state;
      });

    beforeEach(() => awake());
    afterEach(() => keyboard(false));

    it('hides the cabinet handle, and brings it back afterwards', async () => {
      keyboard(true);
      const typing = await render(<Stage />);
      expect(typing.queryByText('CABINET')).toBeNull();
      await typing.unmount();

      keyboard(false);
      const idle = await render(<Stage />);
      expect(idle.getByText('CABINET')).toBeTruthy();
      await idle.unmount();
    });

    // It sat flush on the keys for one commit. The handle is out of the tree
    // either way, so no amount of gap here can expose it — which leaves the
    // right gap as the one the stage already uses, rather than none.
    it('keeps the same gap under the box whether the keyboard is up or not', async () => {
      keyboard(true);
      const typing = await render(<Stage />);
      const lifted = StyleSheet.flatten(typing.getByTestId('input-row').props.style).marginBottom;
      await typing.unmount();

      keyboard(false);
      const idle = await render(<Stage />);
      const resting = StyleSheet.flatten(idle.getByTestId('input-row').props.style).marginBottom;
      await idle.unmount();

      expect(lifted).toBe(resting);
      expect(lifted).toBeGreaterThan(0);
    });

    // The box she is typed into must never be what disappears.
    it('keeps the input itself', async () => {
      keyboard(true);
      const view = await render(<Stage />);
      expect(view.getByPlaceholderText('say something to her')).toBeTruthy();
      await view.unmount();
    });
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
    const buzzed = () => (Haptics.impactAsync as jest.Mock).mock.calls.length;

    beforeEach(() => {
      spoken = jest.fn(async () => {});
      useFacilityStore.setState({ speak: spoken });
      (Haptics.impactAsync as jest.Mock).mockClear();
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

    // Both refusals used to be silent early returns inside send(), so the
    // button looked live, took the press and did nothing. It now says which
    // of the two states it is in before you touch it.
    it('goes inert on the two cases it would refuse', async () => {
      awake({ draft: '   ' });
      const empty = await render(<Stage />);
      expect(empty.getByTestId('send').props.accessibilityState.disabled).toBe(true);

      awake({ draft: 'again', thinking: true });
      const busy = await render(<Stage />);
      expect(busy.getByTestId('send').props.accessibilityState.disabled).toBe(true);

      awake({ draft: 'ready' });
      const live = await render(<Stage />);
      expect(live.getByTestId('send').props.accessibilityState.disabled).toBe(false);
    });

    // The buzz is for the line leaving, not for the button moving: it fires
    // only on a press that actually reaches her.
    it('buzzes when the line actually goes out', async () => {
      awake({ draft: 'ready' });
      const view = await render(<Stage />);
      await fireEvent.press(view.getByTestId('send'));
      expect(spoken).toHaveBeenCalled();
      expect(buzzed()).toBe(1);
      // Heavy, not Light: the light impact was confirmed on the phone as too
      // faint to notice at all.
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    });

    it('stays silent on an empty box and on a reply already in flight', async () => {
      awake({ draft: '   ' });
      const empty = await render(<Stage />);
      await fireEvent.press(empty.getByTestId('send'));

      awake({ draft: 'again', thinking: true });
      const busy = await render(<Stage />);
      await fireEvent.press(busy.getByTestId('send'));

      expect(spoken).not.toHaveBeenCalled();
      expect(buzzed()).toBe(0);
    });

    // A tap is 40-60ms of contact, which a held-only style can lose entirely.
    // The button holds its lit state past the release so a quick press is
    // still something you see.
    it('stays lit past the release, then settles', async () => {
      jest.useFakeTimers();
      try {
        awake({ draft: 'ready' });
        const view = await render(<Stage />);
        const lit = () =>
          StyleSheet.flatten(view.getByTestId('send').props.style).backgroundColor;

        expect(lit()).toBeUndefined();
        await fireEvent.press(view.getByTestId('send'));
        expect(lit()).toBe(palette.amberWash);

        await act(async () => {
          jest.advanceTimersByTime(SEND_LATCH_MS + 10);
        });
        expect(lit()).toBeUndefined();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // Poking the eye is the one input on the stage that isn't typed. It refuses
  // the same two cases SEND does: nothing to say to, and already replying.
  describe('the optic', () => {
    let spoken: jest.Mock;
    const buzzed = () => (Haptics.impactAsync as jest.Mock).mock.calls.length;

    beforeEach(() => {
      spoken = jest.fn(async () => {});
      useFacilityStore.setState({ speak: spoken });
      (Haptics.impactAsync as jest.Mock).mockClear();
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

    // Same rule as SEND: the buzz is for the poke landing, not for the touch
    // happening. Her eye takes a press whether or not she is in any state to
    // answer it, so this is the one that has to be gated on the outcome.
    it('buzzes when the poke reaches her', async () => {
      awake();
      const view = await render(<Stage />);
      await fireEvent.press(view.getByTestId('optic'));
      expect(buzzed()).toBe(1);
    });

    it('stays silent when she is dormant or already replying', async () => {
      awake({ apiKey: '', emotion: 'dormant' });
      const asleep = await render(<Stage />);
      await fireEvent.press(asleep.getByTestId('optic'));

      awake({ thinking: true });
      const busy = await render(<Stage />);
      await fireEvent.press(busy.getByTestId('optic'));

      expect(spoken).not.toHaveBeenCalled();
      expect(buzzed()).toBe(0);
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

// The rule is pure and tested in core/__tests__/conversation.test.ts. What can
// only be checked here is that the strip renders its answer — and that it does
// not render anything at all below the threshold, which is the whole of the
// promise that a short conversation looks exactly as it did before.
describe('the long-conversation mark', () => {
  const thread = (turns: number) =>
    Array.from({ length: turns }, (_, i) => ({ who: 'you' as const, text: `q${i}`, t: i }));

  it('is absent on a short thread', async () => {
    awake({ log: thread(LONG_AFTER - 1) });
    const view = await render(<Stage />);
    expect(view.queryByTestId('long-warning')).toBeNull();
    await view.unmount();
  });

  it('appears on the threshold, saying how long the thread is', async () => {
    awake({ log: thread(LONG_AFTER) });
    const view = await render(<Stage />);
    expect(view.getByTestId('long-warning').props.children).toBe(LONG_AFTER);
    await view.unmount();
  });

  // Red, and the app's own error red: this is the app talking about itself,
  // not a state of hers, and it must not be mistaken for one.
  it('is drawn in the app’s error red', async () => {
    awake({ log: thread(LONG_AFTER + 3) });
    const view = await render(<Stage />);

    const mark = view.getByTestId('long-warning');
    expect(mark.props.children).toBe(LONG_AFTER + 3);
    expect(StyleSheet.flatten(mark.props.style).color).toBe(palette.danger);
    await view.unmount();
  });

  // Her own replies must not push the thread over the line — a long thread is
  // one the subject made long.
  it('counts only what the subject said', async () => {
    awake({
      log: [...thread(LONG_AFTER - 1), ...Array.from({ length: 20 }, (_, i) => ({
        who: 'vera' as const, text: 'x', t: 1000 + i,
      }))],
    });
    const view = await render(<Stage />);
    expect(view.queryByTestId('long-warning')).toBeNull();
    await view.unmount();
  });
});
