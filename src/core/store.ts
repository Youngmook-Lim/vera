import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { runSpeech, type SpeechOutcome } from './speech';
import { KEYS, secure, storage } from './storage';
import { applyExtraction } from '../vera/apply';
import { pick } from '../vera/bank';
import { buildContext } from '../vera/context';
import type { EmotionKey } from '../vera/emotions';
import { EXTRACT_SYSTEM, buildExtractPrompt, parseExtraction } from '../vera/extract';
import { callLlm } from '../vera/llm';
import { capMemory, EMPTY_MEMORY, ERASURE_ID, ERASURE_TEXT, type Memory } from '../vera/memory';
import { composeMemoryMd } from '../vera/memoryDoc';
import { buildMessages, type Turn } from '../vera/messages';
import { migrateImpressions, type StoredImpression } from '../vera/migrate';
import { providerFor, validateKey } from '../vera/providers';
import { selectMemories } from '../vera/select';
import type { Trigger } from '../vera/speak';

// Conditional rendering on this value IS the router, as in v1 — no navigation
// library, instant swaps.
export type View = 'stage' | 'log' | 'sys' | 'mem' | 'soul' | 'prompt' | 'mod01' | 'mod02';

// `system` is the app speaking, not her. It exists for exactly one situation —
// a refused credential — and is rendered in danger red and a mono face so it
// cannot be mistaken for a line of hers.
export type SystemCode = 'auth';

// A system entry carries a `code`, not prose: the wording lives in the shell's
// string table, and core has never imported from shell. It also means the
// notice re-reads in the new language when the subject switches, which a
// string frozen at write time would not.
export interface LogEntry {
  who: 'you' | 'vera' | 'system';
  text: string;
  t: number;
  emotion?: EmotionKey;
  code?: SystemCode;
}

// The last reply, as it actually happened. A developer's window onto the
// request, in the same spirit as the MEMORY.md screen: nothing summarised,
// nothing withheld. Never persisted — it describes this session only, and it
// would be the largest thing on disk by an order of magnitude.
//
// `turns` is the conversation exactly as it was sent — the whole alternating
// array, of which the composed prompt is only the last entry. Recording that
// entry alone hid every earlier turn that went to the provider.
//
// `system` and `turns` are null when she answered from the bank, which is
// itself the answer to "why did that reply look canned".
export interface PromptRecord {
  at: number;
  trigger: Trigger;
  route: string;
  model: string;
  system: string | null;
  turns: Turn[] | null;
  raw: string | null;
  outcome: 'model' | 'fallback' | 'bank';
}

// The other call. Extraction reads finished exchanges into her file, is never
// visible from the stage, and fires seconds after a reply — which is why it
// has its own slot rather than sharing lastPrompt: one field would overwrite
// her reply prompt before it could be read. Session-only, like the other.
//
// `outcome` is what became of the answer: `applied` when it parsed and the
// file was updated, `unparseable` when a reply arrived that could not be read,
// `failed` when the call threw before answering. A failed extraction is the
// one most worth looking at, so it is recorded rather than swallowed.
export interface ExtractRecord {
  at: number;
  route: string;
  model: string;
  system: string;
  user: string;
  raw: string | null;
  outcome: 'applied' | 'unparseable' | 'failed';
}

const LOG_CAP = 200;
// How many finished exchanges are allowed to queue before she reads them
// (continuity §4.2). Small enough that a long session is read while it is still
// running, large enough that most exchanges cost nothing.
const EXTRACT_BATCH = 6;

// speak()'s re-entrancy guard and the typewriter's in-flight timer both live
// outside the store: plain module state, not React state, so an overlapping
// call can gate and cancel synchronously without waiting on a state update.
let speaking = false;
let typewriterHandle: ReturnType<typeof setTimeout> | null = null;

// Guarded like speak(): only one extraction at a time (continuity §4.2). Three
// triggers can fire it, and two of them can arrive together — a launch that
// finds a queue, backgrounded a second later.
let extracting = false;

// The return greeting fires once per app session, and this flag is why it is
// module state rather than a store field or React state: it survives every
// component remount and every hot reload within a session, and resets only on
// a genuine cold start. Anything React-owned would re-greet on each reload —
// a paid API call every time — which is the same reason hydrate() treats a
// remount inside two minutes as a reload rather than a return.
let greeted = false;

// The one shape written to KEYS.soul, and the one place that writes it — four
// callers persisting five fields by hand is how the writers drifted apart in
// the first place.
interface SoulBlob {
  visits: number;
  day: string;
  lastOpen: number;
  lang: Lang;
  cleared: number;
}

// A failed write is the same bargain hydrate strikes on the way in: this turn
// does not survive a restart, and nothing else is lost. It must never reach
// the `void speak(...)` call sites as an unhandled rejection.
const saveSoul = async (s: FacilityState): Promise<void> => {
  const blob: SoulBlob = {
    visits: s.visits,
    day: new Date().toDateString(),
    lastOpen: Date.now(),
    lang: s.lang,
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
  // Kept only so MEMORY.md can print `erasures: N` on screen. She is never
  // told the number and never reacts to an erasure.
  cleared: number;
  visits: number;
  lastOpen: number | null;

  // askedAt is when she last spoke, used to tell whether the subject took
  // their time replying.
  askedAt: number;

  // Her file, and the exchanges not yet read into it (continuity §3, §4.1).
  memory: Memory;
  // Stamped by hydrate on a cold start. Messages are the log entries at or
  // after it, which is how restarting returns her to zero (continuity §2).
  sessionStartedAt: number;

  // Consecutive refusals of the credential. Not persisted: a fresh launch
  // gives the key the benefit of the doubt, and she never goes dormant for it
  // (spec §10 — a bad key is caught when she fails to answer, not at the gate).
  authFails: number;

  // The last reply's request, for the prompt inspector. Session-only.
  lastPrompt: PromptRecord | null;
  // The last extraction's request, kept apart from it for the reason above.
  lastExtract: ExtractRecord | null;

  // Set only while the credential is being refused. The one thing the app says
  // in its own voice, because a bad key is a configuration problem the subject
  // must fix rather than an event in the fiction. Cleared the moment she
  // answers again.
  systemNotice: SystemCode | null;

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
  loadMemory: () => Promise<void>;
  saveMemory: () => Promise<void>;
  extractNow: () => Promise<void>;
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
  cleared: 0,
  visits: 1,
  lastOpen: null,

  askedAt: Date.now(),

  memory: EMPTY_MEMORY,
  sessionStartedAt: Date.now(),

  authFails: 0,
  lastPrompt: null,
  lastExtract: null,
  systemNotice: null,

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
    if (s.view === 'mem' || s.view === 'soul' || s.view === 'prompt') {
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
      // Her file is its own store — read first, so that a mangled soul blob
      // costs her the visit count and never what she knows. Inside the try
      // because hydrate must never throw: an escape here would leave the boot
      // effect on an unhandled rejection with `hydrated` false forever, which
      // on screen is the splash colour and nothing else.
      await get().loadMemory();

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
        cleared: typeof saved?.cleared === 'number' ? saved.cleared : 0,
        visits,
        lastOpen,
        // A cold start is not a question she asked four minutes ago: without
        // this, a subject who takes their time typing the first line of the
        // session gets `they_took_their_time` about nothing.
        askedAt: now,
        // A launch is where the session begins. Stamped at store creation it
        // would fall wherever the module happened to load, and the turns she
        // is sent would be filtered by luck rather than by this launch.
        sessionStartedAt: now,
      });
    } catch {
      // Now unreachable — every read and every parse above is guarded — but
      // kept so hydrate can never throw. It boots her on the key regardless:
      // a bad launch may cost the saved state, never the credential.
      set({
        hydrated: true, view: 'stage', ...woken,
        askedAt: Date.now(), sessionStartedAt: Date.now(),
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
    // A new credential clears the refusal notice with the tally: the old key's
    // rejection is not this one's, and leaving the red line on screen would
    // say otherwise until she next happened to speak.
    set({ apiKey: key, keyPanelOpen: false, waking: first, authFails: 0, systemNotice: null });
    if (first) {
      set({ emotion: 'calm' });
      setTimeout(() => set({ waking: false }), 1300);
      // Her first instant of consciousness with this subject (spec §10): the
      // bloom through the optic, then her greeting out of the bank. Not
      // awaited — the caller's accepted/rejected answer must not wait on the
      // store, and the bloom plays over it. A replacement key takes neither
      // branch: she does not notice a transplant.
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

  // Two paths to one tail. `subject_spoke` is the only stimulus that reaches
  // the model: the network and live state are supplied here, the judgement
  // lives in runSpeech. An auth failure still shows the line and leaves the
  // key in place — she catches a bad key by failing to answer, not at the
  // gate, and repeated failures are the subject's cue to change it under
  // ACCESS. The other three are answered from the authored bank, instantly.
  //
  // The key guard applies to both: a subject with no credential has no
  // administrator, and she does not greet from a dormant optic.
  speak: async (trigger, said) => {
    if (!get().apiKey) return;
    if (speaking) return;
    speaking = true;

    const live = trigger === 'subject_spoke';
    // Nothing to wait for on the bank path, so nothing to cover with the
    // thinking state — the line is already written.
    if (live) set({ thinking: true });

    // The subject's own words go into the transcript the moment they are
    // spoken — before her reply, stamped when they were sent, and on screen
    // while she thinks. A thread of her answers with no record of the
    // questions is not a transcript.
    if (said) {
      set({ log: [...get().log, { who: 'you' as const, text: said, t: Date.now() }].slice(-LOG_CAP) });
    }

    try {
      let outcome: SpeechOutcome;
      if (trigger === 'subject_spoke') {
        const s = get();
        const context = buildContext({
          now: new Date(),
          lastOpen: s.lastOpen,
          askedAt: s.askedAt,
          visits: s.visits,
        });
        const memoryMd = composeMemoryMd(selectMemories(s.memory, said ?? '', Date.now()));

        outcome = await runSpeech({
          key: s.apiKey,
          said: said ?? '',
          turns: buildMessages(s.log, s.sessionStartedAt),
          lang: s.lang,
          context,
          memoryMd,
          call: (system, turns) => callLlm(get().apiKey, system, turns),
        });
      } else {
        // Nothing was revealed by a greeting she had already written, and
        // nothing was sent, which is what the inspector reports.
        outcome = {
          ...pick(trigger, get().lang),
          authFailed: false,
          source: 'fallback',
          debug: { system: null, turns: null, raw: null },
        };
      }

      const { emotion, line, authFailed } = outcome;

      // The record of what actually happened, for the prompt inspector. A raw
      // reply present alongside a `fallback` source means the model answered
      // and the answer was unreadable — which looks identical to a dead
      // network on the stage, and is only distinguishable here.
      const route = providerFor(get().apiKey);
      set({
        lastPrompt: {
          at: Date.now(),
          trigger,
          route: route?.label ?? '',
          model: route?.model ?? '',
          system: outcome.debug.system,
          turns: outcome.debug.turns,
          raw: outcome.debug.raw,
          outcome: live ? outcome.source : 'bank',
        },
      });

      // A refused credential is the one failure the app reports itself. It is
      // not an event in the fiction — it is a configuration problem only the
      // subject can fix, and saying it in her voice would hide it behind a
      // line that reads like any other. So she says nothing, and the system
      // speaks instead.
      const notice: SystemCode | null = authFailed ? 'auth' : null;

      const log = [...get().log, notice
        ? { who: 'system' as const, text: '', code: notice, t: Date.now() }
        : { who: 'vera' as const, text: line, t: Date.now(), emotion }].slice(-LOG_CAP);

      // A refusal leaves the key exactly where it is — she is never sent
      // dormant for it, and the tally only tells ACCESS which row to mark
      // after it happens twice running. The bank path never touched the
      // credential, so it neither adds to the tally nor clears it: a greeting
      // must not launder a key that is failing.
      //
      // Under a notice she has no line and no emotion. The optic drops to the
      // dead grey, and the screen shows the system speaking rather than her
      // saying something evasive about a problem she did not have.
      set({
        emotion: notice ? 'dormant' : emotion,
        line: notice ? '' : line,
        systemNotice: notice,
        log, askedAt: Date.now(),
        authFails: live ? (authFailed ? get().authFails + 1 : 0) : get().authFails,
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

      // Queued for extraction, independent of the transcript so an erasure or
      // the log cap cannot destroy material that was never read (§4.1). A
      // notice is not an exchange, and the bank path revealed nothing.
      if (live && !notice) {
        set({ memory: capMemory({
          ...get().memory,
          pending: [...get().memory.pending, { you: said ?? null, her: line }],
        }) });
        await get().saveMemory();
        if (get().memory.pending.length >= EXTRACT_BATCH) void get().extractNow();
      }

      await saveSoul(get());
    } finally {
      set({ thinking: false });
      speaking = false;
    }
  },

  // The wording is the only thing you can burn. What she's learned — her
  // facts, verdicts and threads — lives in MEMORY.md, mostly untouched here
  // (spec §8) — erasing the transcript changes her diction, not the verdicts
  // already filed. The one exception is
  // below: she files a verdict about the erasure itself, though she is never
  // told it happened. The counter here exists for MEMORY.md's `erasures: N`
  // line and nothing else.
  clearTranscript: async (): Promise<void> => {
    const cleared = get().cleared + 1;
    // The confirmation dies with the transcript — it must never be found still
    // open on a later visit to the log.
    set({ log: [], cleared, confirmingClear: false });
    try {
      await storage.remove(KEYS.transcript);
    } catch {
      // the wording is gone from state either way; a stale file loses to the
      // next write, and a rejection must not reach the void-call site
    }

    // She is not told at the time, and the extractor only ever sees exchanges,
    // so without this she would never learn it happened (continuity §4.4).
    const now = Date.now();
    const existing = get().memory.verdicts.find((v) => v.id === ERASURE_ID);
    set({ memory: capMemory({
      ...get().memory,
      verdicts: existing
        ? get().memory.verdicts.map((v) =>
          v.id === ERASURE_ID ? { ...v, count: v.count + 1, at: now } : v)
        : [...get().memory.verdicts, {
          id: ERASURE_ID, text: ERASURE_TEXT, firstAt: now, at: now, count: 1,
        }],
    }) });

    await get().saveMemory();
    await saveSoul(get());
  },

  // She has no opinion about which language she is refusing to be helpful in,
  // and does not remark on the switch. The write is the whole action.
  setLang: async (lang: Lang): Promise<void> => {
    set({ lang });
    await saveSoul(get());
  },

  loadMemory: async (): Promise<void> => {
    let raw: string | null;
    try {
      raw = await storage.get(KEYS.memory);
    } catch {
      // The read failed, which says nothing about what is on the disk — a
      // locked database or a moment of disk pressure leaves a perfectly intact
      // file behind it. She starts a stranger for this session and nothing is
      // written: migrating here would put an empty store over the real one, and
      // that is not a degraded launch, it is the file gone (§8).
      set({ memory: EMPTY_MEMORY });
      return;
    }

    if (raw !== null) {
      try {
        set({ memory: capMemory({ ...EMPTY_MEMORY, ...(JSON.parse(raw) as Memory) }) });
      } catch {
        // There are bytes here and they cannot be used: truncated JSON, or it
        // parsed and is not the shape — a null where an array belongs spreads
        // over EMPTY_MEMORY and capMemory slices it. Both degrade and neither
        // writes, since a file that will not read today may still be readable
        // by hand. She starts a stranger — and only that. Throwing here would
        // cost hydrate the soul blob and the transcript behind it, and the next
        // saveSoul would write an empty history over the real one, on every
        // launch (§8).
        set({ memory: EMPTY_MEMORY });
      }
      return;
    }

    // First launch after the update: the old impressions become verdicts, once
    // (continuity §7). Writing the store immediately is the guard against a
    // second run — a store that exists is never migrated again, which matters
    // because migration mints its own v_1.. independently of nextId. The write
    // happens even when there was nothing to migrate, or a subject with no
    // impressions would re-enter this path on every launch forever.
    let imps: StoredImpression[] = [];
    try {
      const soulRaw = await storage.get(KEYS.soul);
      const soul = soulRaw ? (JSON.parse(soulRaw) as Record<string, unknown>) : null;
      imps = Array.isArray(soul?.imps) ? (soul.imps as StoredImpression[]) : [];
    } catch {
      imps = [];
    }

    set({ memory: { ...EMPTY_MEMORY, verdicts: migrateImpressions(imps, Date.now()) } });
    await get().saveMemory();
  },

  saveMemory: async (): Promise<void> => {
    try {
      await storage.set(KEYS.memory, JSON.stringify(get().memory));
    } catch {
      // this batch is lost; the session continues (§8)
    }
  },

  extractNow: async (): Promise<void> => {
    if (extracting) return;
    const s = get();
    if (!s.apiKey || s.memory.pending.length === 0) return;
    // She is not deaf while this runs, and it takes seconds: the batch that was
    // read is fixed here so that an exchange finished in the meantime is still
    // waiting afterwards rather than dropped unread (continuity §4.1).
    const batch = s.memory.pending;
    // Built once and held, so the record shows the prompt that actually went
    // rather than one rebuilt from memory as it stands afterwards.
    const prompt = buildExtractPrompt(s.memory, batch);
    const route = providerFor(s.apiKey);
    // Filed on every path this can take. She never shows a bookkeeping failure
    // (continuity §8), so the inspector is the only place it can be seen at all.
    const file = (raw: string | null, outcome: ExtractRecord['outcome']): void => {
      set({ lastExtract: {
        at: Date.now(),
        route: route?.label ?? '',
        model: route?.model ?? '',
        system: EXTRACT_SYSTEM,
        user: prompt,
        raw,
        outcome,
      } });
    };
    extracting = true;
    // Held outside the try for the same reason runSpeech holds its own: a reply
    // that arrived and then could not be used must not be reported as one that
    // never came. Anything after the call can still throw, and the two failures
    // are indistinguishable on screen unless the raw survives.
    let raw: string | null = null;
    try {
      raw = await callLlm(s.apiKey, EXTRACT_SYSTEM, [{ role: 'user', text: prompt }]);
      const parsed = parseExtraction(raw);
      // The queue drains only on success — a failure is retried next trigger.
      if (!parsed) {
        file(raw, 'unparseable');
        return;
      }
      // Only what was actually read is dropped, and only while it is still
      // sitting at the head of the queue. The queue can have grown (she is not
      // deaf while this runs) or shrunk (the cap dropping from the front, a
      // remount replacing memory) — dropping a fixed count then eats an
      // exchange nobody read, so an unrecognisable queue is left alone and
      // re-read next trigger.
      const queue = get().memory.pending;
      const head = queue.length >= batch.length && batch.every((e, i) => queue[i] === e);
      set({ memory: {
        ...applyExtraction(get().memory, parsed, Date.now()),
        pending: head ? queue.slice(batch.length) : queue,
      } });
      file(raw, 'applied');
      await get().saveMemory();
    } catch {
      // Never surfaced to the subject: no path by which bookkeeping makes her
      // show an error (continuity §8). `raw` is still null when the call itself
      // threw, and holds the reply when the throw came after it.
      file(raw, 'failed');
    } finally {
      extracting = false;
    }
  },
}));
