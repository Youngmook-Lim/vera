import { registerWebModule, NativeModule } from 'expo';

// No battery optimisation on the web, and no build of this app targets it —
// the stub exists so an import cannot break a web bundle.
class PowerModule extends NativeModule<Record<string, never>> {
  isIgnoringBatteryOptimizations(): boolean {
    return false;
  }

  requestIgnoreBatteryOptimizations(): boolean {
    return false;
  }
}

export default registerWebModule(PowerModule, 'PowerModule');
