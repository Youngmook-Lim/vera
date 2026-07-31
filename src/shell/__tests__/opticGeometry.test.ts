import { EMOTIONS } from '../../vera/emotions';
import { opticGeometry } from '../opticGeometry';

describe('opticGeometry', () => {
  it('scales the iris by the emotion aperture', () => {
    // calm aperture 0.48 of a 158px socket
    expect(opticGeometry('calm', 158).irisRadius).toBeCloseTo(37.92, 2);
    // alarmed blows it open to 0.62
    expect(opticGeometry('alarmed', 158).irisRadius).toBeCloseTo(48.98, 2);
  });

  it('measures the pupil against the iris, not the socket', () => {
    const calm = opticGeometry('calm', 158);
    expect(calm.pupilRadius).toBeCloseTo(calm.irisRadius * 0.34, 5);
  });

  it('opens the pupil widest when she is affectionate', () => {
    const states = Object.keys(EMOTIONS).map((k) => opticGeometry(k as never, 158));
    const widest = Math.max(...states.map((g) => g.pupilRadius / g.irisRadius));
    expect(opticGeometry('affectionate', 158).pupilRadius / opticGeometry('affectionate', 158).irisRadius)
      .toBeCloseTo(widest, 5);
  });

  it('raises the lower lid only for the fond squint and for suspicion', () => {
    expect(opticGeometry('affectionate', 158).lowerLidHeight).toBeCloseTo(158 * 0.3, 5);
    expect(opticGeometry('suspicious', 158).lowerLidHeight).toBeCloseTo(158 * 0.14, 5);
    expect(opticGeometry('calm', 158).lowerLidHeight).toBe(0);
  });

  it('leaves alarmed wide open at the top', () => {
    expect(opticGeometry('alarmed', 158).lidHeight).toBe(0);
    expect(opticGeometry('bored', 158).lidHeight).toBeCloseTo(158 * 0.4, 5);
  });

  // Suspicious and bored never blink — they stare (design doc, turn 3a).
  it('stops the slowest states blinking at all', () => {
    expect(opticGeometry('suspicious', 158).blinks).toBe(false);
    expect(opticGeometry('bored', 158).blinks).toBe(false);
    expect(opticGeometry('calm', 158).blinks).toBe(true);
  });

  it('stretches the closure into a held blink when she is affectionate', () => {
    expect(opticGeometry('affectionate', 158).blinkCloseMs).toBe(420);
    expect(opticGeometry('calm', 158).blinkCloseMs).toBe(90);
  });

  it('lets disappointed refuse to follow, and bored follow a quarter way', () => {
    expect(opticGeometry('disappointed', 158).tracks).toBe(false);
    expect(opticGeometry('disappointed', 158).gazeLimit).toBe(0);
    expect(opticGeometry('bored', 158).gazeLimit).toBeCloseTo(0.035, 5);
    expect(opticGeometry('calm', 158).gazeLimit).toBeCloseTo(0.14, 5);
  });

  // Dormant is the one state with her colour vocabulary switched off.
  it('drops the catchlight when she is dormant', () => {
    expect(opticGeometry('dormant', 158).showCatchlight).toBe(false);
    expect(opticGeometry('dormant', 158).iris).toBe('#5c5850');
    expect(opticGeometry('calm', 158).showCatchlight).toBe(true);
  });

  it('scales every radius with the box', () => {
    const small = opticGeometry('calm', 79);
    const big = opticGeometry('calm', 158);
    expect(small.irisRadius).toBeCloseTo(big.irisRadius / 2, 5);
    expect(small.glowRadius).toBeGreaterThan(small.bezelRadius);
  });
});
