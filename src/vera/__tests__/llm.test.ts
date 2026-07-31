import { AuthError, callLlm } from '../llm';

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
});
