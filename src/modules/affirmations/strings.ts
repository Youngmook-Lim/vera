import type { Strings } from '../../core/i18n';

// The only words this room supplies. The affirmations are hers, in English
// whatever the interface is set to — a translated Louise Hay would be someone
// else's affirmations.
export interface AffirmationsStrings {
  label: string;
  cards: string;
  list: string;
  first: string;
  keep: string;
  release: string;
  daily: string;
  on: string;
  off: string;
  blocked: string;
}

const en: AffirmationsStrings = {
  label: 'AFFIRMATIONS',
  cards: 'CARDS',
  list: 'LIST',
  first: 'FIRST',
  keep: 'keep this one',
  release: 'let this one go',
  daily: 'DAILY AFFIRMATION',
  on: 'ON',
  off: 'OFF',
  blocked: 'BLOCKED · SETTINGS',
};

const ko: AffirmationsStrings = {
  label: '확언',
  cards: '카드',
  list: '전체',
  first: '먼저',
  keep: '이 확언을 간직하기',
  release: '이 확언을 놓아주기',
  daily: '오늘의 확언',
  on: '켬',
  off: '끔',
  blocked: '차단됨 · 설정',
};

export const T: Strings<AffirmationsStrings> = { en, ko };
