import { START_DIST, walkStep, needleAngle, signalLitCount, veraKey } from './walk';

describe('walkStep', () => {
  it('decrements by 6..12 and floors at 0', () => {
    expect(walkStep(340, () => 0)).toBe(334); // 340 - 6
    expect(walkStep(340, () => 0.999)).toBe(328); // 340 - 12
    expect(walkStep(3, () => 0.999)).toBe(0); // floored
  });
});

describe('needleAngle', () => {
  it('is ~34° at the start and 0° at arrival', () => {
    expect(needleAngle(START_DIST)).toBeCloseTo(34, 5);
    expect(needleAngle(0)).toBeCloseTo(0, 5);
  });
});

describe('signalLitCount', () => {
  it('lights more bars as distance shrinks', () => {
    expect(signalLitCount(340)).toBe(1); // bar 1 always
    expect(signalLitCount(300)).toBe(2); // < 320
    expect(signalLitCount(200)).toBe(3); // < 240
    expect(signalLitCount(100)).toBe(4); // < 120
    expect(signalLitCount(0)).toBe(5); // <= 0
  });
});

describe('veraKey', () => {
  it('escalates by proximity', () => {
    expect(veraKey(340, false, false)).toBe('vera');
    expect(veraKey(300, true, false)).toBe('veraWalking');
    expect(veraKey(90, true, false)).toBe('veraNear');
    expect(veraKey(0, false, true)).toBe('veraArrived');
  });
});
