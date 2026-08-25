import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { KEYS } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
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

  // She reasons from her record, so erasing changes her diction, not her verdict.
  it('leaves her conclusions standing', async () => {
    seed({
      confirmingClear: true,
      memory: { facts: [], verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 1 }], threads: [], pending: [] },
    });
    const view = await render(<LogScreen />);
    await fireEvent.press(view.getByText('ERASE ALL'));
    expect(useFacilityStore.getState().memory.verdicts).toHaveLength(2); // hers, plus the erasure verdict
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
