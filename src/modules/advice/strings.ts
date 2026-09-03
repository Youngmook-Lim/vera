import type { Strings } from '../../core/i18n';

// The only words this room supplies. The cards themselves are the book's, in
// English whatever the interface is set to — a translated Kevin Kelly would be
// a different book.
export interface AdviceStrings {
  label: string;
  shuffle: string;
  all: string;
  first: string;
  keep: string;
  release: string;
  hint: string;
}

const en: AdviceStrings = {
  label: 'EXCELLENT ADVICE',
  shuffle: 'SHUFFLE',
  all: 'ALL',
  first: 'FIRST',
  keep: 'keep this one',
  release: 'let this one go',
  hint: 'tap the card for another',
};

const ko: AdviceStrings = {
  label: '훌륭한 조언',
  shuffle: '무작위',
  all: '전체',
  first: '먼저',
  keep: '이 조언을 간직하기',
  release: '이 조언을 놓아주기',
  hint: '카드를 누르면 다른 조언이 나옵니다',
};

export const T: Strings<AdviceStrings> = { en, ko };
