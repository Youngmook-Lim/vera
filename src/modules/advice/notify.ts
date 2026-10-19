import { type PermissionState, makeDaily } from '../notify';
import { QUOTES, SOURCE } from './quotes';
import { T } from './strings';

export type { PermissionState };

// This room's daily card: nine in the morning, the whole highlight, and the
// book's author under it. The mechanism is shared (../notify.ts); what is in
// the notification belongs here.
export const NOTIFY_HOUR = 9;

const daily = makeDaily({
  room: 'advice',
  // Bumped from 'advice' (2026-09-14): the old channel was created at
  // importance DEFAULT with vibration off, and Android will not let an app
  // raise either on a channel that already exists.
  channel: 'advice.v2',
  legacyChannel: 'advice',
  channelName: 'EXCELLENT ADVICE',
  face: 'pleased',
  hour: NOTIFY_HOUR,
  count: () => QUOTES.length,
  build: (index, lang) => ({
    title: T[lang].label,
    // The text must be inside the notification before Android takes it:
    // nothing of ours is awake at nine to choose one.
    body: `${QUOTES[index]}\n— ${SOURCE.author}`,
  }),
  // This room scheduled untagged notifications before rooms had names, and a
  // device upgrading has up to ninety of them already in Android's queue. They
  // are recognisable by the key they carried, and claiming them here is what
  // lets the first sync after the upgrade clear them instead of leaving them
  // to fire alongside the new ones for the next ninety days.
  owns: (data) => data.room === 'advice' || typeof data.quote === 'number',
});

export const permissionState = daily.permissionState;
export const requestDaily = daily.request;
export const syncDaily = daily.sync;
export const readTapTarget = daily.readTapTarget;
export const onTap = daily.onTap;
