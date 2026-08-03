import type { Strings } from '../../core/i18n';

// The only two fixed labels the shell puts on this room (the doorway rule):
// the top-right name and the empty-state line. Everything else on the page is
// the user's own words, not copy from a table.
export interface IdentityStrings {
  label: string;
  empty: string;
}

const en: IdentityStrings = {
  label: 'MY IDENTITY',
  empty: 'Nothing written yet. Use the mark above to begin a line.',
};

const ko: IdentityStrings = {
  label: '나의 정체성',
  empty: '아직 쓰인 것이 없습니다. 위의 표시를 사용해 한 줄을 시작하세요.',
};

export const T: Strings<IdentityStrings> = { en, ko };
