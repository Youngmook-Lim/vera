import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class NotificationFaceModule extends NativeModule<Record<string, never>> {
  // Records which finish her face on a notification is drawn in. The receiver
  // reads it when a card ARRIVES, so a theme switch reschedules nothing.
  setTheme(dark: boolean): boolean;
}

// `requireOptionalNativeModule`, NOT `requireNativeModule` — see
// modules/power/src/PowerModule.ts for the crash that taught this. Every dev
// build made before this module existed has none, and must not die on import.
export default requireOptionalNativeModule<NotificationFaceModule>('NotificationFace');
