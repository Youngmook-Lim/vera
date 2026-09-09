import Power from '../../../modules/power/src/PowerModule';
import { askBatteryUnrestricted, isBatteryUnrestricted } from '../power';

const native = Power as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  native.isIgnoringBatteryOptimizations.mockReturnValue(true);
  native.requestIgnoreBatteryOptimizations.mockReturnValue(true);
});

// The whole point of this module is the third answer. Samsung's Unrestricted
// writes to the ordinary battery-optimisation whitelist, so the read is
// truthful when it works — but a build without the native module in it must
// say "could not ask" rather than "not set", or the row accuses the subject of
// neglecting something they may well have done.
describe('reading the exemption', () => {
  it('is true when the app is on the whitelist', () => {
    expect(isBatteryUnrestricted()).toBe(true);
  });

  it('is false when it is not', () => {
    native.isIgnoringBatteryOptimizations.mockReturnValue(false);
    expect(isBatteryUnrestricted()).toBe(false);
  });

  it('is null — not false — when the question cannot be asked', () => {
    native.isIgnoringBatteryOptimizations.mockImplementation(() => {
      throw new Error('no native module');
    });
    expect(isBatteryUnrestricted()).toBeNull();
  });
});

describe('asking for the exemption', () => {
  it('reports whether the dialog was launched', () => {
    expect(askBatteryUnrestricted()).toBe(true);
    expect(native.requestIgnoreBatteryOptimizations).toHaveBeenCalled();
  });

  // A courtesy must never be the reason a toggle fails, so a device that
  // refuses the intent gets a false rather than an exception.
  it('swallows a refusal', () => {
    native.requestIgnoreBatteryOptimizations.mockImplementation(() => {
      throw new Error('no activity');
    });
    expect(askBatteryUnrestricted()).toBe(false);
  });
});
