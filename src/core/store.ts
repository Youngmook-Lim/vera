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
import { START_HUNGER, feed as feedHunger, hungerForNow } from '../modules/organism/hunger';

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

// The return greeting fires once per app session, and this flag is why it is
// module state rather than a store field or React state: it survives every
// component remount and every hot reload within a session, and resets only on
// a genuine cold start. Anything React-owned would re-greet on each reload —
// a paid API call every time — which is the same reason hydrate() treats a
// remount inside two minutes as a reload rather than a return.
let greeted = false;

// The one shape written to KEYS.soul, and the one place that writes it — four
// callers persisting nine fields by hand is how the writers drifted apart in
// the first place.
interface SoulBlob {
  mem: Exchange[];
  visits: number;
  day: string;
  lastOpen: number;
  hunger: number;
  hungerAt: string | null;
  lang: Lang;
  imps: Impression[];
  cleared: number;
}

// THE HUNGER INVARIANT: `hunger` and `hungerAt` are always a consistent pair —
// the number is the specimen's hunger AT that instant, never a value that has
// drifted since. hydrate re-derives hunger for `now` as stored-plus-drift, so
// persisting the live (already drifted) hunger beside an OLDER timestamp makes
// hydrate apply the same drift a second time; within a few sessions the
// specimen pins at 100 and is permanently suffering in her context.
//
// Only feedSpecimen (a real feed) and hydrate (which measures hunger for now)
// may set either field, and both always set both. Everything else — including
// every writer below — copies the live pair verbatim and never invents a
// timestamp for it. That is why this function takes the whole state and reads
// both fields itself: there is no seam left to get it wrong at.
//
// A failed write is the same bargain hydrate strikes on the way in: this turn
// does not survive a restart, and nothing else is lost. It must never reach
// the `void speak(...)` call sites as an unhandled rejection.
const saveSoul = async (s: FacilityState): Promise<void> => {
  const blob: SoulBlob = {
    mem: s.mem,
    visits: s.visits,
    day: new Date().toDateString(),
    lastOpen: Date.now(),
    hunger: s.hunger,
    hungerAt: s.hungerAt,
    lang: s.lang,
    imps: s.impressions,
    cleared: s.cleared,
  };
  try {
    await storage.set(KEYS.soul, JSON.stringify(blob));
  } catch {
    // an unwritable disk — she keeps this turn in memory and loses it on exit
  }
};

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
  // hungerAt is when `hunger` was measured, not merely when it was last fed:
  // see THE HUNGER INVARIANT above.
  hunger: number;
  hungerAt: string | null;

  // Consecutive refusals of the credential. Not persisted: a fresh launch
  // gives the key the benefit of the doubt, and she never goes dormant for it
  // (spec §10 — a bad key is caught when she fails to answer, not at the gate).
  authFails: number;

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
  greetOnce: () => Promise<void>;
  activate: (raw: string) => Promise<boolean>;
  removeKey: () => Promise<void>;
  speak: (trigger: Trigger, said?: string) => Promise<void>;
  clearTranscript: () => Promise<void>;
  setLang: (lang: Lang) => Promise<void>;
  feedSpecimen: () => Promise<void>;
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
  hungerAt: null,
  authFails: 0,

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

      // The stored pair, read as a pair (THE HUNGER INVARIANT above).
      const storedHungerAt = typeof saved?.hungerAt === 'string' ? saved.hungerAt : null;

      set({
        hydrated: true,
        ...woken,
        lang: saved?.lang === 'ko' || (saved?.lang == null && deviceKo) ? 'ko' : 'en',
        log: Array.isArray(log) ? log.slice(-LOG_CAP) : [],
        impressions: Array.isArray(saved?.imps) ? (saved.imps as Impression[]).slice(-IMPRESSION_CAP) : [],
        // The rolling short-term memory, same guard-then-cap treatment as
        // impressions above — a corrupt or oversized blob degrades to [] or
        // to its newest six, never a throw.
        mem: Array.isArray(saved?.mem) ? (saved.mem as Exchange[]).slice(-MEM_CAP) : [],
        cleared: typeof saved?.cleared === 'number' ? saved.cleared : 0,
        visits,
        lastOpen,
        // Hunger is not read back as stored — it is stored-plus-drift, so the
        // specimen is hungrier than you left it (spec §12).
        hunger: hungerForNow(
          typeof saved?.hunger === 'number' ? saved.hunger : null,
          storedHungerAt,
          new Date(),
        ),
        // …and the drifted value is hunger as of NOW, so now is the instant it
        // was measured at. Carrying the older stamp forward here is exactly
        // the double-drift the invariant forbids. An unanchored specimen (never
        // fed, nothing stored) stays unanchored and reads START_HUNGER.
        hungerAt: storedHungerAt == null ? null : new Date().toISOString(),
        // A cold start is not a question she asked four minutes ago: without
        // this, a subject who takes their time typing the first line of the
        // session gets `they_took_their_time` about nothing.
        askedAt: now,
      });
    } catch {
      // Now unreachable — every read and every parse above is guarded — but
      // kept so hydrate can never throw. It boots her on the key regardless:
      // a bad launch may cost the saved state, never the credential.
      set({
        hydrated: true, view: 'stage', ...woken,
        hunger: START_HUNGER, hungerAt: null, askedAt: Date.now(),
      });
    }
  },

  // She notices you came back — once per app session, after hydrate has
  // settled whether she has a key at all. The apiKey guard is deliberate
  // duplication of speak()'s own early return: without it a dormant launch
  // would burn the session's one greeting on a call that says nothing, and
  // the subject would then activate her into silence.
  greetOnce: async (): Promise<void> => {
    if (greeted) return;
    if (!get().apiKey) return;
    greeted = true;
    await get().speak('open');
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
    // A new credential starts on a clean tally — the old key's refusals are
    // not this one's.
    set({ apiKey: key, keyPanelOpen: false, waking: first, authFails: 0 });
    if (first) {
      set({ emotion: 'calm' });
      setTimeout(() => set({ waking: false }), 1300);
      // Her first instant of consciousness with this subject (spec §10): the
      // bloom through the optic, then a line generated live under ACT_SYS.
      // Not awaited — the caller's accepted/rejected answer must not wait on
      // the network, and the bloom plays while she thinks. A replacement key
      // takes neither branch: she does not notice a transplant.
      void get().speak('activation');
      // A session that begins with the activation greeting must not also get
      // the return greeting the moment something calls greetOnce.
      greeted = true;
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

    // The subject's own words go into the transcript the moment they are
    // spoken — before her reply, stamped when they were sent, and on screen
    // while she thinks. A thread of her answers with no record of the
    // questions is not a transcript.
    if (said) {
      set({ log: [...get().log, { who: 'you' as const, text: said, t: Date.now() }].slice(-LOG_CAP) });
    }

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

      const { emotion, line, impression, seal, authFailed } = outcome;

      const log = [...get().log, { who: 'vera' as const, text: line, t: Date.now(), emotion }].slice(-LOG_CAP);
      const impressions = impression
        ? [...get().impressions, { text: impression, at: mmmdd(Date.now()), sealed: seal }].slice(-IMPRESSION_CAP)
        : get().impressions;
      const mem = [...get().mem, { you: said ?? null, her: line }].slice(-MEM_CAP);

      // A refusal shows a line like any other failure and leaves the key
      // exactly where it is — the tally is only so ACCESS can mark the
      // credential as the thing to look at after it happens twice running.
      set({
        emotion, line, log, impressions, mem, askedAt: Date.now(),
        authFails: authFailed ? get().authFails + 1 : 0,
      });
      try {
        await storage.set(KEYS.transcript, JSON.stringify(log));
      } catch {
        // an unwritable disk — her reply stands on screen, it just does not
        // survive a restart
      }

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

      await saveSoul(get());
    } finally {
      set({ thinking: false });
      speaking = false;
    }
  },

  // The wording is the only thing you can burn. Her impressions live in
  // MEMORY.md, untouched here (spec §8) — erasing the transcript changes her
  // diction, never her verdict.
  clearTranscript: async (): Promise<void> => {
    const cleared = get().cleared + 1;
    // The confirmation dies with the transcript — it must never be found still
    // open on a later visit to the log.
    set({ log: [], mem: [], cleared, confirmingClear: false });
    try {
      await storage.remove(KEYS.transcript);
    } catch {
      // the wording is gone from state either way; a stale file loses to the
      // next write, and a rejection must not reach the void-call site
    }
    await saveSoul(get());
    await get().speak('subject_erased_the_transcript');
  },

  // Persisted before speak() is even asked, because speak() no-ops without a
  // key (spec: dormant subjects can still switch languages) and its own
  // soul-write would otherwise be the only copy of the new lang on disk.
  setLang: async (lang: Lang): Promise<void> => {
    set({ lang });
    await saveSoul(get());
    await get().speak('language_switched');
  },

  // A tap on the vivarium. Persisted before speak() is even asked, same as
  // setLang above — speak() no-ops without a key, and its own soul-write
  // would otherwise be the only copy of the new hunger on disk.
  feedSpecimen: async (): Promise<void> => {
    // The one place a real feed happens, and one of only two allowed to touch
    // the pair (THE HUNGER INVARIANT above) — the new value is measured now.
    set({ hunger: feedHunger(get().hunger), hungerAt: new Date().toISOString() });
    await saveSoul(get());
    await get().speak('subject_fed_the_specimen');
  },
}));
