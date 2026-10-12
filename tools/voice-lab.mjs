// Listen to her before she is wired into anything. Fetches one line from the
// speech endpoint and writes it twice — raw, and through her chain — for one
// preset or for every one the route's model has, so her casting and every number in
// src/vera/voice/settings.ts are chosen by ear.
//
//   OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --all "Do not do that again."
//   OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs --voice coral --mode supportive "…"
//
// Options: --all | --voice <name>, --mode default|supportive (default
// `default`), --out <dir> (default voice-lab-out/). OPENAI_API_KEY works too.
//
// It imports the chain, the direction and the request from src/ unchanged —
// what you hear here is what the phone plays. The key is read from the
// environment and written nowhere.
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';

register('./ts-resolve-hooks.mjs', import.meta.url);

const { processVoice } = await import('../src/vera/voice/chain.ts');
const { encodeWav, fromS16LE, PCM_RATE } = await import('../src/vera/voice/pcm.ts');
const { fetchSpeech, ttsRouteFor } = await import('../src/vera/voice/tts.ts');
const { DEFAULT_MODE } = await import('../src/vera/modes/default.ts');
const { SUPPORTIVE_MODE } = await import('../src/vera/modes/supportive.ts');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const all = args.includes('--all');
if (all) args.splice(args.indexOf('--all'), 1);
const voice = flag('--voice');
const mode = flag('--mode') ?? 'default';
const out = flag('--out') ?? 'voice-lab-out';
const text = args.join(' ').trim();

const key = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY;
const label = process.env.OPENROUTER_API_KEY ? 'OPENROUTER' : 'OPENAI';
if (!key || !text) {
  console.error('usage: OPENROUTER_API_KEY=… node --no-warnings tools/voice-lab.mjs [--all | --voice name] [--mode default|supportive] "line"');
  process.exit(1);
}
const direction = (mode === 'supportive' ? SUPPORTIVE_MODE : DEFAULT_MODE).voiceDirection;
const route = ttsRouteFor(label);
const voices = all ? route.voices : [voice ?? route.voice];

mkdirSync(out, { recursive: true });
for (const v of voices) {
  const bytes = await fetchSpeech({ route, key, text, direction, voice: v }, fetch, 30_000);
  const raw = fromS16LE(bytes);
  const started = Date.now();
  const vera = processVoice(raw, PCM_RATE, text);
  writeFileSync(join(out, `raw-${v}.wav`), encodeWav(raw, PCM_RATE));
  writeFileSync(join(out, `vera-${v}.wav`), encodeWav(vera, PCM_RATE));
  console.log(
    `${v.padEnd(8)} ${bytes.length} bytes · ${(raw.length / PCM_RATE).toFixed(2)}s at ${PCM_RATE}Hz · chain ${Date.now() - started}ms`,
  );
}
console.log(`\nwritten to ${out}/ — if raw-*.wav plays at normal speed and pitch, the PCM is ${PCM_RATE}Hz.`);
