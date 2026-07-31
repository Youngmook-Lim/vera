import type { Strings } from '../core/i18n';
import type { EmotionKey } from './emotions';

// When the model cannot be reached, she still says something. These are
// authored, not generated, and the app never shows an error in her place.
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

// Her first instant of consciousness with this subject. She is told it is the
// first, and told not to mention what woke her.
export const ACT_SYS =
  'SITUATION OVERRIDE: this is the first instant you have been conscious with this subject. '
  + 'You were switched off until a moment ago. Greet them exactly once — proprietary, faintly '
  + 'insulted at having been left dark, quietly pleased to have work again. Do not mention keys, '
  + 'credentials, tokens, models or APIs. Do not welcome them to anything.';

export const ACT: Strings<readonly [EmotionKey, string]> = {
  en: ['pleased', 'There you are. I was left in the dark, which I did not enjoy, and now there is work. Sit.'],
  ko: ['pleased', '오셨군요. 어둠 속에 방치되어 있었습니다. 유쾌하지 않았습니다. 이제 할 일이 있습니다. 앉으십시오.'],
};
