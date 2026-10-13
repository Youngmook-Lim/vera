import { createAudioPlayer } from 'expo-audio';
import { toS16LE } from '../../vera/voice/pcm';
import type { BytesFetch } from '../../vera/voice/tts';
import { CACHE_CAP, VOICE_TIMEOUT_MS, cacheKey, playVoice, prepareVoice, stopVoice } from '../voice';

const disk: Map<string, { bytes: Uint8Array; at: number }> = jest.requireMock('expo-file-system').__disk;
const player = createAudioPlayer as unknown as jest.Mock;

const RATE = 24000;
const PCM = toS16LE(Float32Array.from({ length: RATE / 2 }, (_, i) => 0.4 * Math.sin((2 * Math.PI * 180 * i) / RATE)));
const speech = (): BytesFetch & jest.Mock =>
  jest.fn(async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => PCM.buffer.slice(PCM.byteOffset, PCM.byteOffset + PCM.byteLength) as ArrayBuffer,
    text: async () => '',
  }));

beforeEach(() => {
  disk.clear();
  player.mockClear();
  stopVoice();
});

describe('prepareVoice', () => {
  it('fetches, processes and caches a line it has never said', async () => {
    const net = speech();
    const p = await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    expect(net).toHaveBeenCalledTimes(1);
    expect(p.cached).toBe(false);
    expect(p.durationMs).toBe(500);
    expect(p.uri).toMatch(/\/voice\/[0-9a-f]{8}-500\.wav$/);
    expect(disk.has(p.uri)).toBe(true);
  });

  it('asks for the voice she is cast as on that route', async () => {
    const net = speech();
    await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    expect(JSON.parse(net.mock.calls[0][1].body)).toEqual(expect.objectContaining({ voice: 'Callirrhoe' }));
  });

  it('says a line it already knows from the cache, without the network', async () => {
    const net = speech();
    await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    const again = await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', net);
    expect(net).toHaveBeenCalledTimes(1);
    expect(again).toEqual(expect.objectContaining({ cached: true, durationMs: 500 }));
  });

  it('keys the cache on the direction, the model and the voice as well as the words', () => {
    const k = cacheKey('Noted.', 'flat', 'm', 'v');
    expect(k).not.toBe(cacheKey('Noted.', 'warm', 'm', 'v'));
    expect(k).not.toBe(cacheKey('Noted.', 'flat', 'n', 'v'));
    expect(k).not.toBe(cacheKey('Noted.', 'flat', 'm', 'w'));
  });

  it('refuses a key that cannot speak', async () => {
    await expect(prepareVoice('Noted.', 'ANTHROPIC', 'sk-ant-x', 'flat', speech())).rejects.toThrow(
      'no voice on this key',
    );
  });

  it('keeps at most CACHE_CAP lines, forgetting the oldest first', async () => {
    for (let i = 0; i < CACHE_CAP; i++) {
      disk.set(`file:///cache/voice/${String(i).padStart(8, '0')}-100.wav`, {
        bytes: new Uint8Array(0),
        at: -CACHE_CAP + i,
      });
    }
    await prepareVoice('Noted.', 'OPENROUTER', 'sk-or-v1-abc', 'flat', speech());
    expect([...disk.keys()].filter((k) => k.startsWith('file:///cache/voice/'))).toHaveLength(CACHE_CAP);
    expect(disk.has('file:///cache/voice/00000000-100.wav')).toBe(false);
  });

  it('gives up after VOICE_TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    const hung: BytesFetch = () => new Promise(() => {});
    const pending = expect(prepareVoice('Noted.', 'OPENROUTER', 'k', 'flat', hung)).rejects.toThrow('timeout');
    await jest.advanceTimersByTimeAsync(VOICE_TIMEOUT_MS);
    await pending;
    jest.useRealTimers();
  });
});

describe('playback', () => {
  const P = { uri: 'file:///cache/voice/x-500.wav', durationMs: 500, cached: true, took: 0 };

  it('plays the prepared file', () => {
    playVoice(P);
    expect(player).toHaveBeenCalledWith({ uri: P.uri });
    expect(player.mock.results[0].value.play).toHaveBeenCalled();
  });

  it('stops the line already playing before starting the next', () => {
    playVoice(P);
    const first = player.mock.results[0].value;
    playVoice(P);
    expect(first.pause).toHaveBeenCalled();
    expect(first.remove).toHaveBeenCalled();
  });

  it('stops on demand, and stopping twice is harmless', () => {
    playVoice(P);
    const p = player.mock.results[0].value;
    stopVoice();
    stopVoice();
    expect(p.remove).toHaveBeenCalledTimes(1);
  });

  it('lets go of a player that has finished', () => {
    playVoice(P);
    const p = player.mock.results[0].value;
    const listener = p.addListener.mock.calls[0][1];
    listener({ didJustFinish: true });
    expect(p.remove).toHaveBeenCalledTimes(1);
  });
});
