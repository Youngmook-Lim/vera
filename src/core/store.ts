import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { runSpeech } from './speech';
import { KEYS, secure, storage } from './storage';
import { buildContext, type Exchange } from '../vera/context';
import type { EmotionKey } from '../vera/emotions';
import { callLlm } from '../vera/llm';
import { validateKey } from '../vera/providers';
import type { Trigger } from '../vera/speak';
import { START_HUNGER, hungerForNow } from '../modules/organism/hunger';

// Conditional rendering on this value IS the router, as in v1 — no navigation
// library, instant swaps.
export type View = 'stage' | 'log' | 'sys' | 'mem' | 'soul' | 'mod01' | 'mod02';

export interface LogEntry {
  who: 'you' | 'vera';
  text: string;
  t: number;
  emotion?: EmotionKey;
}

export interface Impression {
  text: string;
  at: string;
  sealed: boolean;
}

const LOG_CAP = 60;
const IMPRESSION_CAP = 24;
const MEM_CAP = 6;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const mmmdd = (t: number): string => {
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
};

// speak()'s re-entrancy guard and the typewriter's in-flight timer both live
// outside the store: plain module state, not React state, so an overlapping
// call can gate and cancel synchronously without waiting on a state update.
let speaking = false;
let typewriterHandle: ReturnType<typeof setTimeout> | null = null;

interface FacilityState {
  hydrated: boolean;
  view: View;
  lang: Lang;
  apiKey: string;

  emotion: EmotionKey;
  line: string;
  shown: string;
  thinking: boolean;
  draft: string;
  waking: boolean;

  log: LogEntry[];
  impressions: Impression[];
  cleared: number;
  visits: number;
  lastOpen: number | null;

  // The rolling memory of the last six exchanges, fed to buildContext as
  // recent_exchanges. askedAt is when she last spoke, used to tell whether
  // the subject took their time replying.
  mem: Exchange[];
  askedAt: number;

  // Specimen-03 lives in the shell's state because she is told about it —
  // hunger reaches her context object (spec §11), so the module cannot own it.
  hunger: number;
  lastFed: string | null;

  cabinetOpen: boolean;
  keyPanelOpen: boolean;
  confirmingClear: boolean;

  setView: (view: View) => void;
  setDraft: (draft: string) => void;
  setCabinet: (open: boolean) => void;
  setKeyPanel: (open: boolean) => void;
  setConfirmingClear: (confirming: boolean) => void;
  stepBack: () => boolean;
  hydrate: () => Promise<void>;
  activate: (raw: string) => Promise<boolean>;
  removeKey: () => Promise<void>;
  speak: (trigger: Trigger, said?: string) => Promise<void>;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
  hydrated: false,
  view: 'stage',
  lang: 'en',
  apiKey: '',

  emotion: 'dormant',
  line: '',
  shown: '',
  thinking: false,
  draft: '',
  waking: false,

  log: [],
  impressions: [],
  cleared: 0,
  visits: 1,
  lastOpen: null,

  mem: [],
  askedAt: Date.now(),

  hunger: START_HUNGER,
  lastFed: null,

  cabinetOpen: false,
  keyPanelOpen: false,
  confirmingClear: false,

  setView: (view) => set({ view, cabinetOpen: false }),
  setDraft: (draft) => set({ draft }),
  setCabinet: (cabinetOpen) => set({ cabinetOpen }),
  setKeyPanel: (keyPanelOpen) => set({ keyPanelOpen }),
  setConfirmingClear: (confirmingClear) => set({ confirmingClear }),

  // One step out, never a jump. Returns false only when there is nothing left
  // to close, which is the signal to let the OS exit.
  stepBack: () => {
    const s = get();
    if (s.keyPanelOpen) {
      set({ keyPanelOpen: false });
      return true;
    }
    if (s.cabinetOpen) {
      set({ cabinetOpen: false });
      return true;
    }
    if (s.view === 'mem' || s.view === 'soul') {
      set({ view: 'sys' });
      return true;
    }
    if (s.view !== 'stage') {
      set({ view: 'stage', confirmingClear: false });
      return true;
    }
    return false;
  },

  hydrate: async () => {
    // The credential is settled before AsyncStorage is touched at all.
    // secure.get() swallows its own failures, so this cannot throw, and whether
    // she has a key has nothing to do with the state of the other stores: if
    // the keystore holds one she wakes, however mangled everything else is.
    const key = await secure.get();
    const woken = { apiKey: key, emotion: key ? ('calm' as const) : ('dormant' as const) };

    try {
      let soulRaw: string | null = null;
      let logRaw: string | null = null;
      try {
        [soulRaw, logRaw] = await Promise.all([
          storage.get(KEYS.soul),
          storage.get(KEYS.transcript),
        ]);
      } catch {
        // unreadable disk — she still wakes on the key alone
      }

      // Each blob is parsed on its own. A truncated transcript must not cost
      // her the soul store (or the credential), and nothing here rewrites
      // valid JSON until she next speaks, so a shared catch would repeat the
      // loss on every launch.
      let saved: Record<string, unknown> | null = null;
      try {
        saved = soulRaw ? (JSON.parse(soulRaw) as Record<string, unknown>) : null;
      } catch {
        saved = null;
      }
      let log: LogEntry[] = [];
      try {
        log = logRaw ? (JSON.parse(logRaw) as LogEntry[]) : [];
      } catch {
        log = [];
      }

      const deviceKo = getLocales()[0]?.languageCode === 'ko';

      const now = Date.now();
      const lastOpen = typeof saved?.lastOpen === 'number' ? saved.lastOpen : null;
      const sameDay = saved?.day === new Date().toDateString();
      // A remount within two minutes is a reload, not a return — without this
      // hot reload inflates the count into the hundreds.
      const isReload = lastOpen != null && now - lastOpen < 120_000;
      const visits = sameDay
        ? Math.min(99, (typeof saved?.visits === 'number' ? saved.visits : 0) + (isReload ? 0 : 1))
        : 1;

      set({
        hydrated: true,
        ...woken,
        lang: saved?.lang === 'ko' || (saved?.lang == null && deviceKo) ? 'ko' : 'en',
        log: Array.isArray(log) ? log.slice(-LOG_CAP) : [],
        impressions: Array.isArray(saved?.imps) ? (saved.imps as Impression[]).slice(-IMPRESSION_CAP) : [],
        cleared: typeof saved?.cleared === 'number' ? saved.cleared : 0,
        visits,
        lastOpen,
        // Hunger is not read back as stored — it is stored-plus-drift, so the
        // specimen is hungrier than you left it (spec §12).
        hunger: hungerForNow(
          typeof saved?.hunger === 'number' ? saved.hunger : null,
          typeof saved?.lastFed === 'string' ? saved.lastFed : null,
          new Date(),
        ),
        lastFed: typeof saved?.lastFed === 'string' ? saved.lastFed : null,
      });
    } catch {
      // Now unreachable — every read and every parse above is guarded — but
      // kept so hydrate can never throw. It boots her on the key regardless:
      // a bad launch may cost the saved state, never the credential.
      set({
        hydrated: true, view: 'stage', ...woken,
        hunger: START_HUNGER, lastFed: null,
      });
    }
  },

  // Returns whether the key was ACCEPTED, not whether this was her first
  // activation — a caller replacing an existing key must not read a good key
  // as a rejection. The first-activation/waking behaviour stays internal:
  // state (`waking`, `emotion`) is how the UI learns about it.
  activate: async (raw: string): Promise<boolean> => {
    const check = validateKey(raw);
    if (!check.ok) return false;
    const key = raw.trim();
    const first = !get().apiKey;
    await secure.set(key);
    set({ apiKey: key, keyPanelOpen: false, waking: first });
    if (first) {
      set({ emotion: 'calm' });
      setTimeout(() => set({ waking: false }), 1300);
    }
    return true;
  },

  // She goes dormant mid-sentence. MEMORY.md is untouched underneath — waking
  // her again is a new first greeting over an old file (spec §10).
  removeKey: async (): Promise<void> => {
    await secure.remove();
    set({
      apiKey: '', keyPanelOpen: false, view: 'stage',
      emotion: 'dormant', line: '', shown: '', thinking: false,
    });
  },

  // The thin wiring: the network and live state are supplied here, the
  // judgement lives in runSpeech. An auth failure still shows the line and
  // leaves the key in place — she catches a bad key by failing to answer,
  // not at the gate, and repeated failures are the subject's cue to change
  // it under ACCESS.
  speak: async (trigger, said) => {
    if (!get().apiKey) return;
    if (speaking) return;
    speaking = true;
    set({ thinking: true });

    try {
      const s = get();
      const context = buildContext({
        now: new Date(),
        lastOpen: s.lastOpen,
        askedAt: s.askedAt,
        visits: s.visits,
        hunger: s.hunger,
        cleared: s.cleared,
        mem: s.mem,
        impressions: s.impressions.map((imp) => imp.text),
      });

      const outcome = await runSpeech({
        key: s.apiKey,
        trigger,
        said: said ?? null,
        lang: s.lang,
        context,
        call: (system, user) => callLlm(get().apiKey, system, user),
      });

      const { emotion, line, impression, seal } = outcome;

      const log = [...get().log, { who: 'vera' as const, text: line, t: Date.now(), emotion }].slice(-LOG_CAP);
      const impressions = impression
        ? [...get().impressions, { text: impression, at: mmmdd(Date.now()), sealed: seal }].slice(-IMPRESSION_CAP)
        : get().impressions;
      const mem = [...get().mem, { you: said ?? null, her: line }].slice(-MEM_CAP);

      set({ emotion, line, log, impressions, mem, askedAt: Date.now() });
      await storage.set(KEYS.transcript, JSON.stringify(log));

      // A new typewriter always cancels whatever was still ticking — the
      // guard above only blocks a second network call, not a leftover timer
      // from the previous reply's animation.
      if (typewriterHandle) clearTimeout(typewriterHandle);
      set({ shown: '' });
      if (line.length > 0) {
        const tick = (i: number) => {
          set({ shown: line.slice(0, i) });
          typewriterHandle = i < line.length ? setTimeout(() => tick(i + 1), 16) : null;
        };
        typewriterHandle = setTimeout(() => tick(1), 16);
      }

      await storage.set(KEYS.soul, JSON.stringify({
        mem,
        visits: get().visits,
        day: new Date().toDateString(),
        lastOpen: Date.now(),
        hunger: get().hunger,
        lastFed: get().lastFed,
        lang: get().lang,
        imps: impressions,
        cleared: get().cleared,
      }));
    } finally {
      set({ thinking: false });
      speaking = false;
    }
  },
}));
