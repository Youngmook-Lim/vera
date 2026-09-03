import AppIcon from '../../modules/app-icon/src/AppIconModule';
import { faceFor, type Face } from './appIcon';

// The effectful half of the rotation: `appIcon.ts` decides the face, this puts
// it on the launcher. Kept apart so the decision stays testable without a
// device — the native module is a jest no-op.
//
// Only ever called on the background transition. Disabling the alias the app
// is currently running under is the one operation Android is unreliable about,
// and the subject cannot see the launcher while they are inside the app, so
// there is nothing to gain by doing it sooner.

// What the last swap actually did. Session-only and deliberately not a store:
// it is a diagnostic, not something she or the subject owns, and it should
// survive nothing.
//
// It exists because the failure it reports went unnoticed for weeks. This
// function used to swallow every error and return void, which made a launcher
// that refuses the swap indistinguishable from one that took it, and left no
// way to tell the two apart short of guessing. `getIcon` has been on the native
// module since the beginning, built to answer exactly this, and nothing ever
// called it.
let lastResult: string | null = null;

export const launcherResult = (): string | null => lastResult;

// The face the launcher is ACTUALLY wearing, read off the manifest's component
// states rather than inferred from what we last asked for. `null` when it
// cannot be read at all, which is itself worth showing.
export const readLauncherFace = (): Face | null => {
  try {
    return AppIcon.getIcon() || null;
  } catch {
    return null;
  }
};

export const syncLauncherIcon = (hasKey: boolean, now: number = Date.now()): void => {
  const want = faceFor(now, hasKey);
  try {
    AppIcon.setIcon(want);
    // `setIcon` returns false both for "already showing" and for "no such
    // face", which are not the same thing at all, so the answer comes from
    // reading the state back instead of from what it returned. Agreement here
    // means the aliases did move; the home screen still showing something else
    // after that is the launcher's own cache, and a different problem.
    const got = AppIcon.getIcon();
    lastResult = got === want ? null : `asked for ${want}, launcher reports ${got || 'nothing'}`;
  } catch (error) {
    // An icon is cosmetic. A launcher that refuses the swap, a device with no
    // launcher at all, or a module that failed to link must never be the
    // reason the app goes down on the way to the background — so this is still
    // caught. It is no longer silent: the SYSTEM screen reads it.
    lastResult = error instanceof Error ? error.message : String(error);
  }
};
