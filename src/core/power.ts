// The effectful half of the battery exemption, kept beside launcher.ts for the
// same reason: the native module is a jest no-op, so anything worth reasoning
// about has to sit on this side of it.
//
// Why this exists at all is written down in modules/power's Kotlin: Samsung's
// Freecess holds a frozen app's alarms past their hour, and Battery →
// Unrestricted is the only thing that lifts it. It is invisible from inside
// the app unless something asks.

type Native = {
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): boolean;
};

// Lazily required, exactly as notify.ts requires expo-notifications.
// `requireNativeModule` THROWS at import when the module is not linked, so a
// static import would take the whole app down on any build made before this
// module existed — which is every build currently on the phone.
const load = (): Native | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('../../modules/power/src/PowerModule') as { default: Native }).default;
  } catch {
    return null;
  }
};

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
