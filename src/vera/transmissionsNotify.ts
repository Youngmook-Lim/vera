import { planBag } from '../modules/daily';
import { type PermissionState, makeDaily } from '../modules/notify';
import type { Mode } from './modes/registry';
import type { TransmissionSlot } from './modes/types';
import { CHANNEL, SLOTS, TITLE, TRANSMISSION_DAYS, linesFor } from './transmissions';

export type { PermissionState };

// One notifier per slot, sharing one channel. Two rather than one notifier
// with two hours because `cancelOwn` already keys on `room`: distinct tags are
// the whole of what keeps the slots apart, with no change to the cancelling
// rule, and two pools can never collide on one day because they are different
// pools.
//
// Built per call rather than at module scope, which is what lets the register
// be a PARAMETER instead of module state. `makeDaily` has no side effects at
// construction — it defines its closures and returns them — so this is free.
//
// That it is a parameter is load-bearing: this file must not import the store,
// because store.ts imports THIS (setMode re-plans the queue) and the cycle
// would close.
const notifierFor = (slot: TransmissionSlot, hour: number, mode: Mode) =>
  makeDaily({
    room: `transmission.${slot}`,
    channel: CHANNEL,
    channelName: TITLE,
    hour,
    days: TRANSMISSION_DAYS,
    plan: planBag,
    count: () => linesFor(mode, slot).length,
    // `lang` is ignored, and that discard IS the English-only decision. The
    // parameter exists for rooms whose content translates; hers does not.
    // Reversing it means widening `transmissions` to Strings<> and reading the
    // argument here, and nothing else.
    build: (index) => ({ title: TITLE, body: linesFor(mode, slot)[index] }),
  });

export const syncTransmissions = async (
  on: boolean,
  mode: Mode,
  now: Date,
): Promise<void> => {
  for (const { slot, hour } of SLOTS) {
    await notifierFor(slot, hour, mode).sync(on, 'en', now);
  }
};

// Permission and the channel belong to neither slot, so either notifier can
// answer for both, and the register is irrelevant to each call.
const either = () => notifierFor(SLOTS[0].slot, SLOTS[0].hour, 'default');

export const requestTransmissions = (): Promise<boolean> => either().request();
export const transmissionPermission = (): Promise<PermissionState> =>
  either().permissionState();

// `readTapTarget` and `onTap` are deliberately NOT re-exported. A tap opens the
// app and she greets as usual: the transmission did its work on the lock screen
// before the app was involved, and Android's default is exactly what is wanted.
