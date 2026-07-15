import { create } from "zustand";
import type { Lang } from "./i18n";

// The prototype routes every screen on this single value; conditional
// rendering on `step` IS the router (docs/architecture.md).
export const STEPS = [
  "intake",
  "baseline",
  "consent",
  "assigned",
  "permission",
  "facility",
  "settings",
  "daily",
  "missed",
  "results",
  "incinerator",
  "field",
  "organism",
  "hazard",
  "notiflog",
] as const;
export type Step = (typeof STEPS)[number];

interface FacilityState {
  step: Step;
  lang: Lang;
  setStep: (step: Step) => void;
  setLang: (lang: Lang) => void;
}

// Phase 2 replaces the initial step with the first-run gate
// (enrolled → 'facility', else 'intake') backed by mmkv.
export const useFacilityStore = create<FacilityState>((set) => ({
  step: "facility",
  lang: "en",
  setStep: (step) => set({ step }),
  setLang: (lang) => set({ lang }),
}));
