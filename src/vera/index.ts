import type { Lang } from '../core/i18n';

export type TransmissionContext =
  | { screen: 'facility' | 'intake' | 'baseline' | 'assigned'; lang: Lang }
  | { screen: 'permission'; denied: boolean; lang: Lang }
  | { screen: 'daily'; phase: 'idle' | 'deliberating' | 'done' | 'doneAudit'; lang: Lang }
  | { screen: 'missed'; phase: 'missed' | 'amending' | 'restored'; lang: Lang };

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
  daily: {
    idle: {
      en: 'Read the directive. Then hold to confirm you mean it.',
      ko: '지시를 읽으십시오. 그러고 진심임을 길게 눌러 확인하십시오.',
    },
    deliberating: {
      en: 'One moment. Even routine compliance is occasionally audited. Today is occasionally.',
      ko: `잠시만. 정기적인 준수도 간혹 감사됩니다. 오늘이 그 '간혹'입니다.`,
    },
    done: {
      en: 'Logged. Your streak continues. Streaks exist to be broken — later, by me.',
      ko: '기록되었습니다. 연속 기록이 이어집니다. 연속 기록은 깨지기 위해 존재합니다 — 나중에, 제가.',
    },
    doneAudit: {
      en: 'Reviewed. You are provisionally compliant. Provisions may be revoked without notice.',
      ko: '검토되었습니다. 귀하는 잠정적으로 준수 상태입니다. 잠정 조치는 예고 없이 철회될 수 있습니다.',
    },
  },
  missed: {
    missed: {
      en: 'Day thirteen: you were not present. I noticed at once. I always notice.',
      ko: '13일차: 귀하는 자리에 없었습니다. 저는 즉시 알아챘습니다. 저는 항상 알아챕니다.',
    },
    amending: {
      en: 'Reviewing your petition. Your contrition is being measured. It is thin.',
      ko: '귀하의 신청을 검토하고 있습니다. 귀하의 반성을 측정 중입니다. 엷습니다.',
    },
    restored: {
      en: 'Provisional standing restored. Do not mistake this for forgiveness.',
      ko: '잠정 상태가 복권되었습니다. 이를 용서로 오해하지 마십시오.',
    },
  },
} as const;

export function getTransmission(ctx: TransmissionContext): string {
  if (ctx.screen === 'permission') {
    return (ctx.denied ? corpus.permissionDenied : corpus.permission)[ctx.lang];
  }
  if (ctx.screen === 'daily') {
    return corpus.daily[ctx.phase][ctx.lang];
  }
  if (ctx.screen === 'missed') {
    return corpus.missed[ctx.phase][ctx.lang];
  }
  return corpus[ctx.screen][ctx.lang];
}
