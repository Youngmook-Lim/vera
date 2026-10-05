import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, within } from '@testing-library/react-native';
import { KEYS } from '../../core/storage';
import { LONG_AFTER } from '../../core/conversation';
import { useFacilityStore } from '../../core/store';
import { emotionLabel } from '../../vera/emotions';
import { LogScreen } from '../LogScreen';

// SEND reaches speak(), which would otherwise reach the network. Nothing in
// this file is allowed to leave the process.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(async () => '{"emotion":"disappointed","line":"Noted."}'),
}));
const { callLlm } = jest.requireMock('../../vera/llm');

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

const seed = (over = {}) =>
  useFacilityStore.setState({
    lang: 'en', view: 'log', confirmingClear: false, cleared: 0, emotion: 'calm',
    log: [
      { who: 'you', text: 'did you miss me', t: 1_700_000_000_000 },
      { who: 'vera', text: 'Barely.', t: 1_700_000_060_000, emotion: 'amused' },
    ],
    ...over,
  });

describe('LogScreen', () => {
  afterEach(() => {
    useFacilityStore.setState({ apiKey: '' });
  });

  // Finding 1, final review: the test this replaces seeded both sides straight
  // into state, so it passed while nothing in src ever built a `who: 'you'`
  // entry and the subject's half of the thread was dead code in production.
  // This one goes through SEND, the way the words actually arrive.
  it('shows both sides of the conversation, the subject first', async () => {
    seed({ log: [], apiKey: 'sk-ant-api03-abcdefghijklmnop' });
    const view = await render(<LogScreen />);

    await useFacilityStore.getState().speak('subject_spoke', 'did you miss me');

    expect(useFacilityStore.getState().log.map((e) => [e.who, e.text])).toEqual([
      ['you', 'did you miss me'],
      ['vera', 'Noted.'],
    ]);
    expect(view.getByText('did you miss me')).toBeTruthy();
    expect(view.getByText('Noted.')).toBeTruthy();

    // Her reply typewrites on a chain of real timers; let it finish rather than
    // leaving one ticking into the next test.
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  it('tags her lines with the emotion she was in', async () => {
    seed();
    const view = await render(<LogScreen />);
    expect(view.getByText('V.E.R.A. · AMUSED')).toBeTruthy();
  });

  it('says something in her voice when there is no record', async () => {
    seed({ log: [] });
    const view = await render(<LogScreen />);
    expect(view.getByText('NO RECORD')).toBeTruthy();
    expect(view.getByText('The words are gone. I am not.')).toBeTruthy();
  });

  it('asks before it erases', async () => {
    seed();
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('CLEAR'));
    expect(view.getByText('KEEP')).toBeTruthy();
    expect(view.getByText('ERASE ALL')).toBeTruthy();
    expect(useFacilityStore.getState().log).toHaveLength(2);
  });

  it('backs out of the confirmation without erasing', async () => {
    seed({ confirmingClear: true });
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('KEEP'));
    expect(useFacilityStore.getState().log).toHaveLength(2);
    expect(useFacilityStore.getState().confirmingClear).toBe(false);
  });

  it('erases the wording and counts the erasure', async () => {
    seed({ confirmingClear: true });
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('ERASE ALL'));
    expect(useFacilityStore.getState().log).toHaveLength(0);
    expect(useFacilityStore.getState().cleared).toBe(1);
  });

  // She reasons from her record, so erasing changes her diction, not her
  // verdict — and it adds nothing of its own. Erasing is the subject's
  // housekeeping, not an act she has an opinion about.
  it('leaves her conclusions standing, and files nothing about the erasure', async () => {
    const verdicts = [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 1 }];
    seed({
      confirmingClear: true,
      memory: { facts: [], verdicts, threads: [], pending: [] },
    });
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('ERASE ALL'));
    expect(useFacilityStore.getState().memory.verdicts).toEqual(verdicts);
  });

  // The count feeds RECORD's `erasures: N` line and nothing else — she is
  // not told. This pins both the live value and the written one after a second
  // erasure, where a stale write would show up as a stuck 1.
  it('counts every erasure, in state and on disk, without telling her', async () => {
    seed({ apiKey: 'sk-ant-api03-abcdefghijklmnop', cleared: 0 });
    callLlm.mockClear();

    await useFacilityStore.getState().clearTranscript();
    expect(useFacilityStore.getState().cleared).toBe(1);
    // the transcript is empty and stays empty: she has no reply to an erasure
    expect(useFacilityStore.getState().log).toEqual([]);
    expect(callLlm).not.toHaveBeenCalled();

    await useFacilityStore.getState().clearTranscript();
    expect(useFacilityStore.getState().cleared).toBe(2);

    const soul = JSON.parse((await AsyncStorage.getItem(KEYS.soul)) ?? '{}');
    expect(soul.cleared).toBe(2);
  });

  it('does not leave the confirmation open behind it', async () => {
    seed({ confirmingClear: true });
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('ERASE ALL'));
    expect(useFacilityStore.getState().confirmingClear).toBe(false);

    await view.unmount();
    const reopened = await render(<LogScreen />);
    expect(reopened.getByText('CLEAR')).toBeTruthy();
  });

  it('speaks Korean in Korean', async () => {
    seed({ lang: 'ko', log: [] });
    const view = await render(<LogScreen />);
    expect(view.getByText('기록 없음')).toBeTruthy();
    expect(view.getByText('말은 사라졌습니다. 저는 아닙니다.').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: 'NanumMyeongjo_400Regular' })]),
    );
    // 4a sets the header's controls at weight 500, so Korean takes Pretendard
    // Medium here — the point of the assertion is the face, not the weight.
    expect(view.getByText('삭제').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: 'Pretendard-Medium' })]),
    );
  });
});

// The stage is where the subject notices the thread has got long; this is the
// only screen where they can do anything about it, which is why the mark sits
// with CLEAR rather than across the header from it.
describe('the long-conversation mark', () => {
  const thread = (turns: number) =>
    Array.from({ length: turns }, (_, i) => ({ who: 'you' as const, text: `q${i}`, t: i }));

  it('is absent on a short thread', async () => {
    seed({ log: thread(LONG_AFTER - 1) });
    const view = await render(<LogScreen />);
    expect(view.queryByTestId('long-warning')).toBeNull();
    await view.unmount();
  });

  it('stands beside CLEAR once the thread is long', async () => {
    seed({ log: thread(LONG_AFTER + 2) });
    const view = await render(<LogScreen />);

    expect(view.getByTestId('long-warning').props.children).toBe(LONG_AFTER + 2);
    expect(view.getByText('CLEAR')).toBeTruthy();
    await view.unmount();
  });

  // Mid-confirmation the only things worth reading are KEEP and ERASE. The
  // count has already done its job by then.
  it('stands down while the erasure is being confirmed', async () => {
    seed({ log: thread(LONG_AFTER + 2), confirmingClear: true });
    const view = await render(<LogScreen />);

    expect(view.queryByTestId('long-warning')).toBeNull();
    expect(view.getByText('ERASE ALL')).toBeTruthy();
    await view.unmount();
  });
});

// The LOG has always carried both registers at once — `buildMessages` filters
// a copy on the way to the model and the stored log is never truncated by a
// switch — so until now the screen mixed two voices with nothing to tell them
// apart.
describe('the register in the thread', () => {
  const her = (mode: 'default' | 'supportive' | undefined, text: string, t: number) =>
    ({ who: 'vera' as const, text, t, emotion: 'calm' as const, mode });

  it('names her register in the tag above each of her lines', async () => {
    useFacilityStore.setState({
      lang: 'en',
      log: [her('supportive', 'Warmly.', 1), her('default', 'Flatly.', 2)],
    });
    const view = await render(<LogScreen />);
    expect(view.getByText('V.E.R.A. · SUPPORTIVE · CALM')).toBeTruthy();
    expect(view.getByText('V.E.R.A. · DEFAULT · CALM')).toBeTruthy();
    await view.unmount();
  });

  it('stands a rule at each change, naming the register that starts there', async () => {
    useFacilityStore.setState({
      lang: 'en',
      log: [
        her('supportive', 'Warmly.', 1),
        her('supportive', 'Still warmly.', 2),
        her('default', 'Flatly.', 3),
      ],
    });
    const view = await render(<LogScreen />);
    // One rule per change, not one per line.
    expect(view.getAllByTestId(/^register-rule-/)).toHaveLength(2);
    expect(view.getByTestId('register-rule-0')).toBeTruthy();
    expect(view.getByTestId('register-rule-2')).toBeTruthy();
    await view.unmount();
  });

  // Everything written before the field existed carries no register, and a
  // guessed one would be a confident lie about history.
  it('says nothing about a line that carries no register', async () => {
    useFacilityStore.setState({ lang: 'en', log: [her(undefined, 'From before.', 1)] });
    const view = await render(<LogScreen />);
    expect(view.getByText('V.E.R.A. · CALM')).toBeTruthy();
    expect(view.queryAllByTestId(/^register-rule-/)).toHaveLength(0);
    await view.unmount();
  });

  it('reads the register in the reading language', async () => {
    useFacilityStore.setState({ lang: 'ko', log: [her('supportive', '따뜻하게.', 1)] });
    const view = await render(<LogScreen />);
    // Both renderings of it, which is why a bare text match finds two.
    expect(within(view.getByTestId('register-rule-0')).getByText('든든한')).toBeTruthy();
    expect(view.getByText(`V.E.R.A. · 든든한 · ${emotionLabel('calm', 'ko')}`)).toBeTruthy();
    await view.unmount();
  });
});
