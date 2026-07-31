import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { KEYS, secure, storage } from './storage';
import type { EmotionKey } from '../vera/emotions';
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
    try {
      const [soulRaw, logRaw, key] = await Promise.all([
        storage.get(KEYS.soul),
        storage.get(KEYS.transcript),
        secure.get(),
      ]);

      const deviceKo = getLocales()[0]?.languageCode === 'ko';
      const saved = soulRaw ? (JSON.parse(soulRaw) as Record<string, unknown>) : null;
      const log = logRaw ? (JSON.parse(logRaw) as LogEntry[]) : [];

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
        apiKey: key,
        emotion: key ? 'calm' : 'dormant',
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
      // Storage failure: boot dormant rather than dead. She asks for a key, and
      // the worst case is one re-entry.
      set({
        hydrated: true, view: 'stage', emotion: 'dormant', apiKey: '',
        hunger: START_HUNGER, lastFed: null,
      });
    }
  },
}));
