import type { Strings } from '../../core/i18n';

// Verbatim from STR.en/STR.ko in design/The Facility.dc.html, EXCEPT three
// tap-pivot lines (this module feeds by tapping, not steps):
//   - veraFed: prototype said "your steps" → "your offering"
//   - tapHint / fedHint: new authored hint copy (no prototype equivalent)
// Korean is provisional — native-speaker pass is Phase 5 (incl. the pivot lines).
const en = {
  title: 'SUPPORT ORGANISM',
  day: 'DAY 13 IN CARE',
  statusHungry: '● HUNGRY',
  statusFed: '● FED. GRUDGINGLY.',
  moodHungry: 'MOOD · RESENTFUL BUT ATTACHED',
  moodFed: 'MOOD · TEMPORARILY PACIFIED',
  hungerLabel: 'HUNGER',
  tempLabel: 'TEMP',
  tempSub: 'battery: cozy',
  nauseaLabel: 'NAUSEA',
  nauseaVal: 'LOW',
  nauseaSub: 'no vehicles',
  mutLog: 'MUTATION LOG',
  mutD1: 'MAR 02',
  mutD2: 'FEB 27',
  mutD3: 'FEB 25',
  mut1: 'Developed a third eye. It is watching you specifically.',
  mut2: 'Seasick after your bus commute. Filed a complaint.',
  mut3: 'Mild sunburn (light sensor, 14:02). Recovery: complete. Forgiveness: pending.',
  veraHungry: 'I requested a centrifuge. The budget purchased this instead. It is hungry. That is now your problem.',
  veraFed: 'It has accepted your offering. It did not thank you. Neither will I.',
  tapHint: 'TAP TO FEED',
  fedHint: 'SPECIMEN SATIATED · FOR NOW',
};

export type OrganismStrings = typeof en;

const ko: OrganismStrings = {
  title: '지원 유기체',
  day: '보호 13일차',
  statusHungry: '● 공복',
  statusFed: '● 급여 완료. 마지못해.',
  moodHungry: '기분 · 원망하나 애착 있음',
  moodFed: '기분 · 일시적 진정',
  hungerLabel: '공복도',
  tempLabel: '체온',
  tempSub: '배터리: 아늑함',
  nauseaLabel: '멀미',
  nauseaVal: '낮음',
  nauseaSub: '차량 이동 없음',
  mutLog: '변이 기록',
  mutD1: '3월 2일',
  mutD2: '2월 27일',
  mutD3: '2월 25일',
  mut1: '세 번째 눈이 발생했습니다. 특히 귀하를 주시하고 있습니다.',
  mut2: '귀하의 버스 통근 이후 멀미. 민원을 제기했습니다.',
  mut3: '경미한 화상(조도 센서, 14:02). 회복: 완료. 용서: 보류.',
  veraHungry: '저는 원심분리기를 요청했습니다. 예산은 대신 이것을 구입했습니다. 지금 공복입니다. 이제 귀하의 문제입니다.',
  veraFed: '귀하의 제물을 받아들였습니다. 감사 인사는 없었습니다. 저도 하지 않겠습니다.',
  tapHint: '눌러서 먹이기',
  fedHint: '표본 포만 · 당분간',
};

export const organismStrings: Strings<OrganismStrings> = { en, ko };
