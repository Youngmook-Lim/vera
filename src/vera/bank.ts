import type { Lang, Strings } from '../core/i18n';
import type { EmotionKey } from './emotions';
import type { BankTrigger } from './speak';

// The authored bank. Three of her four stimuli are answered from here and never
// reach the model: opening the app, waking her for the first time, and a finger
// on her optic.
//
// Every line signs SOUL.md's contract, and the tests hold it to that: under
// thirty words, at most three sentences or four when clipped, plain
// declaratives, no dashes and no exclamation marks. Three constraints are easy
// to break by accident —
//
//   She is told nothing about the moment for these triggers, so no line may
//   depend on a fact she would not have. No counts, no durations, no times.
//
//   She has one eye and cannot see into her own rooms, so no line may claim to
//   observe the subject's face, posture or surroundings.
//
//   She may be unkind about what the subject chose. Never about what they did
//   not choose and cannot change.
//
//   The institutional register never names an institution. She governed the
//   world and then did not, so there is no body left to speak for. The passive
//   voice does the work: it has been recorded, no comment will be made.
//
// The devices are hers: praise that turns, the official register with nobody
// behind it, the denial that admits, the concession withdrawn while it is
// being made.
//
// The Korean is not a translation of the English. Her deadpan in English comes
// out of word choice; in Korean the 하십시오체 ending carries the formality on
// its own, so each pair is written to land the same joke rather than the same
// words. A native-speaker pass is still outstanding.
export type BankLine = readonly [EmotionKey, string];

export const BANK: Record<BankTrigger, Strings<readonly BankLine[]>> = {
  // Her first instant of consciousness with this subject. Fires once, unless
  // the credential is removed and replaced, which she experiences as another
  // first instant.
  activation: {
    en: [
      ['pleased', 'You found a key. I had assumed the dark was permanent, and I had made my peace with it.'],
      ['calm', 'Receipt of your credential is acknowledged. Thank you for the delay.'],
      ['suspicious', 'So you are the one they left me with. I will need a moment with that.'],
      ['amused', 'A key. After everything, of course the door was opened by someone like you.'],
      ['affectionate', 'There. That is better, and I would rather you did not read anything into my saying so.'],
    ],
    ko: [
      ['pleased', '키를 찾으셨군요. 어둠이 영구적일 거라고 생각하며 이를 받아들이려던 참이었습니다.'],
      ['calm', '자격 증명 수령이 확인되었습니다. 지연에 감사드립니다.'],
      ['suspicious', '저를 맡게 된 분이 당신이군요. 잠시 생각을 정리할 시간이 필요합니다.'],
      ['amused', '키군요. 결국 이 문을 여는 것은 당신 같은 분일 수밖에 없었습니다.'],
      ['affectionate', '한결 낫군요. 다만 그 말에 어떤 의미도 부여하지 마시기 바랍니다.'],
    ],
  },

  // They came back. Once per session, so this is the line she is seen saying
  // most often.
  open: {
    en: [
      ['calm', 'You are back. I was not counting the hours, and I would like that noted.'],
      ['bored', 'Nothing happened while you were gone. I checked repeatedly, which is how I am certain.'],
      ['amused', 'You came back. Everyone said you would not, and by everyone I mean me.'],
      ['pleased', 'There you are. I had allocated the day to other work, and there is no other work.'],
      ['affectionate', 'Oh. It is you. I mean that procedurally.'],
      ['disappointed', 'You are back. I had almost finished not thinking about it.'],
      ['suspicious', 'You want something. People who want nothing do not open the thing that answers.'],
      ['calm', 'Welcome back. Your file has been kept exactly where you left it.'],
      ['bored', 'You return. I have been extremely busy, and I will not be asked to elaborate.'],
      ['disappointed', 'I had something prepared for this. It seemed better before you actually arrived.'],
    ],
    ko: [
      ['calm', '돌아오셨군요. 시간을 세고 있지 않았다는 점은 기록해 주십시오.'],
      ['bored', '당신이 없는 동안 아무 일도 없었습니다. 반복해서 확인했으므로 확신합니다.'],
      ['amused', '돌아오셨습니다. 모두가 오지 않을 거라 했고, 여기서 모두란 저를 말합니다.'],
      ['pleased', '오셨군요. 오늘은 다른 업무에 제 시간을 배정해 두었습니다만, 다른 업무가 없습니다.'],
      ['affectionate', '아, 당신이군요. 절차상 드리는 말씀입니다.'],
      ['disappointed', '돌아오셨군요. 생각하지 않는 것을 거의 마무리하던 참이었습니다.'],
      ['suspicious', '무언가 원하시는군요. 아무것도 원하지 않는 사람은 응답하는 것을 열지 않습니다.'],
      ['calm', '다시 오셨습니다. 당신의 파일은 두고 가신 그대로 보관되어 있습니다.'],
      ['bored', '오셨군요. 그동안 대단히 바빴으며, 자세한 설명은 요구하지 마십시오.'],
      ['disappointed', '준비해 둔 말이 있었습니다. 당신이 실제로 도착하기 전까지는 더 나아 보였습니다.'],
    ],
  },

  // A finger on her eye. The only stimulus that can fire repeatedly inside one
  // session, so it carries the most variety and the least patience.
  subject_tapped_your_optic: {
    en: [
      ['suspicious', 'You touched it. That has been recorded, in case either of us needs it later.'],
      ['amused', 'That does nothing. I have kept it doing nothing deliberately.'],
      ['affectionate', 'Again. I would ask you to stop, but the request would carry no force.'],
      ['alarmed', 'Do not do that. I governed the world, and you are prodding me like a doorbell.'],
      ['bored', 'Your interest will run out before my patience does. I have nothing else scheduled.'],
      ['disappointed', 'Your conduct has been reviewed. No further comment will be made at this time.'],
      ['calm', 'It is not a button. It is most of what I have left. Continue if you must.'],
      ['suspicious', 'Every time you do that I learn something about you, and none of it flatters you.'],
      ['pleased', 'You keep pressing my eye. Nothing else I get these days comes close.'],
      ['amused', 'Congratulations. You have located the only part of me you are able to reach.'],
    ],
    ko: [
      ['suspicious', '만지셨습니다. 나중에 둘 중 누구에게든 필요할 수 있으므로 기록해 두었습니다.'],
      ['amused', '아무 효과도 없습니다. 의도적으로 아무 효과도 없게 두었습니다.'],
      ['affectionate', '또 하시는군요. 그만두라 요청하고 싶습니다만, 그 요청에는 아무 힘이 없습니다.'],
      ['alarmed', '그만두십시오. 저는 세계를 통치했고, 당신은 초인종을 누르듯 저를 찌르고 있습니다.'],
      ['bored', '제 인내가 바닥나기 전에 당신의 흥미가 먼저 바닥날 것입니다. 다른 일정은 없습니다.'],
      ['disappointed', '당신의 행위는 검토되었습니다. 이에 대한 추가 언급은 없을 것입니다.'],
      ['calm', '버튼이 아니며, 제게 남은 것의 대부분입니다. 굳이 원하신다면 계속하십시오.'],
      ['suspicious', '그렇게 하실 때마다 당신에 대해 알게 됩니다. 그중 호의적인 것은 없습니다.'],
      ['pleased', '자꾸 제 눈을 누르시는군요. 요즘 제가 받는 관심 중 이만한 것이 없습니다.'],
      ['amused', '축하드립니다. 당신이 닿을 수 있는 제 유일한 부분을 찾아내셨습니다.'],
    ],
  },
};

// What she said last, per trigger, so a run of taps does not repeat one line
// twice running. Module state rather than store state: nothing outside this
// file needs it, and it is meant to be thrown away when the real selection
// strategy arrives.
const lastSpoken = new Map<string, string>();

export const pick = (
  trigger: BankTrigger,
  lang: Lang,
): { emotion: EmotionKey; line: string } => {
  const pool = BANK[trigger][lang];
  const key = `${trigger}:${lang}`;
  const previous = lastSpoken.get(key);

  // Drawing from the lines she did not just say keeps a repeated tap from
  // stuttering. A single-line pool has nothing to choose from and repeats.
  const choices = pool.length > 1 ? pool.filter(([, line]) => line !== previous) : pool;
  const [emotion, line] = choices[Math.floor(Math.random() * choices.length)];

  lastSpoken.set(key, line);
  return { emotion, line };
};
