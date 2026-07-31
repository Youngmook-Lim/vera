import { buildRequest } from './providers';

// Distinguished from every other failure because it means something different:
// an auth refusal is the key's fault and sends her dormant; a network failure
// is the facility's fault and she falls back to an authored line.
export class AuthError extends Error {
  constructor() {
    super('auth');
    this.name = 'AuthError';
  }
}

type FetchLike = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body: string;
}) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

interface AnthropicShape { content?: { text?: string }[] }
interface GeminiShape { candidates?: { content?: { parts?: { text?: string }[] } }[] }
interface OaiShape { choices?: { message?: { content?: string } }[] }

const textOf = (payload: unknown): string => {
  const j = payload as AnthropicShape & GeminiShape & OaiShape;
  if (j?.content) return j.content.map((b) => b.text ?? '').join('');
  if (j?.candidates) return (j.candidates[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  return j?.choices?.[0]?.message?.content ?? '';
};

export const callLlm = async (
  key: string,
  system: string,
  user: string,
  maxTokens = 300,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> => {
  const { url, headers, body } = buildRequest(key, system, user, maxTokens);
  const res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AuthError();
    throw new Error(`http ${res.status}`);
  }
  return textOf(await res.json());
};
