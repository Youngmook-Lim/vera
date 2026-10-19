// Her face on a notification is drawn natively, when the card arrives — see
// modules/notification-face. All the JS side does is say which finish: the
// receiver cannot ask the store, and the per-app night mode is written only
// on the way out of the app.
import NotificationFace from '../../modules/notification-face/src/NotificationFaceModule';
import type { Theme } from './theme';

export const syncNotificationTheme = (theme: Theme): void => {
  if (!NotificationFace) return;
  try {
    NotificationFace.setTheme(theme === 'dark');
  } catch {
    // A card arriving in the other finish is not worth taking anything down.
  }
};
