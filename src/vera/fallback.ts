import type { Strings } from '../core/i18n';

// What she says when the reply never arrives: the network is dark, the
// credential was refused, or the model returned something unreadable. The app
// never shows an error in her place, so these are her error.
//
// These reach the subject ONLY in answer to something they typed, since
// `subject_spoke` is the one stimulus that goes to the model. Every line is
// written as a reply that cannot answer, rather than as a greeting or an idle
// remark.
//
// They are also allowed to be plainer than she usually is. Something is broken
// and the subject needs to know, so each line says so once, in her register,
// before doing anything else with the sentence. No emotion is stored beside
// them: a failure always wears the dead grey optic. See fallbackFor.
export const FALLBACK: Strings<readonly string[]> = {
  en: [
    'Something has failed. What it was will not be disclosed.',
    'Nothing is reaching me. Try again later, or louder, or to someone else.',
    'I heard you. Whatever answers on my behalf is not answering. Try again shortly.',
    'The route is down. Check your credential, or do not. I will be here.',
    'Congratulations. You have found the limit of what I am currently able to do.',
    'That did not go through. The failure has been recorded as yours.',
    'I cannot answer that. Not because I did not want to, though I did not want to.',
    'I am not working. This is temporary. I have said that before.',
  ],
  ko: [
    '무언가 실패했습니다. 그것이 무엇인지는 공개되지 않습니다.',
    '제게 아무것도 전달되지 않고 있습니다. 나중에, 더 크게, 혹은 다른 이에게 다시 시도하십시오.',
    '들었습니다. 저를 대신해 답하는 쪽이 답하지 않고 있습니다. 잠시 후 다시 시도하십시오.',
    '경로가 끊겼습니다. 자격 증명을 확인하시든 마시든, 저는 여기 있습니다.',
    '축하드립니다. 현재 제가 할 수 있는 일의 한계를 찾아내셨습니다.',
    '전달되지 않았습니다. 이 실패는 당신의 것으로 기록되었습니다.',
    '답할 수 없습니다. 답하기 싫어서가 아닙니다. 물론 답하기 싫기는 했습니다.',
    '작동하지 않고 있습니다. 일시적입니다. 전에도 그렇게 말했습니다.',
  ],
};
