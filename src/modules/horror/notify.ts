import { type PermissionState, makeDaily } from '../notify';
import { redactionFor } from './card';
import { STORIES } from './stories';
import { T } from './strings';

export type { PermissionState };

// This room's nightly story: ten at night, the first sentence, and blocks
// where the second one is. The mechanism is shared (../notify.ts); what is in
// the notification belongs here.
export const NOTIFY_HOUR = 22;

const daily = makeDaily({
  room: 'horror',
  channel: 'horror',
  channelName: 'TWO SENTENCE HORROR',
  hour: NOTIFY_HOUR,
  count: () => STORIES.length,
  build: (index, lang) => ({
    title: T[lang].label,
    // The setup goes out whole and the turn does not go out at all. A
    // notification is readable on a lock screen the moment it lands, so the
    // only way to withhold the second sentence is not to send it — the blocks
    // are what says that something is being withheld rather than that the
    // story simply ended.
    body: `${STORIES[index].setup}\n${redactionFor(STORIES[index].turn)}`,
  }),
});

export const permissionState = daily.permissionState;
export const requestNightly = daily.request;
export const syncNightly = daily.sync;
export const readTapTarget = daily.readTapTarget;
export const onTap = daily.onTap;
