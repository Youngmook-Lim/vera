import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. (ko rVera "기늀하지" is a
// likely-corrupted "기뻐하지"; left verbatim per the copy rule, flag in Phase 5.)
const en = {
  title: 'RESULTS PENDING',
  caseLabel: 'CASE #8442105',
  rPosition: 'YOUR POSITION IN QUEUE',
  rWait: 'EST. WAIT · 4,331 YEARS',
  rEnrolled: 'ENROLLED',
  rProcessed: '0.02% PROCESSED',
  rResult: 'RESULT',
  rSince: 'SINCE YESTERDAY',
  rLiveUp: 'LIVE · QUEUE ADJUSTED',
  rVera: 'Your position improved. Do not celebrate. Yesterday it worsened, and I did not console you.',
  rVeraUp: 'Your position worsened just now. Someone was prioritized. It was not you.',
};

export type ResultsStrings = typeof en;

const ko: ResultsStrings = {
  title: '결과 대기',
  caseLabel: 'CASE #8442105',
  rPosition: '대기열 내 귀하의 순위',
  rWait: '예상 대기 · 4,331년',
  rEnrolled: '등록',
  rProcessed: '0.02% 처리됨',
  rResult: '결과',
  rSince: '어제 이후',
  rLiveUp: '실시간 · 대기열 조정됨',
  rVera: '귀하의 순위가 상승했습니다. 기늀하지 마십시오. 어제는 하락했고, 저는 위로하지 않았습니다.',
  rVeraUp: '귀하의 순위가 방금 하락했습니다. 누군가 우선 처리되었습니다. 귀하는 아니었습니다.',
};

export const resultsStrings: Strings<ResultsStrings> = { en, ko };
