import { buildRequest } from './providers';
import type { Turn } from './messages';

// Distinguished from every other failure because it means something different:
// an auth refusal is the key's fault and sends her dormant; a network failure
// is the facility's fault and she falls back to an authored line.
export class AuthError extends Error {
  constructor() {
    super('auth');
    this.name = 'AuthError';
  }
}

// The account, not the credential. A key with no credit behind it is refused
// with a 400 or a 402, never a 401, so without a class of its own it landed in
// the generic failure and showed an authored line — indistinguishable from her
// having nothing to say, and impossible to diagnose from the phone.
//
// Like AuthError it is a configuration problem only the subject can fix, which
// is the test the app uses for speaking in its own voice rather than hers.
export class QuotaError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'QuotaError';
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

interface ErrorShape { error?: { message?: string; code?: string; status?: string } }

// Anthropic, the OpenAI-shaped routes and Gemini all nest the sentence under
// `error.message`, so one reader covers every provider. Truncated because it
// is stored in the prompt record and rendered on a phone screen.
const MAX_DETAIL = 200;

const reasonFor = async (res: { status: number; json: () => Promise<unknown> }): Promise<string> => {
  let said = '';
  let code = '';
  try {
    const body = (await res.json()) as ErrorShape;
    said = typeof body?.error?.message === 'string' ? body.error.message : '';
    code = typeof body?.error?.code === 'string' ? body.error.code : '';
  } catch {
    // A body that is not JSON, or no body at all. The status alone still says
    // more than the nothing that was reported before.
  }
  const detail = [said, code && `(${code})`].filter(Boolean).join(' ').trim();
  return detail ? `http ${res.status}: ${detail}`.slice(0, MAX_DETAIL) : `http ${res.status}`;
};

// 402 is unambiguous. Otherwise it is the provider's own wording, because a
// plain 429 is a transient rate limit that the subject can do nothing about
// and must NOT be reported as a billing problem.
const isQuota = (status: number, detail: string): boolean =>
  status === 402
  || /credit balance|insufficient_quota|billing|purchase credits|exceeded your (current )?quota/i
    .test(detail);

export const callLlm = async (
  key: string,
  system: string,
  turns: Turn[],
  maxTokens = 300,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> => {
  const { url, headers, body } = buildRequest(key, system, turns, maxTokens);

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

    // Every provider puts a human sentence in the body and it is the only
    // thing that says WHY. Thrown away, a 400 for an empty credit balance
    // reads exactly like a dead socket on the PROMPT screen.
    const detail = await reasonFor(res);
    if (isQuota(res.status, detail)) throw new QuotaError(detail);
    throw new Error(detail);
  }
  return textOf(await res.json());
};
