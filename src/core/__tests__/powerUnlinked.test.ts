// The case that actually crashed the SYSTEM screen (2026-09-10): a build with
// no native module in it. Its own file because the mock has to replace the
// global one from jest.setup.ts wholesale, and a file-level jest.mock is the
// only thing that reliably does — jest.doMock inside isolateModules does not
// displace a setup-level mock of the same path.
jest.mock('../../../modules/power/src/PowerModule', () => ({
  __esModule: true,
  default: null,
}));

import { askBatteryUnrestricted, isBatteryUnrestricted } from '../power';

// The module had failed to link for want of an android/build.gradle, and
// `requireNativeModule` throws on that — a throw NO caller can catch, because
// Metro's guardedLoadModule intercepts whatever a module body throws and hands
// it to global.ErrorUtils.reportFatalError before any try/catch is reached.
// `requireOptionalNativeModule` returns null instead.
//
// **This test does not catch that crash and cannot.** It passes against the
// version that shipped it: under jest the require resolves to whatever the
// mock says, so the throw never happens and Metro's loader is not involved at
// all. It is the same blind spot as Skia and worklets — a device is the only
// detector. What it does hold is the contract on THIS side of the boundary:
// given no module, power.ts answers null and asks for nothing. The part that
// must not regress silently is the import in PowerModule.ts, and the only
// thing guarding that is the comment sitting on it.
describe('a build with no native module in it', () => {
  it('reads null rather than taking the app down', () => {
    expect(isBatteryUnrestricted()).toBeNull();
  });

  it('asks for nothing, and says it asked for nothing', () => {
    expect(askBatteryUnrestricted()).toBe(false);
  });
});
