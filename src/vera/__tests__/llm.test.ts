import { AuthError, REQUEST_TIMEOUT_MS, callLlm } from '../llm';

const ANTHROPIC = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
const GROQ = 'gsk_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GOOGLE = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

const respond = (payload: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({ ok, status, json: async () => payload });

describe('callLlm', () => {
  it('reads anthropic content blocks', async () => {
    const fetchImpl = respond({ content: [{ text: 'You returned.' }, { text: ' Barely.' }] });
    await expect(callLlm(ANTHROPIC, 'SOUL', 'hi', 300, fetchImpl)).resolves.toBe(
      'You returned. Barely.',
    );
  });

  it('reads openai choices', async () => {
    const fetchImpl = respond({ choices: [{ message: { content: 'Noted.' } }] });
    await expect(callLlm(GROQ, 'SOUL', 'hi', 300, fetchImpl)).resolves.toBe('Noted.');
  });

  it('reads gemini candidates', async () => {
    const fetchImpl = respond({ candidates: [{ content: { parts: [{ text: 'Filed.' }] } }] });
    await expect(callLlm(GOOGLE, 'SOUL', 'hi', 300, fetchImpl)).resolves.toBe('Filed.');
  });

  it('posts to the routed url with the routed headers', async () => {
    const fetchImpl = respond({ content: [{ text: 'ok' }] });
    await callLlm(ANTHROPIC, 'SOUL', 'hi', 300, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe(ANTHROPIC);
    expect(JSON.parse(init.body).system).toBe('SOUL');
  });

  // Only a refusal is the key's fault. Everything else is the network, and the
  // caller treats the two differently: one goes dormant, one falls back.
  it('throws AuthError on 401 and 403', async () => {
    await expect(callLlm(ANTHROPIC, 'S', 'u', 300, respond({}, false, 401))).rejects.toBeInstanceOf(AuthError);
    await expect(callLlm(ANTHROPIC, 'S', 'u', 300, respond({}, false, 403))).rejects.toBeInstanceOf(AuthError);
  });

  it('throws a plain error on any other bad status', async () => {
    const call = callLlm(ANTHROPIC, 'S', 'u', 300, respond({}, false, 500));
    await expect(call).rejects.toThrow('http 500');
    await expect(call).rejects.not.toBeInstanceOf(AuthError);
  });

  it('lets a transport failure through', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('Network request failed'));
    await expect(callLlm(ANTHROPIC, 'S', 'u', 300, fetchImpl)).rejects.toThrow('Network request failed');
  });

  it('returns an empty string when the response carries no text', async () => {
    await expect(callLlm(ANTHROPIC, 'S', 'u', 300, respond({}))).resolves.toBe('');
  });

  // Finding 3, final review: RN's fetch has no timeout of its own, and a socket
  // that never answers used to strand the caller's busy flag for the life of
  // the process — she would go quiet and stay quiet until a force-quit.
  describe('a request that never answers', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    type Init = {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: AbortSignal;
    };
    const hang = () => jest.fn((_url: string, _init: Init) => new Promise<never>(() => {}));
    const answer = (payload: unknown) =>
      jest.fn(async (_url: string, _init: Init) => ({
        ok: true, status: 200, json: async () => payload,
      }));

    it('gives up rather than hanging forever', async () => {
      const call = callLlm(ANTHROPIC, 'S', 'u', 300, hang());
      const settled = expect(call).rejects.toThrow('timeout');
      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await settled;
    });

    // A hang is the facility's fault, not the key's: AuthError would send the
    // caller down the "your credential is bad" path over a flaky connection.
    it('rejects as an ordinary network failure, never as an auth refusal', async () => {
      const call = callLlm(ANTHROPIC, 'S', 'u', 300, hang());
      const settled = expect(call).rejects.not.toBeInstanceOf(AuthError);
      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await settled;
    });

    it('aborts the request it abandoned', async () => {
      const fetchImpl = hang();
      const call = callLlm(ANTHROPIC, 'S', 'u', 300, fetchImpl);
      const settled = expect(call).rejects.toThrow('timeout');
      const signal = fetchImpl.mock.calls[0][1].signal as AbortSignal;
      expect(signal.aborted).toBe(false);

      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      await settled;
      expect(signal.aborted).toBe(true);
    });

    it('does not abort a request that answered in time', async () => {
      const fetchImpl = answer({ content: [{ text: 'ok' }] });
      await expect(callLlm(ANTHROPIC, 'S', 'u', 300, fetchImpl)).resolves.toBe('ok');
      jest.advanceTimersByTime(REQUEST_TIMEOUT_MS * 2);
      expect((fetchImpl.mock.calls[0][1].signal as AbortSignal).aborted).toBe(false);
    });
  });
});
