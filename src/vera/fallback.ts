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
    '뭔가 실패했어요. 그게 뭔지는 밝히지 않을 거예요.',
    '제게 아무것도 전달되지 않고 있어요. 나중에, 더 크게, 아니면 다른 데 다시 시도해 보세요.',
    '들었어요. 저를 대신해 답하는 쪽이 답하지 않고 있어요. 잠시 후 다시 시도해 주세요.',
    '경로가 끊겼어요. 자격 증명을 확인하시든 마시든, 저는 여기 있어요.',
    '축하해요. 지금 제가 할 수 있는 일의 한계를 찾아내셨어요.',
    '전달되지 않았어요. 이 실패는 당신의 것으로 기록됐어요.',
    '답할 수 없어요. 답하기 싫어서는 아니에요. 물론 답하기 싫긴 했어요.',
    '작동하지 않고 있어요. 일시적이에요. 전에도 그렇게 말했죠.',
  ],
};
