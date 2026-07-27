import type { Strings } from '../../core/i18n';

// Copy verbatim from STR.en/STR.ko in design/The Facility.dc.html. Korean is
// provisional — native-speaker pass is Phase 5. `trial` is the mock's static
// header code (identical in both languages).
const en = {
  title: 'FIELD TRIAL',
  trial: 'TRIAL 50640-F13',
  directive: "TODAY'S DIRECTIVE",
  task: 'Proceed to the place where pigeons hold court.',
  distance: 'DISTANCE TO TARGET',
  signalRising: 'SIGNAL STRENGTH · RISING',
  signalIdle: 'SIGNAL STRENGTH · HOLDING',
  signalArrived: 'SIGNAL STRENGTH · MAXIMUM',
  vera: 'Your compliance is appreciated and mandatory. Walk. I will not tell you why.',
  veraWalking: 'Good. Continue. The pigeons have been notified of your approach.',
  veraNear: 'You are close. Act natural. They can tell when you act natural.',
  veraArrived: 'You have arrived. Observe the court. Do not address the bench.',
  walk: 'HOLD TO WALK',
  walking: 'WALKING…',
  walkDone: 'TRIAL COMPLETE · RETURN TO FACILITY',
  arrivedBig: 'TARGET REACHED',
  arrivedSub: 'THE COURT IS IN SESSION',
};

export type FieldStrings = typeof en;

const ko: FieldStrings = {
  title: '현장 시험',
  trial: 'TRIAL 50640-F13',
  directive: '오늘의 지시',
  task: '비둘기들이 모여 회의하는 장소로 이동하십시오.',
  distance: '목표까지 거리',
  signalRising: '신호 강도 · 상승 중',
  signalIdle: '신호 강도 · 유지 중',
  signalArrived: '신호 강도 · 최대',
  vera: '귀하의 협조에 감사드리며 또한 의무입니다. 걷으십시오. 이유는 말하지 않겠습니다.',
  veraWalking: '좋습니다. 계속하십시오. 비둘기들에게 귀하의 접근이 통보되었습니다.',
  veraNear: '거의 도착했습니다. 자연스럽게 행동하십시오. 자연스럽게 행동하면 그들은 알아챕니다.',
  veraArrived: '도착했습니다. 법정을 관찰하십시오. 재판부에 말을 걸지 마십시오.',
  walk: '길게 눌러 걷기',
  walking: '걷는 중…',
  walkDone: '시험 완료 · 시설로 복귀',
  arrivedBig: '목표 도달',
  arrivedSub: '법정이 개정 중입니다',
};

export const fieldStrings: Strings<FieldStrings> = { en, ko };
