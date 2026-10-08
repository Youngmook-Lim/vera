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

// The battery-optimisation whitelist, which is what Samsung's Unrestricted
// writes to. Default is exempt, so the SYSTEM row's warning state is something
// a test has to ask for rather than something every test trips over.
jest.mock('./modules/power/src/PowerModule', () => ({
  __esModule: true,
  default: {
    isIgnoringBatteryOptimizations: jest.fn(() => true),
    requestIgnoreBatteryOptimizations: jest.fn(() => true),
  },
}));

// requireNativeModule throws the moment it is imported without a native
// runtime, so the launcher module has to be stubbed rather than guarded at the
// call site. The rotation's decision — which face today wears — is pure and
// tested directly in src/core/__tests__/appIcon.test.ts; what is mocked away
// here is only the PackageManager call that puts it on the home screen.
jest.mock('./modules/app-icon/src/AppIconModule', () => ({
  __esModule: true,
  default: { getIcon: () => '', setIcon: () => false, setNightMode: () => true },
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
  // expo's own enum, not AOSP's: expo DEFAULT is 5 and HIGH is 6, remapped to
  // Android's 3 and 4 natively. Worth spelling out, because a mock carrying the
  // AOSP numbers reads as correct and is not.
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
  // DATE is what both rooms and her transmissions use: their content varies,
  // so each firing is its own dated notification. WEEKLY is module 03's, whose
  // content does not vary and so may repeat forever (2026-09-23).
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
  setNotificationChannelAsync: jest.fn(async () => {}),
  // A room that has moved channel has to be able to take its old one away.
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  // Cancelling is per-room now: a sync reads the queue and cancels only the
  // rows it owns, so both of these have to exist for any of it to run.
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  // Without a handler registered, expo presents nothing at all while the app
  // is open — so this has to exist for the one call that closes that hole.
  setNotificationHandler: jest.fn(() => {}),
}));
