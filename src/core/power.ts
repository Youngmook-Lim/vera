// The effectful half of the battery exemption, kept beside launcher.ts for the
// same reason: the native module is a jest no-op, so anything worth reasoning
// about has to sit on this side of it.
//
// Why this exists at all is written down in modules/power's Kotlin: Samsung's
// Freecess holds a frozen app's alarms past their hour, and Battery →
// Unrestricted is the only thing that lifts it. It is invisible from inside
// the app unless something asks.

import Power from '../../modules/power/src/PowerModule';

type Native = {
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): boolean;
};

// A STATIC import is safe here only because PowerModule.ts uses
// `requireOptionalNativeModule`, which returns null rather than throwing when
// the module is not in the build.
//
// The earlier version lazily required it inside a try/catch, on the reasoning
// that a build made before this module existed must degrade rather than crash.
// That reasoning was right and the mechanism was useless: Metro's
// `guardedLoadModule` catches whatever a module body throws and calls
// `global.ErrorUtils.reportFatalError` itself, so the catch here never ran and
// the SYSTEM screen died on open (2026-09-10). Nothing wrapping a `require`
// can protect against a module that throws at import; the module has to not
// throw.
const load = (): Native | null => Power ?? null;

// `null` is not a third opinion about the setting — it means we could not ask.
// Kept apart from `false` deliberately: a row that cannot see the setting must
// not tell the subject in red that they have failed to set it. This is the
// same distinction readLauncherFace draws, and for the same reason.
export const isBatteryUnrestricted = (): boolean | null => {
  const native = load();
  if (!native) return null;
  try {
    return native.isIgnoringBatteryOptimizations();
  } catch {
    return null;
  }
};

// Opens the system dialog. Returns whether it was LAUNCHED — never what the
// subject chose, which only the next read can answer. A device that refuses
// the intent gets a false and no exception: this is a courtesy, and it must
// never be the reason a toggle fails.
export const askBatteryUnrestricted = (): boolean => {
  const native = load();
  if (!native) return false;
  try {
    return native.requestIgnoreBatteryOptimizations();
  } catch {
    return false;
  }
};
