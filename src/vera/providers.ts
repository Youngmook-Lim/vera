// Five routes, and only five. The key's own shape picks one; a shape that
// matches none is refused at the gate rather than guessed at (spec §9).
//
// Groq was dropped deliberately: a valid `gsk_` key is now refused at the
// door. DeepSeek stays because its keys cannot be refused — `sk-` + 32 hex
// satisfies the openai pattern too — so without a route of its own it would
// silently mis-route and fail at OpenAI instead.
import type { Turn } from './messages';

export type ProviderKind = 'anthropic' | 'oai' | 'gemini';

export interface Provider {
  label: string;
  test: RegExp;
  kind: ProviderKind;
  url: string;
  model: string;
}

// ORDER IS SIGNIFICANT. Every `sk-` shape below also satisfies the openai
// pattern — its character class includes the hyphen, and 32 hex digits are
// plain alphanumerics — so anthropic, openrouter and deepseek must all be
// tested before openai or their keys route to the wrong endpoint.
export const PROVIDERS: readonly Provider[] = [
  {
    label: 'ANTHROPIC', test: /^sk-ant-/, kind: 'anthropic',
    // Moved off claude-sonnet-4-5 on 2026-08-28, before its 29 Sep 2026
    // retirement. A retired model 404s, which is neither an auth refusal nor
    // a quota failure, so she would have fallen back to authored lines
    // indefinitely and looked alive — the same trap gemini-2.0-flash set.
    url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5',
  },
  {
    label: 'OPENROUTER', test: /^sk-or-/, kind: 'oai',
    // Same model, OpenRouter's own slug — it routes to Anthropic, so the
    // retirement above reaches this route too.
    url: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-sonnet-5',
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
    // TWO shapes. Google is migrating Gemini keys from `AIza` (standard keys)
    // to `AQ.Ab…` (auth keys, bound to a service account): AI Studio issues
    // only the new form now, and from September 2026 the API rejects standard
    // keys outright. A gate that knows only `AIza` refuses every key a subject
    // can currently create — and refuses it at the door, so she never even
    // wakes. Both are accepted until the old one stops being issued at all.
    label: 'GOOGLE', test: /^(AIza|AQ\.)/, kind: 'gemini',
    // Separately: gemini-2.0-flash was SHUT DOWN. An accepted key on a retired
    // model 404s, which is not a 401, so it shows an authored fallback line
    // rather than an error — she looks alive and says nothing of substance.
    // flash-lite is the one 2.5 model with thinking OFF by default; the others
    // would spend this request's 300 tokens on thoughts and return no text.
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    model: 'gemini-2.5-flash-lite',
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
  turns: Turn[],
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
        messages: turns.map((t) => ({ role: t.role, content: t.text })),
      },
    };
  }

  if (provider.kind === 'gemini') {
    return {
      url: provider.url,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        // Gemini names the assistant role `model`.
        contents: turns.map((t) => ({
          role: t.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: t.text }],
        })),
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
        ...turns.map((t) => ({ role: t.role, content: t.text })),
      ],
    },
  };
};
