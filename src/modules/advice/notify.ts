import type { Lang } from '../../core/i18n';
import { planDaily } from './daily';
import { QUOTES, SOURCE } from './quotes';
import { T } from './strings';

// The only file that touches expo-notifications. Everything about WHICH card
// and WHEN is decided in daily.ts, which is pure; this hands the answer to
// Android and does nothing else.
//
// Lazily required, exactly as v1's notifications.ts was: a build without the
// native module in it must degrade to doing nothing rather than throwing at
// import time and taking the whole app with it.
const CHANNEL = 'advice';

type Notifs = typeof import('expo-notifications');

const load = (): Notifs | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as Notifs;
  } catch {
    return null;
  }
};

const ensureChannel = async (N: Notifs): Promise<void> => {
  await N.setNotificationChannelAsync(CHANNEL, {
    name: 'EXCELLENT ADVICE',
    importance: N.AndroidImportance.DEFAULT,
  });
};

export type PermissionState = 'granted' | 'blocked' | 'ask';

// `blocked` is its own answer because Android never re-prompts once refused:
// the row has to say the OS settings are the only way back rather than offer a
// button that will do nothing.
export const permissionState = async (): Promise<PermissionState> => {
  const N = load();
  if (!N) return 'blocked';
  try {
    const { granted, canAskAgain } = await N.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'ask' : 'blocked';
  } catch {
    return 'blocked';
  }
};

export const requestDaily = async (): Promise<boolean> => {
  const N = load();
  if (!N) return false;
  try {
    // The channel has to exist before the prompt, or the permission is granted
    // against nothing.
    await ensureChannel(N);
    const { granted } = await N.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
};

// Cancels everything pending and hands over a fresh horizon. cancelAll assumes
// this feature owns every notification the app schedules — true today, and the
// thing to revisit first if a second one is ever added.
export const syncDaily = async (enabled: boolean, lang: Lang, now: Date): Promise<void> => {
  const N = load();
  if (!N) return;
  try {
    await ensureChannel(N);
    await N.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    for (const { at, index } of planDaily(now, QUOTES.length)) {
      await N.scheduleNotificationAsync({
        content: {
          title: T[lang].label,
          // The text must be inside the notification before Android takes it:
          // nothing of ours is awake at nine to choose one.
          body: `${QUOTES[index]}\n— ${SOURCE.author}`,
          data: { quote: index },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // A card is a courtesy. A phone that refuses to schedule must never be the
    // reason the room fails to open.
  }
};

const quoteFrom = (response: unknown): number | null => {
  const data = (response as { notification?: { request?: { content?: { data?: unknown } } } })
    ?.notification?.request?.content?.data as { quote?: unknown } | undefined;
  return typeof data?.quote === 'number' ? data.quote : null;
};

// The app was not running: Android held the tap and hands it over on boot.
export const readTapTarget = async (): Promise<number | null> => {
  const N = load();
  if (!N) return null;
  try {
    return quoteFrom(await N.getLastNotificationResponseAsync());
  } catch {
    return null;
  }
};

// The app was already running. Returns its own unsubscribe.
export const onTap = (handler: (index: number) => void): (() => void) => {
  const N = load();
  if (!N) return () => {};
  try {
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const index = quoteFrom(response);
      if (index != null) handler(index);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
};
