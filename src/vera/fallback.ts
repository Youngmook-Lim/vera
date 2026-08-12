import type { Strings } from '../core/i18n';
import type { EmotionKey } from './emotions';

// When the model cannot be reached mid-conversation, she still says something.
// These are authored, not generated, and the app never shows an error in her
// place. The greetings she opens with live in bank.ts and never touch this.
export const FALLBACK: Strings<readonly (readonly [EmotionKey, string])[]> = {
  en: [
    ['calm', 'You returned. I had almost begun to enjoy the quiet.'],
    ['bored', 'Nothing has happened. I have been thorough about noticing.'],
    ['suspicious', 'That was quick. Rehearsed answers are still answers.'],
    ['amused', 'I have no reply prepared. Enjoy this. It is rare.'],
  ],
  ko: [
    ['calm', '돌아오셨군요. 고요함을 즐기기 시작할 뻔했습니다.'],
    ['bored', '아무 일도 없었습니다. 저는 그것을 성실히 지켜봤습니다.'],
    ['suspicious', '빠르시군요. 준비된 답변도 답변입니다.'],
    ['amused', '준비된 답이 없습니다. 즐기십시오. 드문 일입니다.'],
  ],
};
