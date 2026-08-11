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
  signal?: AbortSignal;
}) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

// React Native's fetch never times out on its own, and a hung socket is the
// likeliest real failure on a phone. Left alone it is worse than an error:
// speak()'s busy flag and `thinking` stay set for the life of the process, and
// every later SEND and tap on her optic is silently swallowed. 25s is past the
// slowest honest answer to a 300-token request on a poor connection, and well
// short of the minute a subject would spend deciding she is broken.
export const REQUEST_TIMEOUT_MS = 25_000;

interface AnthropicShape { content?: { text?: string }[] }
interface GeminiShape {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}
interface OaiShape { choices?: { message?: { content?: string } }[] }

const textOf = (payload: unknown): string => {
  const j = payload as AnthropicShape & GeminiShape & OaiShape;
  if (j?.content) return j.content.map((b) => b.text ?? '').join('');
  if (j?.candidates) {
    // A Gemini model that thinks returns its reasoning as parts marked
    // `thought`. Concatenated in, they would be spoken as her line.
    return (j.candidates[0]?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('');
  }
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

  // The abort frees the socket; the race is what guarantees this call settles
  // even if the transport ignores the signal. A timeout rejects as an ordinary
  // network failure, never AuthError — a hang is not the key's fault, and the
  // caller falls back to an authored line rather than blaming the credential.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, REQUEST_TIMEOUT_MS);
  });

  let res;
  try {
    res = await Promise.race([
      fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      }),
      expiry,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AuthError();
    throw new Error(`http ${res.status}`);
  }
  return textOf(await res.json());
};
