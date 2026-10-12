// Raw speech in, a playable file out. OpenAI-shaped speech endpoints return
// `pcm` as bare 16-bit little-endian mono samples with no header; a phone's
// player wants a WAV. Everything in this folder works in Float32 between the
// two.
//
// No imports outside src/vera/voice/: tools/voice-lab.mjs runs this exact file
// under Node.
// Confirmed by ear for Gemini on OpenRouter (2026-10-12): Callirrhoe's raw
// line read at 24kHz runs 4.88s and sounds like her, not sped up or slowed.
export const PCM_RATE = 24_000;

export const fromS16LE = (bytes: Uint8Array): Float32Array => {
  const n = bytes.length >> 1;
  const out = new Float32Array(n);
  const view = new DataView(bytes.buffer, bytes.byteOffset, n * 2);
  for (let i = 0; i < n; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
};

export const toS16LE = (samples: Float32Array): Uint8Array => {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    // One scale both ways (fromS16LE divides by 32768), clamped at the top
    // because +1.0 has no 16-bit representation.
    const v = Math.round(samples[i] * 32768);
    view.setInt16(i * 2, Math.max(-32768, Math.min(32767, v)), true);
  }
  return out;
};

const ascii = (view: DataView, at: number, s: string): void => {
  for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
};

export const encodeWav = (samples: Float32Array, rate: number): Uint8Array => {
  const data = toS16LE(samples);
  const out = new Uint8Array(44 + data.length);
  const v = new DataView(out.buffer);
  ascii(v, 0, 'RIFF');
  v.setUint32(4, 36 + data.length, true);
  ascii(v, 8, 'WAVE');
  ascii(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(v, 36, 'data');
  v.setUint32(40, data.length, true);
  out.set(data, 44);
  return out;
};

export const decodeWav = (bytes: Uint8Array): { samples: Float32Array; rate: number } => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a wav');
  let at = 12;
  let rate = 0;
  while (at + 8 <= bytes.length) {
    const id = tag(at);
    const size = v.getUint32(at + 4, true);
    if (id === 'fmt ') rate = v.getUint32(at + 12, true);
    if (id === 'data') return { samples: fromS16LE(bytes.subarray(at + 8, at + 8 + size)), rate };
    at += 8 + size + (size & 1);
  }
  throw new Error('wav has no data chunk');
};
