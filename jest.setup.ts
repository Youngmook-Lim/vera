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
