import { processVoice } from '../chain';
import { comb, grit, normalize, ringMod } from '../fx';
import { typewriterPace } from '../pace';
import { SETTINGS } from '../settings';

const RATE = 24000;
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });
const peakOf = (y: Float32Array) => y.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe('fx', () => {
  it('ring modulation at zero mix changes nothing', () => {
    const x = voiced(200, 0.01);
    expect(Array.from(ringMod(x, RATE, 30, 0))).toEqual(Array.from(x));
  });

  it('comb rings an impulse at its delay, decaying by its feedback', () => {
    const x = new Float32Array(100);
    x[0] = 1;
    const y = comb(x, 1000, 10, 0.5, 1);
    expect(y[0]).toBe(1);
    expect(y[10]).toBeCloseTo(0.5);
    expect(y[20]).toBeCloseTo(0.25);
  });

  it('grit quantises to its bit depth', () => {
    expect(grit(Float32Array.from([0.3]), 2, 1)[0]).toBe(0.5);
  });

  it('normalises to the peak and leaves silence silent', () => {
    expect(peakOf(normalize(Float32Array.from([0.1, -0.2]), 0.9))).toBeCloseTo(0.9);
    expect(Array.from(normalize(new Float32Array(3), 0.9))).toEqual([0, 0, 0]);
  });
});

describe('processVoice', () => {
  it('returns finite audio of the same length that never clips', () => {
    const x = voiced(180, 0.6);
    const y = processVoice(x, RATE, 'Noted.');
    expect(y).toHaveLength(x.length);
    expect(Array.from(y).every(Number.isFinite)).toBe(true);
    expect(peakOf(y)).toBeLessThanOrEqual(SETTINGS.peak + 1e-6);
  });

  it('is identical for the same line, every time', () => {
    const x = voiced(180, 0.6);
    expect(Array.from(processVoice(x, RATE, 'Noted.'))).toEqual(Array.from(processVoice(x, RATE, 'Noted.')));
  });

  // Review Focus 1.
  it('survives a line too short or too quiet to have a pitch', () => {
    for (const x of [Float32Array.from([0.01, -0.01]), new Float32Array(2400), new Float32Array(0)]) {
      const y = processVoice(x, RATE, 'No.');
      expect(y).toHaveLength(x.length);
      expect(Array.from(y).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('typewriterPace', () => {
  it('is the silent 16ms with no voice', () => expect(typewriterPace(10, null)).toBe(16));
  it('spreads the line over the voice', () => expect(typewriterPace(10, 500)).toBe(50));
  it('never draws faster than 16ms or slower than 90ms', () => {
    expect(typewriterPace(10, 50)).toBe(16);
    expect(typewriterPace(10, 5000)).toBe(90);
  });
  it('does not divide by an empty line', () => expect(typewriterPace(0, 500)).toBe(16));
});
