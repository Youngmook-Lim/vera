import AppIcon from '../../modules/app-icon/src/AppIconModule';
import { aliasFor, faceFor, type Face } from './appIcon';
import type { Theme } from './theme';

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

export const syncLauncherIcon = (
  hasKey: boolean,
  theme: Theme,
  now: number = Date.now(),
): void => {
  const want = aliasFor(faceFor(now, hasKey), theme);
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

// The colour of the very first frame of the next launch (2026-10-08). Android
// draws it from the splash theme before any of our code runs, so the only way
// to make it the subject's theme is to tell the SYSTEM which one that is ahead
// of time: `setNightMode` sets this app's own night mode, which Android
// persists and reads when it next builds the splash. app.json gives the day
// half the light ground and the night half the dark one.
//
// Ridden on the background transition beside the icon, for the same reason:
// it only matters to a launch that has not happened yet. Android 11 and older
// have no per-app night mode, and there the first frame follows the system's.
//
// Guarded by `typeof` as well as a catch, because a dev build made before this
// function existed has the module but not the method — and calling undefined
// is a TypeError on the way to the background, which is no place for one.
export const syncLaunchTheme = (theme: Theme): void => {
  try {
    if (typeof AppIcon.setNightMode === 'function') AppIcon.setNightMode(theme === 'dark');
  } catch {
    // A launch frame is cosmetic, exactly as the icon is.
  }
};
