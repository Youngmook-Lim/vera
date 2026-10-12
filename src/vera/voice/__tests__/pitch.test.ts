import { track, yin } from '../pitch';

const RATE = 24000;
const sine = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / RATE));
// A fundamental and two harmonics, so the detector is shown something
// voice-shaped and not only a pure tone.
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });

describe('yin', () => {
  it.each([110, 220, 330])('finds %iHz in a pure tone to within 1%', (hz) => {
    const f = yin(sine(hz, 0.1), 0, 960, RATE);
    expect(f).not.toBeNull();
    expect(Math.abs(f! - hz) / hz).toBeLessThan(0.01);
  });

  it('finds the fundamental, not a harmonic', () => {
    const f = yin(voiced(150, 0.1), 0, 960, RATE);
    expect(Math.abs(f! - 150) / 150).toBeLessThan(0.01);
  });

  it('calls silence unvoiced', () => {
    expect(yin(new Float32Array(960), 0, 960, RATE)).toBeNull();
  });

  it('calls noise unvoiced', () => {
    let s = 1;
    const noise = Float32Array.from({ length: 960 }, () => {
      s = (s * 16807) % 2147483647;
      return (s / 2147483647 - 0.5) * 0.8;
    });
    expect(yin(noise, 0, 960, RATE)).toBeNull();
  });

  it('refuses a window that runs off the signal', () => {
    expect(yin(sine(220, 0.01), 0, 960, RATE)).toBeNull();
  });
});

describe('track', () => {
  it('reports one frame per 10ms hop, each at its own sample', () => {
    const { frames, hop } = track(sine(220, 0.5), RATE);
    expect(hop).toBe(240);
    expect(frames).toHaveLength(Math.ceil(12000 / 240));
    expect(frames[3].at).toBe(720);
  });

  it('tracks a steady voice across its middle', () => {
    const { frames } = track(voiced(200, 0.5), RATE);
    const middle = frames.slice(5, -5).map((f) => f.f0);
    expect(middle.every((f) => f !== null && Math.abs(f - 200) / 200 < 0.02)).toBe(true);
  });
});
