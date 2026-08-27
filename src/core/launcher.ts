import AppIcon from '../../modules/app-icon/src/AppIconModule';
import { faceFor } from './appIcon';

// The effectful half of the rotation: `appIcon.ts` decides the face, this puts
// it on the launcher. Kept apart so the decision stays testable without a
// device — the native module is a jest no-op.
//
// Only ever called on the background transition. Disabling the alias the app
// is currently running under is the one operation Android is unreliable about,
// and the subject cannot see the launcher while they are inside the app, so
// there is nothing to gain by doing it sooner.
export const syncLauncherIcon = (hasKey: boolean, now: number = Date.now()): void => {
  try {
    AppIcon.setIcon(faceFor(now, hasKey));
  } catch {
    // An icon is cosmetic. A launcher that refuses the swap, a device with no
    // launcher at all, or a module that failed to link must never be the
    // reason the app goes down on the way to the background.
  }
};
