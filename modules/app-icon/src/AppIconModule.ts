import { NativeModule, requireNativeModule } from 'expo';

declare class AppIconModule extends NativeModule<Record<string, never>> {
  // The face currently showing, or '' when the state cannot be read.
  getIcon(): string;
  // True when the launcher was actually changed; false when the face was
  // already showing, or the face is unknown.
  setIcon(face: string): boolean;
  // Sets this app's own night mode, which Android persists and uses to theme
  // the splash it draws before any code runs. True when it was set; false on
  // Android 11 and older, which have no per-app night mode. Optional because a
  // build made before it existed does not have it.
  setNightMode?(dark: boolean): boolean;
}

export default requireNativeModule<AppIconModule>('AppIcon');
