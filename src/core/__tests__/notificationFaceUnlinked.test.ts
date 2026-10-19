// Every dev build made before this module existed has no NotificationFace in
// it. Its own file for the reason powerUnlinked.test.ts is: a file-level
// jest.mock is the only thing that displaces the global one.
jest.mock('../../../modules/notification-face/src/NotificationFaceModule', () => ({
  __esModule: true,
  default: null,
}));

import { syncNotificationTheme } from '../notificationFace';

describe('a build with no notification-face module', () => {
  it('does nothing, and takes nothing down', () => {
    expect(() => syncNotificationTheme('light')).not.toThrow();
  });
});
