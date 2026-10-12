import { track } from '../pitch';
import { psola } from '../psola';

const RATE = 24000;
const voiced = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  });
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};
const pitchOf = (x: Float32Array) =>
  median(track(x, RATE).frames.slice(5, -5).map((f) => f.f0).filter((f): f is number => f !== null));

describe('psola', () => {
  it('leaves the pitch alone when the target is the source', () => {
    const x = voiced(200, 0.5);
    const { frames, hop } = track(x, RATE);
    const y = psola(x, RATE, frames, frames.map((f) => f.f0), hop);
    expect(Math.abs(pitchOf(y) - 200) / 200).toBeLessThan(0.02);
  });

  it.each([[200, 150], [200, 260]])('moves %iHz to %iHz', (from, to) => {
    const x = voiced(from, 0.5);
    const { frames, hop } = track(x, RATE);
    const y = psola(x, RATE, frames, frames.map((f) => (f.f0 === null ? null : to)), hop);
    expect(Math.abs(pitchOf(y) - to) / to).toBeLessThan(0.03);
  });

  it('keeps the duration exactly', () => {
    const x = voiced(180, 0.37);
    const { frames, hop } = track(x, RATE);
    expect(psola(x, RATE, frames, frames.map(() => 140), hop)).toHaveLength(x.length);
  });

  it('passes unvoiced sound through untouched', () => {
    const x = Float32Array.from({ length: 4800 }, (_, i) => 0.004 * Math.sin(i * 1.7));
    const { frames, hop } = track(x, RATE);
    expect(frames.every((f) => f.f0 === null)).toBe(true);
    const y = psola(x, RATE, frames, frames.map(() => null), hop);
    for (let i = 600; i < 4200; i++) expect(Math.abs(y[i] - x[i])).toBeLessThan(1e-4);
  });

  // Two near-equal peaks a sliver of a cycle apart, trading places seven times
  // a second. Marking each cycle at its loudest sample jumped between them, and
  // the misaligned grains cancelled into static (2026-10-12).
  it('keeps every cycle the same shape when the loudest peak keeps changing places', () => {
    const x = Float32Array.from({ length: RATE / 2 }, (_, i) => {
      const ph = (i % (RATE / 200)) / (RATE / 200);
      const d = 0.04 * Math.sin((2 * Math.PI * 7 * i) / RATE);
      const bump = (at: number, a: number) => a * Math.exp(-(((ph - at) / 0.03) ** 2));
      return bump(0.2, 0.5 + d) + bump(0.35, 0.5 - d) - 0.25 * Math.sin(2 * Math.PI * ph);
    });
    const { frames, hop } = track(x, RATE);
    const y = psola(x, RATE, frames, frames.map((f) => (f.f0 === null ? null : 170)), hop);
    const p = Math.round(RATE / 170);
    for (let a = 2400; a + 2 * p + 3 < y.length - 2400; a += p) {
      let best = -1;
      for (let lag = p - 3; lag <= p + 3; lag++) {
        let xy = 0;
        let xx = 0;
        let yy = 0;
        for (let i = 0; i < p; i++) {
          xy += y[a + i] * y[a + i + lag];
          xx += y[a + i] ** 2;
          yy += y[a + i + lag] ** 2;
        }
        best = Math.max(best, xy / Math.sqrt(xx * yy));
      }
      expect(best).toBeGreaterThan(0.95);
    }
  });

  it('survives an empty or a tiny input without a single NaN', () => {
    expect(psola(new Float32Array(0), RATE, [], [], 240)).toHaveLength(0);
    const tiny = Float32Array.from([0.1, -0.1, 0.2]);
    const { frames, hop } = track(tiny, RATE);
    expect(Array.from(psola(tiny, RATE, frames, frames.map((f) => f.f0), hop)).every(Number.isFinite)).toBe(true);
  });
});
