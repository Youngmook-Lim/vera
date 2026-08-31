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

const detailOf = (body: unknown): string => {
  const j = body as ErrorShape;
  const said = typeof j?.error?.message === 'string' ? j.error.message : '';
  const code = typeof j?.error?.code === 'string' ? j.error.code : '';
  return [said, code && `(${code})`].filter(Boolean).join(' ').trim();
};

const reasonFor = async (res: { status: number; json: () => Promise<unknown> }): Promise<string> => {
  let detail = '';
  try {
    detail = detailOf(await res.json());
  } catch {
    // A body that is not JSON, or no body at all. The status alone still says
    // more than the nothing that was reported before.
  }
  return detail ? `http ${res.status}: ${detail}`.slice(0, MAX_DETAIL) : `http ${res.status}`;
};

// Why the model stopped, under each provider's own name for it. Never spoken
// and never stored on its own — it goes into the message thrown for an empty
// 200, where it is the difference between a budget that ran out and a reply
// that was never generated.
interface FinishShape {
  stop_reason?: string;
  choices?: { finish_reason?: string; native_finish_reason?: string }[];
  candidates?: { finishReason?: string }[];
}

const finishOf = (payload: unknown): string => {
  const j = payload as FinishShape;
  const c = j?.choices?.[0];
  return j?.stop_reason
    ?? c?.finish_reason
    ?? c?.native_finish_reason
    ?? j?.candidates?.[0]?.finishReason
    ?? '';
};

// A 200 carrying no text is not a reply, and returning it as one was a dead
// end: the caller could not parse an empty string, so it read as a model that
// answered unreadably, and the PROMPT screen printed `0 chars` with nothing
// else to go on. Two real failures land here and neither is a parse problem.
// OpenRouter returns some upstream failures as HTTP 200 with an `error` object
// and no `choices` at all — a sentence saying exactly what went wrong, thrown
// away by a reader looking only for text. And a response that spends its whole
// token budget before emitting content stops with a finish reason and an empty
// string. Both are reported now, in the provider's own words where it gave any.
const emptyReplyReason = (payload: unknown): string => {
  const detail = detailOf(payload);
  if (detail) return `http 200: ${detail}`.slice(0, MAX_DETAIL);
  const finish = finishOf(payload);
  return finish
    ? `http 200: the reply carried no text (finish reason: ${finish})`
    : 'http 200: the reply carried no text, and no reason was given';
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

  const payload = await res.json();
  const text = textOf(payload);
  if (!text) throw new Error(emptyReplyReason(payload));
  return text;
};
