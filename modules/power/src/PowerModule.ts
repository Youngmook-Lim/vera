import { NativeModule, requireNativeModule } from 'expo';

declare class PowerModule extends NativeModule<Record<string, never>> {
  // Whether this app sits on Android's battery-optimisation whitelist —
  // which is what Samsung's Battery → Unrestricted actually writes to.
  isIgnoringBatteryOptimizations(): boolean;
  // Opens the one-tap system dialog asking for that exemption. True when the
  // dialog was launched, which says nothing about what the subject chose.
  requestIgnoreBatteryOptimizations(): boolean;
}

export default requireNativeModule<PowerModule>('Power');
