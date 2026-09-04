require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// The library ships its own mock; the native module has no jsdom counterpart.
jest.mock('react-native-keyboard-controller', () =>
  require('react-native-keyboard-controller/jest'),
);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Skia is native + CanvasKit-wasm and can't run in jsdom. Its official jest
// setup needs a custom canvaskit test environment; we don't exercise the Skia
// API in tests (components render to no-ops), so mock every export as a no-op.
// The Proxy covers Canvas/Circle/Path/Group/etc. automatically as modules grow.
jest.mock('@shopify/react-native-skia', () => {
  const Noop = () => null;
  return new Proxy(
    { __esModule: true } as Record<string, unknown>,
    { get: (target, prop) => (prop in target ? target[prop as string] : Noop) },
  );
});

// requireNativeModule throws the moment it is imported without a native
// runtime, so the launcher module has to be stubbed rather than guarded at the
// call site. The rotation's decision — which face today wears — is pure and
// tested directly in src/core/__tests__/appIcon.test.ts; what is mocked away
// here is only the PackageManager call that puts it on the home screen.
jest.mock('./modules/app-icon/src/AppIconModule', () => ({
  __esModule: true,
  default: { getIcon: () => '', setIcon: () => false },
}));

// Native, with no jsdom counterpart. Mocked globally rather than per-file
// because every test that renders the Stage imports it transitively, and a
// buzz is the one piece of feedback a test can never observe on its own.
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Native, with no jsdom counterpart. Mocked globally because App and the
// SYSTEM screen both reach it transitively, and a scheduled notification is
// something no test can observe arriving.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
