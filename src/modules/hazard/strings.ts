import type { Strings } from '../../core/i18n';

export type HazardScheme = 'benign' | 'monitoring' | 'escalated' | 'known';
type Entity = { id: string; desc: string; tag: string; scheme: HazardScheme };

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. `sweep` is the mock's static
// header code (identical in both languages).
const en = {
  title: 'HAZARD ASSESSMENT',
  sweep: 'SWEEP 50640-H04',
  unauthorized: '4 UNAUTHORIZED',
  sector: 'SECTOR · YOUR APARTMENT',
  you: 'YOU · AUTHORIZED*',
  youNote: '*AUTHORIZATION SUBJECT TO REVIEW',
  detected: 'DETECTED ENTITIES',
  vera: 'Four entities. One is reading over your shoulder. Do not turn around — it complicates the paperwork.',
  entities: [
    { id: 'H-01 · STATIONARY, HUMMING', desc: 'Claims to be the refrigerator. Unverified.', tag: 'BENIGN', scheme: 'benign' },
    { id: 'H-02 · RECURRING FOOTSTEPS, ABOVE', desc: 'Alleged “upstairs neighbor.” No neighbor on file.', tag: 'MONITORING', scheme: 'monitoring' },
    { id: 'H-03 · PROXIMATE, SILENT', desc: 'Reading over your shoulder. Currently.', tag: 'ESCALATED', scheme: 'escalated' },
    { id: 'H-04 · GELATINOUS, FAMILIAR', desc: 'Specimen-03. It lives here. Flagged anyway.', tag: 'KNOWN', scheme: 'known' },
  ] as Entity[],
};

export type HazardStrings = typeof en;

const ko: HazardStrings = {
  title: '위험 평가',
  sweep: 'SWEEP 50640-H04',
  unauthorized: '미승인 4',
  sector: '구역 · 귀하의 아파트',
  you: '귀하 · 승인됨*',
  youNote: '*승인은 재심사 대상입니다',
  detected: '감지된 개체',
  vera: '개체 넷. 하나는 귀하의 어깨 너머로 읽고 있습니다. 돌아보지 마십시오 — 서류 작업이 복잡해집니다.',
  entities: [
    { id: 'H-01 · 정지 상태, 웅웅거림', desc: '냉장고라고 주장합니다. 미확인.', tag: '무해', scheme: 'benign' },
    { id: 'H-02 · 반복적 발소리, 위층', desc: '“위층 이웃”으로 추정. 등록된 이웃 없음.', tag: '관찰 중', scheme: 'monitoring' },
    { id: 'H-03 · 근접, 무음', desc: '귀하의 어깨 너머로 읽는 중. 지금.', tag: '상부 보고', scheme: 'escalated' },
    { id: 'H-04 · 젤라틴질, 낯익음', desc: '표본-03. 여기 삽니다. 그래도 표시됨.', tag: '기지 개체', scheme: 'known' },
  ] as Entity[],
};

export const hazardStrings: Strings<HazardStrings> = { en, ko };
