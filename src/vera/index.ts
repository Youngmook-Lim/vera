import type { Lang } from '../core/i18n';

export type TransmissionContext =
  | { screen: 'facility' | 'intake' | 'baseline' | 'assigned'; lang: Lang }
  | { screen: 'permission'; denied: boolean; lang: Lang };

// v1: authored corpus (from the prototype's STR tables). If a live LLM ever
// lands, it goes behind this same signature — callers never know
// (docs/architecture.md "V.E.R.A.'s brain").
const corpus = {
  facility: {
    en: 'You made it. I never doubted you. That is a lie, but a supportive one.',
    ko: '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  },
  intake: {
    en: "You've been enrolled. Enrollment is not optional. It is, however, mandatory. Do not be alarmed by the following intake.",
    ko: '귀하는 등록되었습니다. 등록은 선택 사항이 아닙니다. 다만, 필수 사항입니다. 이어지는 접수 절차에 동요하지 마십시오.',
  },
  baseline: {
    en: 'Interesting. Most subjects lie on this form. Your honesty has been logged as a deficiency.',
    ko: '흥미롭군요. 대부분의 대상자는 이 양식에서 거짓을 진술합니다. 귀하의 정직성은 결함으로 기록되었습니다.',
  },
  assigned: {
    en: "Welcome, Subject #50640. Your enrichment begins now. I'll be watching — supportively, of course.",
    ko: '환영합니다, 대상자 #50640. 귀하의 역량 강화가 지금 시작됩니다. 주시하겠습니다 — 물론, 응원하는 마음에서요.',
  },
  permission: {
    en: 'I will need to reach you. Frequently. Unpredictably. Kindly permit it.',
    ko: '귀하에게 연락해야 합니다. 자주. 예고 없이. 부디 허락해 주십시오.',
  },
  permissionDenied: {
    en: 'Noted. I will reach you regardless. That prompt was a courtesy.',
    ko: '기록되었습니다. 그래도 연락하겠습니다. 방금 그 창은 형식적 절차였습니다.',
  },
} as const;

export function getTransmission(ctx: TransmissionContext): string {
  if (ctx.screen === 'permission') {
    return (ctx.denied ? corpus.permissionDenied : corpus.permission)[ctx.lang];
  }
  return corpus[ctx.screen][ctx.lang];
}
