import { buildRequest, maskKey, providerFor, validateKey } from '../providers';

const ANTHROPIC = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
const OPENROUTER = 'sk-or-v1-abcdefghijklmnopqrstuvwxyz';
const DEEPSEEK = 'sk-0123456789abcdef0123456789abcdef';
const OPENAI = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
const GROQ = 'gsk_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GOOGLE = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

describe('providerFor', () => {
  it('routes each accepted shape to its own service', () => {
    expect(providerFor(ANTHROPIC)?.label).toBe('ANTHROPIC');
    expect(providerFor(OPENROUTER)?.label).toBe('OPENROUTER');
    expect(providerFor(OPENAI)?.label).toBe('OPENAI');
    expect(providerFor(GROQ)?.label).toBe('GROQ');
    expect(providerFor(GOOGLE)?.label).toBe('GOOGLE');
  });

  // The deepseek and openai patterns overlap; order in PROVIDERS decides.
  it('sends a 32-hex sk- key to deepseek, not openai', () => {
    expect(providerFor(DEEPSEEK)?.label).toBe('DEEPSEEK');
  });

  it('returns null for a shape it does not know', () => {
    expect(providerFor('xai-abcdefghijklmnopqrstuvwxyz')).toBeNull();
    expect(providerFor('hello-there-friend')).toBeNull();
  });
});

describe('validateKey', () => {
  it('accepts a key whose shape matches', () => {
    const check = validateKey(ANTHROPIC);
    expect(check).toEqual({ ok: true, provider: expect.objectContaining({ label: 'ANTHROPIC' }) });
  });

  it('refuses anything under eight characters', () => {
    expect(validateKey('sk-abc')).toEqual({ ok: false, reason: 'too-short' });
  });

  it('refuses a key with whitespace in it', () => {
    expect(validateKey('sk-ant-api03 abcdefghijklmnop')).toEqual({ ok: false, reason: 'whitespace' });
  });

  // The gate now gatekeeps. A valid key from an unlisted provider is refused;
  // that is the accepted cost of validating at the door (spec §9).
  it('refuses a well-formed key from a provider it does not route', () => {
    expect(validateKey('xai-abcdefghijklmnopqrstuvwxyz')).toEqual({ ok: false, reason: 'unrecognised' });
  });

  it('trims before judging', () => {
    expect(validateKey(`  ${GROQ}  `)).toMatchObject({ ok: true });
  });
});

describe('maskKey', () => {
  it('shows only the last four digits', () => {
    expect(maskKey('sk-ant-api03-abcd1234')).toBe('•••• 1234');
  });

  it('says nothing about an empty key', () => {
    expect(maskKey('')).toBe('');
  });
});

describe('buildRequest', () => {
  it('uses anthropic headers and a top-level system field', () => {
    const req = buildRequest(ANTHROPIC, 'SOUL', 'hello', 300);
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');
    expect(req.headers['x-api-key']).toBe(ANTHROPIC);
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.body).toMatchObject({ system: 'SOUL', max_tokens: 300 });
  });

  // CORS header from the web prototype; there is no browser on a phone.
  it('drops the browser-access header', () => {
    const req = buildRequest(ANTHROPIC, 'SOUL', 'hello', 300);
    expect(req.headers['anthropic-dangerous-direct-browser-access']).toBeUndefined();
  });

  it('uses a bearer token and a system message for openai-shaped services', () => {
    const req = buildRequest(GROQ, 'SOUL', 'hello', 300);
    expect(req.headers.authorization).toBe(`Bearer ${GROQ}`);
    expect(req.body).toMatchObject({
      messages: [
        { role: 'system', content: 'SOUL' },
        { role: 'user', content: 'hello' },
      ],
    });
  });

  it('uses systemInstruction and a goog header for gemini', () => {
    const req = buildRequest(GOOGLE, 'SOUL', 'hello', 300);
    expect(req.headers['x-goog-api-key']).toBe(GOOGLE);
    expect(req.body).toMatchObject({
      systemInstruction: { parts: [{ text: 'SOUL' }] },
      generationConfig: { maxOutputTokens: 300 },
    });
  });

  it('throws rather than guessing a route for an unknown key', () => {
    expect(() => buildRequest('nonsense-key-value', 'SOUL', 'hello', 300)).toThrow();
  });
});
