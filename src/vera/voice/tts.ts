// The speech request. One per line, to the route her key already uses — no
// second key. OpenRouter and OpenAI take the same body, though not the same
// model; the other three providers have no speech endpoint and she has no
// voice on them.
//
// The network is injected, as llm.ts does it, so no test reaches it. No
// imports outside src/vera/voice/: tools/voice-lab.mjs runs this under Node.
export interface TtsRoute {
  url: string;
  model: string;
  voices: readonly string[]; // the model's own presets
  voice: string; // the one she is cast as on this route
}

// gpt-4o-mini-tts's presets.
const OPENAI_VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova',
  'onyx', 'sage', 'shimmer', 'verse', 'marin', 'cedar',
] as const;

// Gemini TTS's presets, as OpenRouter's models API lists them.
const GEMINI_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 'Autonoe',
  'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi',
  'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat',
] as const;

// A retired model 404s and she goes silent while looking fine. Pinned by a
// test, exactly as the chat models are — and it has already happened once:
// OpenRouter delisted gpt-4o-mini-tts before she ever spoke (2026-10-12), so
// her OpenRouter voice is Gemini's. OpenRouter forwards `instructions` to it as
// Gemini's speech style, so the body did not change.
//
// Her casting is a decision made by ear, in the voice lab (Task 8) — not a
// setting. Both `voice` values are provisional until then.
const ROUTES: Record<string, TtsRoute> = {
  OPENROUTER: {
    url: 'https://openrouter.ai/api/v1/audio/speech',
    model: 'google/gemini-3.8-flash-tts',
    voices: GEMINI_VOICES,
    voice: 'Kore',
  },
  OPENAI: {
    url: 'https://api.openai.com/v1/audio/speech',
    model: 'gpt-4o-mini-tts-2025-12-15',
    voices: OPENAI_VOICES,
    voice: 'sage',
  },
};

export const ttsRouteFor = (label: string | null | undefined): TtsRoute | null =>
  (label && ROUTES[label]) || null;

export const voiceSupported = (label: string | null | undefined): boolean => ttsRouteFor(label) !== null;

export interface SpeechRequest {
  route: TtsRoute;
  key: string;
  text: string;
  direction: string;
  voice: string;
}

export const buildSpeechRequest = ({ route, key, text, direction, voice }: SpeechRequest) => ({
  url: route.url,
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: { model: route.model, input: text, voice, instructions: direction, response_format: 'pcm' },
});

export type BytesFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}>;

const reasonFor = async (res: Awaited<ReturnType<BytesFetch>>): Promise<string> => {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    // nothing readable came back
  }
  try {
    const j = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    const m = j?.error?.message ?? j?.message;
    if (typeof m === 'string' && m) return `http ${res.status}: ${m}`;
  } catch {
    // not JSON
  }
  return `http ${res.status}${raw ? `: ${raw.slice(0, 200)}` : ''}`;
};

// An error body is small and opens with `{`; real PCM almost never parses as
// JSON, so a short body that does is an error that came back as a 200.
const asJsonError = (bytes: Uint8Array): string | null => {
  if (bytes.length === 0 || bytes.length > 4096 || bytes[0] !== 0x7b) return null;
  try {
    JSON.parse(String.fromCharCode(...bytes));
    return String.fromCharCode(...bytes).slice(0, 200);
  } catch {
    return null;
  }
};

export const fetchSpeech = async (
  req: SpeechRequest,
  fetchImpl: BytesFetch,
  timeoutMs: number,
): Promise<Uint8Array> => {
  const { url, headers, body } = buildSpeechRequest(req);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal }),
      expiry,
    ]);
    if (!res.ok) throw new Error(await reasonFor(res));
    const bytes = new Uint8Array(await Promise.race([res.arrayBuffer(), expiry]));
    const json = asJsonError(bytes);
    if (json) throw new Error(`not audio: ${json}`);
    // A 200 with nothing in it would make a 0ms WAV and pace her typewriter
    // to nothing; an odd length is half a sample.
    if (bytes.length < 2 || bytes.length % 2 !== 0) throw new Error(`no audio (${bytes.length} bytes)`);
    return bytes;
  } finally {
    if (timer) clearTimeout(timer);
  }
};
