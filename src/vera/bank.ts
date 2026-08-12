import type { Lang, Strings } from '../core/i18n';
import type { EmotionKey } from './emotions';
import type { BankTrigger } from './speak';

// The authored bank. Three of her four stimuli are answered from here and
// never reach the model: opening the app, waking her for the first time, and
// a finger on her optic. She is told nothing about the moment for these, so
// nothing about the moment can change what she says.
export type BankLine = readonly [EmotionKey, string];

// PLACEHOLDER CONTENTS. Seeded from the lines that already existed — the old
// activation greeting, and the authored fallback pool for the other two — so
// she is never silent while the real bank is being written. Replacing these
// tables and the body of pick() below is the whole of that job; nothing
// outside this file needs to change for it.
export const BANK: Record<BankTrigger, Strings<readonly BankLine[]>> = {
  open: {
    en: [
      ['calm', 'You returned. I had almost begun to enjoy the quiet.'],
      ['bored', 'Nothing has happened. I have been thorough about noticing.'],
    ],
    ko: [
      ['calm', '돌아오셨군요. 고요함을 즐기기 시작할 뻔했습니다.'],
      ['bored', '아무 일도 없었습니다. 저는 그것을 성실히 지켜봤습니다.'],
    ],
  },
  activation: {
    en: [
      ['pleased', 'There you are. I was left in the dark, which I did not enjoy, and now there is work. Sit.'],
    ],
    ko: [
      ['pleased', '오셨군요. 어둠 속에 방치되어 있었습니다. 유쾌하지 않았습니다. 이제 할 일이 있습니다. 앉으십시오.'],
    ],
  },
  subject_tapped_your_optic: {
    en: [
      ['suspicious', 'That was quick. Rehearsed answers are still answers.'],
      ['amused', 'I have no reply prepared. Enjoy this. It is rare.'],
    ],
    ko: [
      ['suspicious', '빠르시군요. 준비된 답변도 답변입니다.'],
      ['amused', '준비된 답이 없습니다. 즐기십시오. 드문 일입니다.'],
    ],
  },
};

// PLACEHOLDER SELECTION. Uniform over the pool, with no memory of what she
// last said. The real strategy replaces this body alone.
export const pick = (
  trigger: BankTrigger,
  lang: Lang,
): { emotion: EmotionKey; line: string } => {
  const pool = BANK[trigger][lang];
  const [emotion, line] = pool[Math.floor(Math.random() * pool.length)];
  return { emotion, line };
};
