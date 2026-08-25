import { buildRequest, maskKey, providerFor, validateKey } from '../providers';
import type { Turn } from '../messages';

const ANTHROPIC = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';
const OPENROUTER = 'sk-or-v1-abcdefghijklmnopqrstuvwxyz';
const DEEPSEEK = 'sk-0123456789abcdef0123456789abcdef';
const OPENAI = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
const GROQ = 'gsk_ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GOOGLE = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ01234';
// The form AI Studio issues now; `AIza` standard keys stop working in Sep 2026.
const GOOGLE_AUTH = 'AQ.Ab8RN6JlKmNoPqRsTuVwXyZ0123456789abcdefghij';

describe('providerFor', () => {
  it('routes each accepted shape to its own service', () => {
    expect(providerFor(ANTHROPIC)?.label).toBe('ANTHROPIC');
    expect(providerFor(OPENROUTER)?.label).toBe('OPENROUTER');
    expect(providerFor(OPENAI)?.label).toBe('OPENAI');
    expect(providerFor(GOOGLE)?.label).toBe('GOOGLE');
  });

  // Anthropic and OpenRouter keys satisfy the openai pattern too, so order in
  // PROVIDERS is what keeps them off the wrong endpoint.
  it('keeps sk-ant- and sk-or- off the openai route', () => {
    expect(providerFor(ANTHROPIC)?.label).not.toBe('OPENAI');
    expect(providerFor(OPENROUTER)?.label).not.toBe('OPENAI');
  });

  // A key the subject creates in AI Studio today starts AQ.Ab — refusing it
  // at the gate means she never wakes at all.
  it('accepts both google key shapes, old and new', () => {
    expect(providerFor(GOOGLE)?.label).toBe('GOOGLE');
    expect(providerFor(GOOGLE_AUTH)?.label).toBe('GOOGLE');
    expect(validateKey(GOOGLE_AUTH)).toMatchObject({ ok: true });
  });

  // gemini-2.0-flash is shut down; a live model id is the difference between
  // her answering and her falling back forever on a perfectly good key.
  it('points google at a model that still exists', () => {
    const google = providerFor(GOOGLE);
    expect(google?.model).toBe('gemini-2.5-flash-lite');
    expect(google?.url).toContain('gemini-2.5-flash-lite:generateContent');
  });

  // A deepseek key cannot be refused — sk- + 32 hex satisfies the openai
  // pattern too — so it needs its own route or it mis-routes silently.
  it('sends a 32-hex sk- key to deepseek, not openai', () => {
    expect(providerFor(DEEPSEEK)?.label).toBe('DEEPSEEK');
  });

  it('no longer routes groq', () => {
    expect(providerFor(GROQ)).toBeNull();
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
    expect(validateKey(GROQ)).toEqual({ ok: false, reason: 'unrecognised' });
  });

  it('trims before judging', () => {
    expect(validateKey(`  ${OPENAI}  `)).toMatchObject({ ok: true });
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
    const req = buildRequest(ANTHROPIC, 'SOUL', [{ role: 'user', text: 'hello' }], 300);
    expect(req.url).toBe('https://api.anthropic.com/v1/messages');
    expect(req.headers['x-api-key']).toBe(ANTHROPIC);
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.body).toMatchObject({ system: 'SOUL', max_tokens: 300 });
  });

  // CORS header from the web prototype; there is no browser on a phone.
  it('drops the browser-access header', () => {
    const req = buildRequest(ANTHROPIC, 'SOUL', [{ role: 'user', text: 'hello' }], 300);
    expect(req.headers['anthropic-dangerous-direct-browser-access']).toBeUndefined();
  });

  it('uses a bearer token and a system message for openai-shaped services', () => {
    const req = buildRequest(OPENAI, 'SOUL', [{ role: 'user', text: 'hello' }], 300);
    expect(req.headers.authorization).toBe(`Bearer ${OPENAI}`);
    expect(req.body).toMatchObject({
      messages: [
        { role: 'system', content: 'SOUL' },
        { role: 'user', content: 'hello' },
      ],
    });
  });

  it('uses systemInstruction and a goog header for gemini', () => {
    const req = buildRequest(GOOGLE, 'SOUL', [{ role: 'user', text: 'hello' }], 300);
    expect(req.headers['x-goog-api-key']).toBe(GOOGLE);
    expect(req.body).toMatchObject({
      systemInstruction: { parts: [{ text: 'SOUL' }] },
      generationConfig: { maxOutputTokens: 300 },
    });
  });

  it('throws rather than guessing a route for an unknown key', () => {
    expect(() => buildRequest('nonsense-key-value', 'SOUL', [{ role: 'user', text: 'hello' }], 300)).toThrow();
  });
});

const TURNS: Turn[] = [
  { role: 'user', text: 'hi' },
  { role: 'assistant', text: 'Barely.' },
  { role: 'user', text: 'rude' },
];

describe('buildRequest with a conversation', () => {
  it('sends anthropic every turn, in order', () => {
    const body = buildRequest('sk-ant-api03-abcdefghijklmnop', 'SYS', TURNS, 300).body as
      { system: string; messages: { role: string; content: string }[] };
    expect(body.system).toBe('SYS');
    expect(body.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Barely.' },
      { role: 'user', content: 'rude' },
    ]);
  });

  it('keeps the system message first for the openai shape', () => {
    const body = buildRequest('sk-proj-abcdefghijklmnopqrstuvwx', 'SYS', TURNS, 300).body as
      { messages: { role: string; content: string }[] };
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(body.messages).toHaveLength(4);
  });

  // Gemini names the assistant role `model`, not `assistant`.
  it('renames the assistant role for gemini', () => {
    const body = buildRequest('AIzaSyAbcdefghijklmnop', 'SYS', TURNS, 300).body as
      { contents: { role: string; parts: { text: string }[] }[] };
    expect(body.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(body.contents[1].parts[0].text).toBe('Barely.');
  });
});
