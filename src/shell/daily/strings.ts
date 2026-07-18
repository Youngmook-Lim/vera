import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html, except the
// two {n} templates (real streak numbers replace the mock's hardcoded 12) and
// missedHeaderRight (static telemetry from the mock).
const en = {
  dailyTitle: 'DAILY COMPLIANCE',
  directiveCode: 'DIRECTIVE 50640-D13',
  directiveTitle: 'Confirm you have not been replaced.',
  holdToComply: 'HOLD TO COMPLY',
  verifyingPresence: 'VERIFYING PRESENCE…',
  auditing: 'AUDITING THIS SUBMISSION…',
  auditingSub: 'routine. probably.',
  compliantLabel: 'COMPLIANT',
  provCompliantLabel: 'PROVISIONALLY COMPLIANT',
  streakText: 'DAY {n} · {n}-DAY STREAK',
  missedTitle: 'COMPLIANCE MISSED',
  missedBody: 'You did not confirm presence yesterday. This has been recorded permanently.',
  dayStreakLabel: 'DAY STREAK',
  streakForfeited: '{n}-DAY STREAK FORFEITED',
  petition: 'PETITION FOR REINSTATEMENT',
  petitionSub: 'outcome not guaranteed · petitions are also recorded',
  reviewingPetition: 'REVIEWING PETITION…',
  standingRestored: 'PROVISIONAL STANDING RESTORED',
  restoredBody: 'You begin again at day one, on probation. Do not celebrate.',
  missedHeaderRight: '03:14 · CHAMBER 05',
};

export type DailyStrings = typeof en;

const ko: DailyStrings = {
  dailyTitle: '일일 준수',
  directiveCode: '지시 50640-D13',
  directiveTitle: '대체되지 않았음을 확인하십시오.',
  holdToComply: '길게 눌러 준수',
  verifyingPresence: '존재 확인 중…',
  auditing: '제출 내용 감사 중…',
  auditingSub: '정기 절차. 아마도.',
  compliantLabel: '준수함',
  provCompliantLabel: '잠정 준수함',
  streakText: '{n}일차 · {n}일 연속',
  missedTitle: '준수 누락',
  missedBody: '귀하는 어제 존재를 확인하지 않았습니다. 이는 영구적으로 기록되었습니다.',
  dayStreakLabel: '연속 일수',
  streakForfeited: '{n}일 연속 기록 몰수',
  petition: '복권 신청',
  petitionSub: '결과는 보장되지 않음 · 신청 또한 기록됨',
  reviewingPetition: '신청 검토 중…',
  standingRestored: '잠정 상태 복권됨',
  restoredBody: '귀하는 1일차부터 다시 시작합니다. 보호관찰 상태입니다. 기뻐하지 마십시오.',
  missedHeaderRight: '03:14 · CHAMBER 05',
};

export const dailyStrings: Strings<DailyStrings> = { en, ko };
