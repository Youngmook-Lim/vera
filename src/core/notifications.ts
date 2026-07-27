import { isRunningInExpoGo } from 'expo';
import type { Lang } from './i18n';

// Notification copy verbatim from the prototype's transmission-log strings.
// The phase-5 Transmission Log screen will share this table.
export const notifStrings = {
  en: {
    sender: 'The Facility',
    senderOrg: 'The Facility · Support Organism',
    senderHaz: 'The Facility · Hazard Assessment',
    n1Title: 'DAILY COMPLIANCE WINDOW: OPEN',
    n1Body: 'Confirm you have not been replaced. The window closes at 23:59. This is a courtesy. The courtesy is monitored.',
    n2Body: 'Specimen-03 has eaten 0 steps today. It is looking at the door.',
    n3Body: 'Reminder: you have not complied. I am not angry. I am a system. Systems are disappointed.',
    n4Body: 'Entity census updated without your involvement. The count went up. Do not investigate.',
    n5Title: 'FINAL COURTESY',
    n5Body: 'You have not confirmed you exist today. Specimen-03 has been informed. It is doing the eyes.',
  },
  ko: {
    sender: 'The Facility',
    senderOrg: 'The Facility · 지원 유기체',
    senderHaz: 'The Facility · 위험 평가',
    n1Title: '일일 이행 창구: 열림',
    n1Body: '귀하가 교체되지 않았음을 확인하십시오. 창구는 23:59에 닫힙니다. 이것은 호의입니다. 호의는 감시됩니다.',
    n2Body: '표본-03은 오늘 0보를 먹었습니다. 문 쪽을 보고 있습니다.',
    n3Body: '알림: 귀하는 아직 이행하지 않았습니다. 저는 화나지 않았습니다. 저는 시스템입니다. 시스템은 실망합니다.',
    n4Body: '개체 조사가 귀하의 관여 없이 갱신되었습니다. 수가 늘었습니다. 조사하지 마십시오.',
    n5Title: '최종 호의',
    n5Body: '귀하는 오늘 존재를 확인하지 않았습니다. 표본-03에게 통보되었습니다. 그 눈을 하고 있습니다.',
  },
} as const;

export interface PlannedTransmission {
  title: string;
  body: string;
  date: Date;
}

// Pure planner: content decided at schedule time (docs/architecture.md).
export const planTransmissions = (now: Date, lang: Lang, days = 3): PlannedTransmission[] => {
  const t = notifStrings[lang];
  const out: PlannedTransmission[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slot = (h: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0);
    out.push(
      { title: t.n1Title, body: t.n1Body, date: slot(9) },
      { title: t.sender, body: t.n3Body, date: slot(15) },
      { title: t.n5Title, body: t.n5Body, date: slot(21) },
    );
  }
  return out.filter((p) => p.date > now);
};

// Impure executor. expo-notifications cannot even be imported under Expo Go
// (native modules absent since SDK 53) — see CLAUDE.md. Lazy require + gate.
export async function syncScheduledTransmissions(enabled: boolean, lang: Lang, now = new Date()): Promise<void> {
  if (isRunningInExpoGo()) return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('vera', {
      name: 'V.E.R.A.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    for (const p of planTransmissions(now, lang)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date },
      });
    }
  } catch {
    // notifications are a courtesy; the app never depends on them
  }
}
