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

  // A whole-sample lag is 0.4% off at 330Hz and 0.8% at 440Hz; the parabola
  // through the dip is what gets under a tenth of that.
  it.each([330, 440])('finds %iHz to a fraction of a sample', (hz) => {
    const f = yin(sine(hz, 0.1), 0, 960, RATE);
    expect(Math.abs(f! - hz) / hz).toBeLessThan(0.001);
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

// A real vowel bends fast mid-word, and YIN stops being sure of a pitch it
// still has right. Dropping those frames made one word flip between her held
// note and her own pitch (2026-10-12).
describe('track, where a voice bends fast', () => {
  // 100ms at 227Hz, a fall of eight semitones over `seconds` while the vowel
  // turns (its weight moving from the 2nd harmonic to the 3rd), 100ms at
  // 140Hz. From the fall on, the voice is `quiet` times as loud.
  const fall = (seconds = 0.07, quiet = 1) => {
    let ph = 0;
    const hz: number[] = [];
    const x = Float32Array.from({ length: Math.round((0.2 + seconds) * RATE) }, (_, i) => {
      const u = Math.max(0, Math.min(1, (i / RATE - 0.1) / seconds));
      hz.push(227 * (140 / 227) ** u);
      ph += (2 * Math.PI * hz[i]) / RATE;
      const a = i < 0.1 * RATE ? 1 : quiet;
      return a * (0.4 * Math.sin(ph) + 0.3 * (1 - u) * Math.sin(2 * ph) + 0.3 * u * Math.sin(3 * ph) + 0.1 * Math.sin(4 * ph));
    });
    return { x, hz };
  };

  it('keeps the whole fall voiced, within a semitone of the pitch at each moment', () => {
    const { x, hz } = fall();
    const { frames } = track(x, RATE);
    for (const { at, f0 } of frames.slice(2, -2)) {
      expect(f0).not.toBeNull();
      expect(Math.abs(12 * Math.log2(f0! / hz[at]))).toBeLessThan(1);
    }
  });

  it('carries a voice to the end of a word that bends as it stops', () => {
    const { x } = fall();
    // cut off mid-fall: only the voice before it can vouch for the last frames
    const { frames } = track(x.slice(0, Math.round(0.18 * RATE)), RATE);
    expect(frames.slice(2, -1).every((f) => f.f0 !== null)).toBe(true);
  });

  it('picks a voice up from the start of a word that begins mid-bend', () => {
    const { x } = fall();
    // begun mid-fall: only the voice after it can vouch for the first frames
    const { frames } = track(x.slice(Math.round(0.13 * RATE)), RATE);
    expect(frames.slice(2, -1).every((f) => f.f0 !== null)).toBe(true);
  });

  it('stops at a sudden drop in loudness', () => {
    const { frames } = track(fall(0.05, 0.3).x, RATE);
    expect(frames.slice(2, -2).some((f) => f.f0 === null)).toBe(true);
  });

  let seed = 1;
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
  const tone = (i: number, hz = 200) => {
    const t = (2 * Math.PI * hz * i) / RATE;
    return 0.4 * Math.sin(t) + 0.2 * Math.sin(2 * t) + 0.1 * Math.sin(3 * t);
  };
  // 150ms of a 200Hz voice, 150ms of `middle`, 150ms of the voice again
  const between = (middle: (i: number) => number) => {
    seed = 1;
    const x = Float32Array.from({ length: Math.round(0.45 * RATE) }, (_, i) =>
      i >= 0.15 * RATE && i < 0.3 * RATE ? middle(i) : tone(i),
    );
    return track(x, RATE).frames.map((f) => f.f0);
  };

  it('does not carry a voice into noise that only hides one', () => {
    expect(between((i) => 0.25 * tone(i) + noise()).slice(17, 30).every((f) => f === null)).toBe(true);
  });

  it('does not glue a jump of a fifth together', () => {
    expect(between((i) => 0.75 * tone(i, 300) + 0.5 * noise()).slice(2, -2).some((f) => f === null)).toBe(true);
  });
});
