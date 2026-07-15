import type { Lang } from '../core/i18n';

export interface TransmissionContext {
  screen: 'facility'; // widens as later phases add screens
  lang: Lang;
}

// v1: authored corpus (from the prototype's STR tables). If a live LLM ever
// lands, it goes behind this same signature — callers never know
// (docs/architecture.md "V.E.R.A.'s brain").
const corpus = {
  facility: {
    en: 'You made it. I never doubted you. That is a lie, but a supportive one.',
    ko: '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  },
} as const;

export function getTransmission(ctx: TransmissionContext): string {
  return corpus[ctx.screen][ctx.lang];
}
