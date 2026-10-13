import { KEYS, storage } from '../storage';
import { useFacilityStore } from '../store';
import { MODES } from '../../vera/modes/registry';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'en' }]) }));
jest.mock('../../vera/llm', () => ({ ...jest.requireActual('../../vera/llm'), callLlm: jest.fn() }));
const { callLlm } = jest.requireMock('../../vera/llm');
jest.mock('../../vera/transmissionsNotify', () => ({
  syncTransmissions: jest.fn(async () => true),
  requestTransmissions: jest.fn(async () => true),
  transmissionPermission: jest.fn(async () => 'granted'),
}));
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => { vault.set(k, v); }),
    deleteItemAsync: jest.fn(async (k: string) => { vault.delete(k); }),
  };
});
jest.mock('../voice', () => ({
  VOICE_TIMEOUT_MS: 8000,
  prepareVoice: jest.fn(),
  playVoice: jest.fn(),
  stopVoice: jest.fn(),
}));
const { prepareVoice, playVoice, stopVoice } = jest.requireMock('../voice');

const OPENROUTER = 'sk-or-v1-0123456789abcdef0123456789abcdef';
const LINE = 'Barely.'; // 7 characters
const deferred = () => {
  let resolve!: (v: unknown) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useFacilityStore.setState({
    apiKey: OPENROUTER, emotion: 'calm', line: 'Before.', shown: 'Before.', thinking: false,
    log: [], lang: 'en', mode: 'default', voice: true, systemNotice: null, lastPrompt: null,
  });
  callLlm.mockResolvedValue(`{"emotion":"amused","line":"${LINE}"}`);
});
afterEach(() => jest.useRealTimers());

describe('her text waits for her voice', () => {
  it('holds the old line and the dots until the voice is ready, then speaks and draws together', async () => {
    const voice = deferred();
    prepareVoice.mockReturnValueOnce(voice.promise);
    const pending = useFacilityStore.getState().speak('subject_spoke', 'hi');
    await jest.advanceTimersByTimeAsync(0);

    expect(prepareVoice).toHaveBeenCalledWith(LINE, 'OPENROUTER', OPENROUTER, MODES.default.voiceDirection);
    expect(useFacilityStore.getState().line).toBe('Before.');
    expect(useFacilityStore.getState().thinking).toBe(true);

    voice.resolve({ uri: 'u', durationMs: 7 * 50, cached: false, took: 900 });
    await pending;
    expect(playVoice).toHaveBeenCalledTimes(1);
    expect(useFacilityStore.getState().line).toBe(LINE);

    jest.advanceTimersByTime(49);
    expect(useFacilityStore.getState().shown).toBe('');
    jest.advanceTimersByTime(1);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ took: 900 });
  });

  it('shows the dots on an authored line while its voice is made, and only then', async () => {
    const voice = deferred();
    prepareVoice.mockReturnValueOnce(voice.promise);
    const pending = useFacilityStore.getState().speak('subject_tapped_your_optic');
    await jest.advanceTimersByTimeAsync(0);
    expect(useFacilityStore.getState().thinking).toBe(true);
    voice.resolve({ uri: 'u', durationMs: 1000, cached: false, took: 900 });
    await pending;
    expect(useFacilityStore.getState().thinking).toBe(false);
  });

  it('voices her authored lines too, and records nothing for them', async () => {
    prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 1000, cached: true, took: 1 });
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    expect(prepareVoice).toHaveBeenCalledTimes(1);
    expect(playVoice).toHaveBeenCalledTimes(1);
    expect(useFacilityStore.getState().thinking).toBe(false);
    expect(useFacilityStore.getState().lastPrompt).toBeNull();
  });

  it('falls back to the silent 16ms typewriter when the voice fails', async () => {
    prepareVoice.mockRejectedValueOnce(new Error('http 402: Insufficient credits'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(playVoice).not.toHaveBeenCalled();
    jest.advanceTimersByTime(16);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ failure: 'http 402: Insufficient credits' });
  });

  it('records a line said from the cache as cached', async () => {
    prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 350, cached: true, took: 2 });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(useFacilityStore.getState().lastPrompt?.voice).toEqual({ cached: true });
  });
});

describe('when she does not speak', () => {
  it('is exactly today\'s behaviour with the voice off', async () => {
    useFacilityStore.setState({ voice: false });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(prepareVoice).not.toHaveBeenCalled();
    expect(playVoice).not.toHaveBeenCalled();
    jest.advanceTimersByTime(16);
    expect(useFacilityStore.getState().shown).toBe('B');
    expect(useFacilityStore.getState().lastPrompt?.voice).toBeUndefined();
  });

  it('says nothing aloud when the app speaks instead of her', async () => {
    const { AuthError } = jest.requireActual('../../vera/llm');
    callLlm.mockRejectedValueOnce(new AuthError('http 401: invalid key'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(useFacilityStore.getState().systemNotice).toBe('auth');
    expect(prepareVoice).not.toHaveBeenCalled();
    expect(playVoice).not.toHaveBeenCalled();
  });

  it('asks for nothing on a key that cannot speak', async () => {
    useFacilityStore.setState({ apiKey: 'sk-ant-api03-abcdefghijklmnop' });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(prepareVoice).not.toHaveBeenCalled();
  });

  // Review Focus 5.
  it('plays nothing if the voice was switched off while it was being made', async () => {
    const voice = deferred();
    prepareVoice.mockReturnValueOnce(voice.promise);
    const pending = useFacilityStore.getState().speak('subject_spoke', 'hi');
    await jest.advanceTimersByTimeAsync(0);
    await useFacilityStore.getState().setVoice(false);
    voice.resolve({ uri: 'u', durationMs: 350, cached: false, took: 1 });
    await pending;
    expect(playVoice).not.toHaveBeenCalled();
  });
});

describe('interruptions', () => {
  // Review Focus 4.
  it('stops the line she is saying before the next one starts', async () => {
    prepareVoice.mockResolvedValue({ uri: 'u', durationMs: 350, cached: true, took: 1 });
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    const before = stopVoice.mock.invocationCallOrder.at(-1)!;
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    const stopped = stopVoice.mock.invocationCallOrder.filter((n: number) => n > before);
    const played = playVoice.mock.invocationCallOrder.at(-1)!;
    expect(stopped.length).toBeGreaterThan(0);
    expect(stopped[0]).toBeLessThan(played);
  });

  it('cuts her off when the voice is switched off', async () => {
    await useFacilityStore.getState().setVoice(false);
    expect(stopVoice).toHaveBeenCalled();
  });
});

// Review Focus 3.
it('voices Korean exactly as she said it', async () => {
  useFacilityStore.setState({ lang: 'ko' });
  callLlm.mockResolvedValueOnce('{"emotion":"calm","line":"기록했어요."}');
  prepareVoice.mockResolvedValueOnce({ uri: 'u', durationMs: 500, cached: false, took: 1 });
  await useFacilityStore.getState().speak('subject_spoke', '안녕');
  expect(prepareVoice.mock.calls[0][0]).toBe('기록했어요.');
});

describe('the setting', () => {
  it('starts off, before anything is read from disk', () => {
    expect(useFacilityStore.getInitialState().voice).toBe(false);
  });

  it('is off for a blob that never had it, and survives a restart once on', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ visits: 1, day: new Date().toDateString(), lastOpen: Date.now(), lang: 'en', cleared: 0 }));
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().voice).toBe(false);

    await useFacilityStore.getState().setVoice(true);
    expect(JSON.parse((await storage.get(KEYS.soul))!).voice).toBe(true);
  });

  it('is never something she is told', async () => {
    const before = useFacilityStore.getState();
    await useFacilityStore.getState().setVoice(false);
    const after = useFacilityStore.getState();
    expect(after.log).toBe(before.log);
    expect(after.line).toBe(before.line);
    expect(after.systemNotice).toBe(before.systemNotice);
    expect(after.lastPrompt).toBe(before.lastPrompt);
  });
});
