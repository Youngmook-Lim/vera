// The effectful half of her voice: the cache, the request, the processing,
// the player. Everything that decides what she sounds like is in
// src/vera/voice/ and is pure; this file only fetches, writes and plays.
//
// Each line is processed once and kept as a WAV in the cache directory, named
// `<key>-<durationMs>.wav`. The duration rides in the name so a cache hit can
// pace the typewriter without reading the file back. Her bank lines repeat,
// so after their first playing a poke or a greeting is instant and free.
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import { processVoice } from '../vera/voice/chain';
import { hashText } from '../vera/voice/contour';
import { PCM_RATE, encodeWav, fromS16LE } from '../vera/voice/pcm';
import { CHAIN_VERSION } from '../vera/voice/settings';
import { fetchSpeech, ttsRouteFor, type BytesFetch } from '../vera/voice/tts';

// How long her text waits for her voice before it gives up and appears
// silently, as it always used to.
export const VOICE_TIMEOUT_MS = 8_000;
export const CACHE_CAP = 200;

export interface Prepared {
  uri: string;
  durationMs: number;
  cached: boolean;
  took: number;
}

// Everything that changes the sound is in the key, so a recast voice, a new
// direction or a retuned chain never replays stale audio.
export const cacheKey = (text: string, direction: string, model: string, voice: string): string =>
  hashText([text, voice, direction, model, String(CHAIN_VERSION)].join('\u0000'))
    .toString(16)
    .padStart(8, '0');

const folder = (): Directory => {
  const dir = new Directory(Paths.cache, 'voice');
  if (!dir.exists) dir.create();
  return dir;
};

const filesIn = (dir: Directory): File[] => dir.list().filter((e): e is File => e instanceof File);

const durationOf = (name: string): number => Number(name.replace(/\.wav$/, '').split('-')[1]) || 0;

const evict = (dir: Directory): void => {
  const files = filesIn(dir).sort((a, b) => (a.lastModified ?? 0) - (b.lastModified ?? 0));
  for (const f of files.slice(0, Math.max(0, files.length - CACHE_CAP))) {
    try {
      f.delete();
    } catch {
      // a file the OS already cleared
    }
  }
};

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([work, expiry]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};

export const prepareVoice = (
  text: string,
  providerLabel: string | null | undefined,
  key: string,
  direction: string,
  fetchImpl: BytesFetch = fetch as unknown as BytesFetch,
): Promise<Prepared> =>
  withTimeout(
    (async () => {
      const started = Date.now();
      const route = ttsRouteFor(providerLabel);
      if (!route) throw new Error('no voice on this key');
      const dir = folder();
      const k = cacheKey(text, direction, route.model, route.voice);
      const hit = filesIn(dir).find((f) => f.name.startsWith(`${k}-`));
      if (hit) return { uri: hit.uri, durationMs: durationOf(hit.name), cached: true, took: Date.now() - started };

      const bytes = await fetchSpeech({ route, key, text, direction, voice: route.voice }, fetchImpl, VOICE_TIMEOUT_MS);
      const samples = processVoice(fromS16LE(bytes), PCM_RATE, text);
      const durationMs = Math.round((samples.length / PCM_RATE) * 1000);
      const file = new File(dir, `${k}-${durationMs}.wav`);
      file.write(encodeWav(samples, PCM_RATE));
      evict(dir);
      return { uri: file.uri, durationMs, cached: false, took: Date.now() - started };
    })(),
    VOICE_TIMEOUT_MS,
  );

let player: AudioPlayer | null = null;

// Idempotent. A voice is decoration on a line that already arrived, so a
// player that refuses to stop must never take anything down with it.
export const stopVoice = (): void => {
  const p = player;
  player = null;
  if (!p) return;
  try {
    p.pause();
    p.remove();
  } catch {
    // already released
  }
};

export const playVoice = (prepared: Prepared): void => {
  stopVoice();
  // A line can take seconds to make, and the subject can leave in the middle
  // of it. The background handler has nothing to stop yet at that moment, so
  // without this she would start talking from a pocket (2026-10-13).
  if (AppState.currentState === 'background') return;
  try {
    const p = createAudioPlayer({ uri: prepared.uri });
    player = p;
    p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && player === p) stopVoice();
    });
    p.play();
  } catch {
    player = null;
  }
};
