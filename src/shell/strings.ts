import { tmpl, type Lang, type Strings } from '../core/i18n';

// Copy verbatim from STR.en / STR.ko in design/The Facility.dc.html, except
// the underConstruction* keys — new phase-1 copy for placeholder screens
// (ko needs the standard native-speaker pass later).
const en = {
  center: 'ENRICHMENT CENTER',
  prefsWord: 'PREFERENCES',
  dayN: 'DAY {n}',
  underReview: 'UNDER REVIEW',
  probation: 'PROBATION',
  goodStanding: 'GOOD STANDING',
  live: 'LIVE TRANSMISSION',
  pressComply: 'PRESS TO REMAIN COMPLIANT',
  complySub: 'daily · do not miss · infractions are permanent',
  activeEvals: 'ACTIVE EVALUATIONS',
  pendingAlloc: 'PENDING ALLOCATION',
  budgetPending: 'BUDGET PENDING',
  underConstruction: 'UNDER CONSTRUCTION',
  underConstructionBody:
    'This chamber is not yet ready. Your eagerness has been noted and will be used against you.',
};

export type ShellStrings = typeof en;

const ko: ShellStrings = {
  center: '역량 강화 센터',
  prefsWord: '환경설정',
  dayN: '{n}일차',
  underReview: '심사 중',
  probation: '보호관찰',
  goodStanding: '양호 상태',
  live: '실시간 송출',
  pressComply: '준수 상태를 유지하려면 누르십시오',
  complySub: '매일 · 누락 금지 · 위반은 영구히 기록됩니다',
  activeEvals: '활성 평가',
  pendingAlloc: '배정 대기',
  budgetPending: '예산 대기',
  underConstruction: '공사 중',
  underConstructionBody:
    '이 구역은 아직 준비되지 않았습니다. 귀하의 열의는 기록되었으며, 추후 불리하게 사용될 예정입니다.',
};

export const shellStrings: Strings<ShellStrings> = { en, ko };

// en zero-pads (mock shows DAY 01); ko reads naturally unpadded (1일차).
export const dayLabel = (tenure: number, lang: Lang): string =>
  tmpl(shellStrings[lang].dayN, { n: lang === 'en' ? String(tenure).padStart(2, '0') : String(tenure) });
