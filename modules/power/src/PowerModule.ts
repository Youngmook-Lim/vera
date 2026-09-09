import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class PowerModule extends NativeModule<Record<string, never>> {
  // Whether this app sits on Android's battery-optimisation whitelist —
  // which is what Samsung's Battery → Unrestricted actually writes to.
  isIgnoringBatteryOptimizations(): boolean;
  // Opens the one-tap system dialog asking for that exemption. True when the
  // dialog was launched, which says nothing about what the subject chose.
  requestIgnoreBatteryOptimizations(): boolean;
}

// `requireOptionalNativeModule`, NOT `requireNativeModule`. The latter THROWS
// when the module is not in the build, and that throw cannot be caught by the
// caller: Metro's `guardedLoadModule` intercepts anything a module body throws
// and hands it to `global.ErrorUtils.reportFatalError`, which in a release
// build is a hard crash. A try/catch around the require never runs. This cost
// a crash on the SYSTEM screen (2026-09-10) — the module had failed to link
// for want of an android/build.gradle, and the guard that was supposed to
// degrade gracefully was never reached.
export default requireOptionalNativeModule<PowerModule>('Power');
