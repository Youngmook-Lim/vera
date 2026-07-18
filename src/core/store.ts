import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import type { Lang } from './i18n';
import { KEYS, storage } from './storage';
import { assessCompliance, dayKey, prevDayKey } from './compliance';

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
  // compliance
  streak: number;
  standing: 'good' | 'review' | 'probation';
  lastComply: string | null;
  enrolledAt: string | null;
  missedPending: boolean;
  forfeited: number;
  setStep: (step: Step) => void;
  setLang: (lang: Lang) => void;
  setAdequacy: (adequacy: number) => void;
  setMotive: (motive: number) => void;
  nudgeDecline: () => void;
  poke: () => void;
  denyPermission: () => void;
  setNotif: (notif: boolean) => void;
  completeComply: (now?: Date) => Promise<void>;
  petitionReinstatement: () => Promise<void>;
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
  streak: 0,
  standing: 'good',
  lastComply: null,
  enrolledAt: null,
  missedPending: false,
  forfeited: 0,
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
  completeComply: async (now = new Date()) => {
    const { streak, lastComply } = get();
    const nextStreak = lastComply === prevDayKey(now) ? streak + 1 : 1;
    const today = dayKey(now);
    await Promise.all([
      storage.set(KEYS.streak, String(nextStreak)),
      storage.set(KEYS.lastComply, today),
    ]);
    set({ streak: nextStreak, lastComply: today });
  },
  petitionReinstatement: async () => {
    await Promise.all([
      storage.set(KEYS.standing, 'probation'),
      storage.remove(KEYS.missedPending),
    ]);
    set({ standing: 'probation', missedPending: false });
  },
  finishEnroll: async () => {
    const { lang, notif } = get();
    await Promise.all([
      storage.set(KEYS.enrolled, '1'),
      storage.set(KEYS.lang, lang),
      storage.set(KEYS.notif, notif ? '1' : '0'),
      storage.set(KEYS.enrolledAt, dayKey(new Date())),
    ]);
    set({ step: 'facility' });
  },
  hydrate: async () => {
    try {
      const [enrolled, storedLang, storedNotif, streakS, standingS, lastComply, enrolledAt, missedS, forfeitedS] =
        await Promise.all([
          storage.get(KEYS.enrolled),
          storage.get(KEYS.lang),
          storage.get(KEYS.notif),
          storage.get(KEYS.streak),
          storage.get(KEYS.standing),
          storage.get(KEYS.lastComply),
          storage.get(KEYS.enrolledAt),
          storage.get(KEYS.missedPending),
          storage.get(KEYS.forfeited),
        ]);
      const deviceKo = getLocales()[0]?.languageCode === 'ko';
      let streak = Number(streakS ?? '0');
      let standing = (standingS ?? 'good') as 'good' | 'review' | 'probation';
      let missedPending = missedS === '1';
      let forfeited = Number(forfeitedS ?? '0');
      const now = new Date();
      if (enrolled === '1' && !missedPending && assessCompliance(lastComply, now) === 'missed') {
        forfeited = streak;
        streak = 0;
        standing = 'review';
        missedPending = true;
        await Promise.all([
          storage.set(KEYS.forfeited, String(forfeited)),
          storage.set(KEYS.streak, '0'),
          storage.set(KEYS.standing, 'review'),
          storage.set(KEYS.missedPending, '1'),
        ]);
      }
      set({
        step: enrolled === '1' ? 'facility' : 'intake',
        lang: storedLang === 'ko' || (storedLang === null && deviceKo) ? 'ko' : 'en',
        notif: storedNotif !== '0',
        streak,
        standing,
        lastComply,
        enrolledAt,
        missedPending,
        forfeited,
        hydrated: true,
      });
    } catch {
      // Storage failure: fall back to fresh-install defaults rather than a
      // dead splash — replaying enrollment is the better worst case.
      set({ step: 'intake', hydrated: true });
    }
  },
}));
