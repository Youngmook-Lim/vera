import { registerWebModule, NativeModule } from 'expo';

// There is no launcher on the web, and no Android build of this app targets
// it — the stub exists so an import cannot break a web bundle.
class AppIconModule extends NativeModule<Record<string, never>> {
  getIcon(): string {
    return '';
  }

  setIcon(): boolean {
    return false;
  }
}

export default registerWebModule(AppIconModule, 'AppIconModule');
