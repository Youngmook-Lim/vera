import { type PermissionState, makeDaily } from '../notify';
import { LINES, SOURCE } from './lines';
import { T } from './strings';

export type { PermissionState };

// This room's daily card: ten in the morning, her line, and her name under it.
// The mechanism is shared (../notify.ts); what is in the notification belongs
// here.
export const NOTIFY_HOUR = 10;

const daily = makeDaily({
  room: 'affirmations',
  // A new channel, so nothing to retire: no earlier one was ever created at
  // the wrong importance.
  channel: 'affirmations.v1',
  channelName: 'AFFIRMATIONS',
  hour: NOTIFY_HOUR,
  count: () => LINES.length,
  build: (index, lang) => ({
    title: T[lang].label,
    // The text must be inside the notification before Android takes it:
    // nothing of ours is awake at ten to choose one.
    body: `${LINES[index]}\n— ${SOURCE.author}`,
  }),
});

export const permissionState = daily.permissionState;
export const requestDaily = daily.request;
export const syncDaily = daily.sync;
export const readTapTarget = daily.readTapTarget;
export const onTap = daily.onTap;
