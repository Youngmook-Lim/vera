import type { Lang } from '../core/i18n';
import { askBatteryUnrestricted, isBatteryUnrestricted } from '../core/power';
import { planDaily } from './daily';

// The only file that touches expo-notifications. Everything about WHICH card
// and WHEN is decided in daily.ts, which is pure; this hands the answer to
// Android and does nothing else.
//
// Shared by every room that sends one a day (2026-09-07). It is a factory
// rather than a module of free functions for one reason: **cancelling**. A
// sync has to clear the room's own pending notifications without touching
// anybody else's, and two copies of that rule is two chances for them to
// disagree about whose notifications are whose — at which point one room
// silently deletes the other's horizon and nothing errors.
//
// Lazily required, exactly as v1's notifications.ts was: a build without the
// native module in it must degrade to doing nothing rather than throwing at
// import time and taking the whole app with it.

type Notifs = typeof import('expo-notifications');

const load = (): Notifs | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as Notifs;
  } catch {
    return null;
  }
};

// A card that arrives while the app is open never reaches Android on its own:
// expo hands it to the JS handler and presents nothing itself, and "the
// default behavior when the handler is not set or does not respond in time is
// not to show the notification". Nothing here ever set one, so a card due at
// nine while the subject happened to be reading her was dropped without a
// trace — no error, no entry in the notification log, nothing to find
// afterwards. Registered at module scope because the only thing it must be is
// earlier than any notification, and this file is imported at boot by both
// rooms. Failure is swallowed for the same reason every other call here is: a
// phone that refuses must not be the reason the app fails to start.
try {
  load()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // no native module, or a phone that will not take a handler
}

export type PermissionState = 'granted' | 'blocked' | 'ask';

// What travels inside every notification this app schedules. `room` is what
// makes cancelling and tap-reading precise.
interface Payload {
  room?: unknown;
  index?: unknown;
  // The advice room's original key, before rooms had names. A device upgrading
  // has up to ninety of these already sitting in Android's queue.
  quote?: unknown;
}

export interface DailyConfig {
  // The tag written into every notification and matched when cancelling.
  room: string;
  channel: string;
  channelName: string;
  hour: number;
  // How many cards the room has to draw from.
  count: () => number;
  // The finished notification. Called at SCHEDULING time, once per day of the
  // horizon — nothing of ours is awake at the hour to build it later.
  build: (index: number, lang: Lang) => { title: string; body: string };
  // Whether a pending notification is this room's. Defaults to the tag; the
  // advice room widens it to catch its own untagged legacy rows.
  owns?: (data: Payload) => boolean;
}

export interface DailyNotifier {
  permissionState: () => Promise<PermissionState>;
  request: () => Promise<boolean>;
  sync: (enabled: boolean, lang: Lang, now: Date) => Promise<void>;
  readTapTarget: () => Promise<number | null>;
  onTap: (handler: (index: number) => void) => () => void;
}

export const makeDaily = (cfg: DailyConfig): DailyNotifier => {
  const owns = cfg.owns ?? ((data: Payload) => data.room === cfg.room);

  const dataOf = (request: unknown): Payload =>
    ((request as { content?: { data?: unknown } })?.content?.data as Payload) ?? {};

  const indexOf = (data: Payload): number | null => {
    if (typeof data.index === 'number') return data.index;
    if (typeof data.quote === 'number') return data.quote;
    return null;
  };

  const ensureChannel = async (N: Notifs): Promise<void> => {
    await N.setNotificationChannelAsync(cfg.channel, {
      name: cfg.channelName,
      importance: N.AndroidImportance.DEFAULT,
    });
  };

  // Only this room's. Reading the queue and cancelling by identifier is more
  // work than cancelAllScheduledNotificationsAsync, and it is the whole reason
  // this file exists: a sync fires whenever its own toggle is flipped, at any
  // hour, with the other room's horizon already in the queue and its own
  // `syncedOn` stamped for today — so a blanket cancel takes a day of the
  // other room's notifications with it and nothing ever notices.
  const cancelOwn = async (N: Notifs): Promise<void> => {
    const pending = await N.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      if (owns(dataOf(item))) {
        await N.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  };

  return {
    // `blocked` is its own answer because Android never re-prompts once
    // refused: the row has to say the OS settings are the only way back rather
    // than offer a button that will do nothing.
    permissionState: async (): Promise<PermissionState> => {
      const N = load();
      if (!N) return 'blocked';
      try {
        const { granted, canAskAgain } = await N.getPermissionsAsync();
        if (granted) return 'granted';
        return canAskAgain ? 'ask' : 'blocked';
      } catch {
        return 'blocked';
      }
    },

    request: async (): Promise<boolean> => {
      const N = load();
      if (!N) return false;
      try {
        // The channel has to exist before the prompt, or the permission is
        // granted against nothing.
        await ensureChannel(N);
        const { granted } = await N.requestPermissionsAsync();

        // Permission is not delivery. Samsung's Freecess holds a frozen app's
        // alarms past their hour whatever Android has granted — a ten o'clock
        // story arrived at 03:00 — and Battery → Unrestricted is the only
        // thing that lifts it. Switching a room's cards on is the moment that
        // starts to matter, so the ask rides along with the one ceremony the
        // subject is already in rather than becoming a screen of its own.
        //
        // `=== false` is doing real work: a null means the module could not be
        // read, and firing a dialog we cannot verify would leave the subject
        // no way to tell whether it took.
        if (granted && isBatteryUnrestricted() === false) {
          askBatteryUnrestricted();
        }
        return granted;
      } catch {
        return false;
      }
    },

    sync: async (enabled: boolean, lang: Lang, now: Date): Promise<void> => {
      const N = load();
      if (!N) return;
      try {
        await ensureChannel(N);
        await cancelOwn(N);
        if (!enabled) return;

        for (const { at, index } of planDaily(now, cfg.count(), cfg.hour)) {
          const { title, body } = cfg.build(index, lang);
          await N.scheduleNotificationAsync({
            // Baked in at scheduling time, along with everything else here —
            // switching language in SYSTEM does not resync the queue, so a
            // pending card keeps the language it was scheduled under until the
            // next day's sync rewrites the horizon.
            content: { title, body, data: { room: cfg.room, index } },
            // `channelId` rides on the TRIGGER, not the content — it is the
            // trigger types that carry it, and the content type rejects it.
            // Naming no channel does NOT fall back to the one ensureChannel
            // just made: Android files the card under expo's own
            // `expo_notifications_fallback_notification_channel`, importance 4
            // with vibration on, so both rooms arrived under "Miscellaneous" —
            // louder than the DEFAULT they were created at, with the room's
            // own channel unused beside them and its switch in Android's
            // settings governing nothing.
            trigger: {
              type: N.SchedulableTriggerInputTypes.DATE,
              date: at,
              channelId: cfg.channel,
            },
          });
        }
      } catch {
        // A card is a courtesy. A phone that refuses to schedule must never be
        // the reason the room fails to open.
      }
    },

    // The app was not running: Android held the tap and hands it over on boot.
    // Another room's tap is not ours to answer, so an unowned payload reads as
    // no tap at all rather than as an index into the wrong corpus.
    readTapTarget: async (): Promise<number | null> => {
      const N = load();
      if (!N) return null;
      try {
        const response = await N.getLastNotificationResponseAsync();
        const data = dataOf(
          (response as { notification?: { request?: unknown } })?.notification?.request,
        );
        return owns(data) ? indexOf(data) : null;
      } catch {
        return null;
      }
    },

    // The app was already running. Returns its own unsubscribe.
    onTap: (handler: (index: number) => void): (() => void) => {
      const N = load();
      if (!N) return () => {};
      try {
        const sub = N.addNotificationResponseReceivedListener((response) => {
          const data = dataOf(response?.notification?.request);
          if (!owns(data)) return;
          const index = indexOf(data);
          if (index != null) handler(index);
        });
        return () => sub.remove();
      } catch {
        return () => {};
      }
    },
  };
};
