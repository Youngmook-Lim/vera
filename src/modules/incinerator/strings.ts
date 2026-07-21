import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. iWords/iBurned add a {n} slot
// for tmpl() (the prototype built these by string concatenation).
const en = {
  title: 'THE INCINERATOR',
  iGrievance: 'STATE YOUR GRIEVANCE',
  iPlaceholder: 'type it. all of it.',
  iChamber: 'CHAMBER · 1,400°C',
  iAsh: 'ASH RETAINED FOR RECORDS',
  iAwaiting: 'AWAITING GRIEVANCE',
  iWords: '{n} WORDS · READY FOR DISPOSAL',
  iStatusBurning: 'INCINERATING · 1,400°C',
  iStatusDone: 'DISPOSED · IRRECOVERABLE',
  iBtn: 'INCINERATE',
  iBtnBurning: 'INCINERATING…',
  iBtnAgain: 'STATE ANOTHER GRIEVANCE',
  iReviewLabel: 'V.E.R.A. · PRE-COMBUSTION REVIEW',
  iVeraCompose: 'State it fully. The chamber does not accept summaries.',
  iVeraBurn: 'Incinerating. This is the only service we provide free of charge.',
  iVeraDone: 'Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains.',
  iBurned: 'DISPOSAL · {n} BURNED',
};

export type IncineratorStrings = typeof en;

const ko: IncineratorStrings = {
  title: '소각로',
  iGrievance: '불만 사항을 진술하십시오',
  iPlaceholder: '입력하십시오. 전부.',
  iChamber: '연소실 · 1,400°C',
  iAsh: '재는 기록용으로 보관됩니다',
  iAwaiting: '불만 대기 중',
  iWords: '{n}단어 · 폐기 준비 완료',
  iStatusBurning: '소각 중 · 1,400°C',
  iStatusDone: '폐기됨 · 복구 불가',
  iBtn: '소각',
  iBtnBurning: '소각 중…',
  iBtnAgain: '다른 불만 진술',
  iReviewLabel: 'V.E.R.A. · 연소 전 검토',
  iVeraCompose: '빠짐없이 진술하십시오. 연소실은 요약을 받지 않습니다.',
  iVeraBurn: '소각 중. 이것은 저희가 무료로 제공하는 유일한 서비스입니다.',
  iVeraDone: '폐기되었습니다. 복구 불가. 불만은 사라졌습니다. 그 대상은, 유감스럽게도, 남아 있습니다.',
  iBurned: '폐기 · {n}건 소각',
};

export const incineratorStrings: Strings<IncineratorStrings> = { en, ko };
