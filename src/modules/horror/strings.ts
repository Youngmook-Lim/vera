import type { Strings } from '../../core/i18n';

// The only words this room supplies. The stories themselves are their authors'
// and stay in English whatever the interface is set to — a translated
// two-sentence horror story is a different story, and the turn is usually a
// pun on the first sentence's exact words.
export interface HorrorStrings {
  label: string;
  shuffle: string;
  all: string;
  first: string;
  hidden: string;
  keep: string;
  release: string;
  reveal: string;
  hintReveal: string;
  hintNext: string;
}

const en: HorrorStrings = {
  label: 'TWO SENTENCE HORROR',
  shuffle: 'SHUFFLE',
  all: 'ALL',
  first: 'FIRST',
  // A state, not a verb: it sits beside `★ FIRST` and has to read the same
  // way — what is true right now, rather than what tapping it will do.
  hidden: 'HIDDEN',
  keep: 'keep this one',
  release: 'let this one go',
  reveal: 'reveal the second sentence',
  hintReveal: 'tap the card to reveal',
  hintNext: 'tap the card for another',
};

const ko: HorrorStrings = {
  label: '두 문장 공포',
  shuffle: '무작위',
  all: '전체',
  first: '먼저',
  hidden: '숨김',
  keep: '이 이야기를 간직하기',
  release: '이 이야기를 놓아주기',
  reveal: '두 번째 문장 보기',
  hintReveal: '카드를 누르면 뒷문장이 나옵니다',
  hintNext: '카드를 누르면 다른 이야기가 나옵니다',
};

export const T: Strings<HorrorStrings> = { en, ko };
