import { MODES } from '../../modes/registry';
import {
  TTS_VOICE, VOICES, buildSpeechRequest, fetchSpeech, ttsRouteFor, voiceSupported,
  type BytesFetch,
} from '../tts';

const OR = ttsRouteFor('OPENROUTER')!;
const REQ = { route: OR, key: 'sk-or-v1-abc', text: 'Noted.', direction: 'flat', voice: 'sage' };
const reply = (status: number, body: Uint8Array | string): BytesFetch => async () => {
  const bytes = typeof body === 'string' ? Uint8Array.from(body, (c) => c.charCodeAt(0)) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    text: async () => String.fromCharCode(...bytes),
  };
};

describe('routes', () => {
  // A retired TTS model 404s, and she would go silent while looking fine —
  // the same trap the chat models set (CLAUDE.md, 2026-08-28).
  it('pins the model on both routes that have one', () => {
    expect(ttsRouteFor('OPENROUTER')).toEqual({
      url: 'https://openrouter.ai/api/v1/audio/speech',
      model: 'openai/gpt-4o-mini-tts-2025-12-15',
    });
    expect(ttsRouteFor('OPENAI')).toEqual({
      url: 'https://api.openai.com/v1/audio/speech',
      model: 'gpt-4o-mini-tts-2025-12-15',
    });
  });

  it('has no voice on the three keys that cannot speak', () => {
    for (const label of ['ANTHROPIC', 'DEEPSEEK', 'GOOGLE', '', null, undefined]) {
      expect(ttsRouteFor(label)).toBeNull();
      expect(voiceSupported(label)).toBe(false);
    }
  });

  it('casts one of the model\'s own voices', () => {
    expect(VOICES).toHaveLength(13);
    expect(VOICES).toContain(TTS_VOICE);
  });
});

describe('the request', () => {
  it('asks for raw PCM in her voice, with her direction', () => {
    const r = buildSpeechRequest(REQ);
    expect(r.url).toBe(OR.url);
    expect(r.headers.Authorization).toBe('Bearer sk-or-v1-abc');
    expect(r.body).toEqual({
      model: OR.model, input: 'Noted.', voice: 'sage', instructions: 'flat', response_format: 'pcm',
    });
  });

  // Review Focus 3: the Korean goes over the wire exactly as she said it.
  it('sends Korean verbatim', () => {
    expect(buildSpeechRequest({ ...REQ, text: '기록했어요.' }).body.input).toBe('기록했어요.');
  });
});

describe('fetchSpeech', () => {
  it('returns the audio bytes', async () => {
    const pcm = Uint8Array.from([1, 0, 2, 0]);
    await expect(fetchSpeech(REQ, reply(200, pcm), 8000)).resolves.toEqual(pcm);
  });

  it('reports a refusal in the provider\'s own words', async () => {
    await expect(fetchSpeech(REQ, reply(402, '{"error":{"message":"Insufficient credits"}}'), 8000))
      .rejects.toThrow('http 402: Insufficient credits');
  });

  // Review Focus 2: a 200 is not proof of audio.
  it('refuses a 200 that is a JSON error, an empty body, or half a sample', async () => {
    await expect(fetchSpeech(REQ, reply(200, '{"error":{"message":"upstream"}}'), 8000)).rejects.toThrow('not audio');
    await expect(fetchSpeech(REQ, reply(200, new Uint8Array(0)), 8000)).rejects.toThrow('no audio');
    await expect(fetchSpeech(REQ, reply(200, Uint8Array.from([1, 2, 3])), 8000)).rejects.toThrow('no audio');
  });

  it('gives up after the timeout', async () => {
    jest.useFakeTimers();
    const hung: BytesFetch = () => new Promise(() => {});
    const pending = expect(fetchSpeech(REQ, hung, 8000)).rejects.toThrow('timeout');
    jest.advanceTimersByTime(8000);
    await pending;
    jest.useRealTimers();
  });
});

describe('her direction', () => {
  it('every register says how she sounds aloud, and never names who she resembles', () => {
    for (const mode of Object.values(MODES)) {
      expect(mode.voiceDirection.length).toBeGreaterThan(40);
      expect(mode.voiceDirection).not.toMatch(/glados|portal|aperture/i);
    }
  });
});
