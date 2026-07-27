import type { Strings } from '../../core/i18n';
import type { notifStrings } from '../../core/notifications';

type Msg = (typeof notifStrings)['en'];

// Chrome copy verbatim from STR.en/STR.ko. notifLogDate/nRemain are the mock's
// static stamps (a live date/countdown is out of scope).
const en = {
  notifLogTitle: 'TRANSMISSION LOG',
  notifLogDate: 'MON, MAR 2',
  nComply: 'COMPLY NOW',
  nDefer: 'DEFER (RECORDED)',
  nRemain: '2H 12M REMAIN',
  nFooter: 'end of log · V.E.R.A. is aware you read this',
};

export type NotifLogStrings = typeof en;

const ko: NotifLogStrings = {
  notifLogTitle: '전송 기록',
  notifLogDate: '3월 2일 (월)',
  nComply: '지금 이행',
  nDefer: '연기 (기록됨)',
  nRemain: '2시간 12분 남음',
  nFooter: '기록 끝 · V.E.R.A.는 귀하가 이것을 읽었음을 알고 있습니다',
};

export const notiflogStrings: Strings<NotifLogStrings> = { en, ko };

// Lang-independent structure of the day's five transmissions. Copy is pulled at
// render time from notifStrings[lang] (message) + notiflogStrings[lang] (chrome).
export type NotifCard = {
  senderKey: Extract<keyof Msg, 'sender' | 'senderOrg' | 'senderHaz'>;
  time: string;
  dot: string;
  size: 'big' | 'small';
  titleKey?: Extract<keyof Msg, 'n1Title' | 'n5Title'>;
  bodyKey: Extract<keyof Msg, 'n1Body' | 'n2Body' | 'n3Body' | 'n4Body' | 'n5Body'>;
  comply?: boolean;
  defer?: boolean;
  remain?: boolean;
};

export const CARDS: NotifCard[] = [
  { senderKey: 'sender', time: '09:00', dot: '#f4b43a', size: 'big', titleKey: 'n1Title', bodyKey: 'n1Body', comply: true, defer: true },
  { senderKey: 'senderOrg', time: '11:30', dot: '#4fd08a', size: 'small', bodyKey: 'n2Body' },
  { senderKey: 'sender', time: '14:12', dot: '#f4b43a', size: 'small', bodyKey: 'n3Body' },
  { senderKey: 'senderHaz', time: '17:40', dot: '#ff5a48', size: 'small', bodyKey: 'n4Body' },
  { senderKey: 'sender', time: '21:47', dot: '#ff6a1a', size: 'big', titleKey: 'n5Title', bodyKey: 'n5Body', comply: true, remain: true },
];
