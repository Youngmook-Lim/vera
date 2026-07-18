import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { KEYS, storage } from './storage';

// The prototype routes every screen on this single value; conditional
// rendering on `step` IS the router (docs/architecture.md).
export const STEPS = [
  'intake',
  'baseline',
  'consent',
  'assigned',
  'permission',
  'facility',
  'settings',
  'daily',
  'missed',
  'results',
  'incinerator',
  'field',
  'organism',
  'hazard',
  'notiflog',
] as const;
export type Step = (typeof STEPS)[number];

interface FacilityState {
  step: Step;
  lang: Lang;
  hydrated: boolean;
  // enrollment (mock defaults: adequacy 64, motive 1)
  adequacy: number;
  motive: number;
  decline: number;
  poked: boolean;
  permDenied: boolean;
  notif: boolean;
  setStep: (step: Step) => void;
  setLang: (lang: Lang) => void;
  setAdequacy: (adequacy: number) => void;
  setMotive: (motive: number) => void;
  nudgeDecline: () => void;
  poke: () => void;
  denyPermission: () => void;
  setNotif: (notif: boolean) => void;
  finishEnroll: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useFacilityStore = create<FacilityState>((set, get) => ({
  step: 'intake', // hydrate() decides for real; App renders nothing until then
  lang: 'en',
  hydrated: false,
  adequacy: 64,
  motive: 1,
  decline: 0,
  poked: false,
  permDenied: false,
  notif: true,
  setStep: (step) => set({ step }),
  setLang: (lang) => {
    set({ lang });
    void storage.set(KEYS.lang, lang);
  },
  setAdequacy: (adequacy) => set({ adequacy }),
  setMotive: (motive) => set({ motive }),
  nudgeDecline: () => set((s) => ({ decline: s.decline + 1 })),
  poke: () => set({ poked: true }),
  denyPermission: () => set({ permDenied: true, notif: false }),
  setNotif: (notif) => set({ notif }),
  finishEnroll: async () => {
    const { lang, notif } = get();
    await Promise.all([
      storage.set(KEYS.enrolled, '1'),
      storage.set(KEYS.lang, lang),
      storage.set(KEYS.notif, notif ? '1' : '0'),
    ]);
    set({ step: 'facility' });
  },
  hydrate: async () => {
    try {
      const [enrolled, storedLang, storedNotif] = await Promise.all([
        storage.get(KEYS.enrolled),
        storage.get(KEYS.lang),
        storage.get(KEYS.notif),
      ]);
      const deviceKo = getLocales()[0]?.languageCode === 'ko';
      set({
        step: enrolled === '1' ? 'facility' : 'intake',
        lang: storedLang === 'ko' || (storedLang === null && deviceKo) ? 'ko' : 'en',
        notif: storedNotif !== '0',
        hydrated: true,
      });
    } catch {
      // Storage failure: fall back to fresh-install defaults rather than a
      // dead splash — replaying enrollment is the better worst case.
      set({ step: 'intake', hydrated: true });
    }
  },
}));
