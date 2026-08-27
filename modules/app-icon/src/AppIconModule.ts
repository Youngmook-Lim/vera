import { NativeModule, requireNativeModule } from 'expo';

declare class AppIconModule extends NativeModule<Record<string, never>> {
  // The face currently showing, or '' when the state cannot be read.
  getIcon(): string;
  // True when the launcher was actually changed; false when the face was
  // already showing, or the face is unknown.
  setIcon(face: string): boolean;
}

export default requireNativeModule<AppIconModule>('AppIcon');
