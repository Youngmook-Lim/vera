// Six routes, and only six. The key's own shape picks one; a shape that
// matches none is refused at the gate rather than guessed at (spec §9).
// GROQ is Groq the inference provider — not xAI's Grok, which is a different
// company with an `xai-` prefix and is not routed here.
export type ProviderKind = 'anthropic' | 'oai' | 'gemini';

export interface Provider {
  label: string;
  test: RegExp;
  kind: ProviderKind;
  url: string;
  model: string;
}

// ORDER IS SIGNIFICANT. The deepseek pattern is a strict subset of the openai
// one, so deepseek must be tested first or its keys route to openai.
export const PROVIDERS: readonly Provider[] = [
  {
    label: 'ANTHROPIC', test: /^sk-ant-/, kind: 'anthropic',
    url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-5',
  },
  {
    label: 'OPENROUTER', test: /^sk-or-/, kind: 'oai',
    url: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-sonnet-4.5',
  },
  {
    label: 'DEEPSEEK', test: /^sk-[0-9a-f]{32}$/, kind: 'oai',
    url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat',
  },
  {
    label: 'OPENAI', test: /^sk-(proj-)?[A-Za-z0-9_-]{20,}$/, kind: 'oai',
    url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini',
  },
  {
    label: 'GROQ', test: /^gsk_/, kind: 'oai',
    url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile',
  },
  {
    label: 'GOOGLE', test: /^AIza/, kind: 'gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    model: 'gemini-2.0-flash',
  },
];

export const providerFor = (key: string): Provider | null =>
  PROVIDERS.find((p) => p.test.test(key.trim())) ?? null;

export type KeyRejection = 'too-short' | 'whitespace' | 'unrecognised';

export type KeyCheck =
  | { ok: true; provider: Provider }
  | { ok: false; reason: KeyRejection };

export const validateKey = (raw: string): KeyCheck => {
  const key = String(raw ?? '').trim();
  if (key.length < 8) return { ok: false, reason: 'too-short' };
  if (/\s/.test(key)) return { ok: false, reason: 'whitespace' };
  const provider = providerFor(key);
  if (!provider) return { ok: false, reason: 'unrecognised' };
  return { ok: true, provider };
};

export const maskKey = (key: string): string =>
  key ? `•••• ${key.trim().slice(-4)}` : '';

export interface LlmRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export const buildRequest = (
  raw: string,
  system: string,
  user: string,
  maxTokens: number,
): LlmRequest => {
  const key = String(raw ?? '').trim();
  const provider = providerFor(key);
  if (!provider) throw new Error('unrecognised key shape');

  if (provider.kind === 'anthropic') {
    return {
      url: provider.url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: provider.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      },
    };
  }

  if (provider.kind === 'gemini') {
    return {
      url: provider.url,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      },
    };
  }

  return {
    url: provider.url,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: {
      model: provider.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    },
  };
};
