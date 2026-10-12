import { contourFor, hashText, median, prng, snap } from '../contour';
import type { PitchFrame } from '../pitch';

const S = { flatten: 0.85, jumpChance: 0.3, jumpSemitones: 3 };
const frames = (f0s: (number | null)[]): PitchFrame[] => f0s.map((f0, i) => ({ at: i * 240, f0 }));
const semis = (hz: number, ref: number) => 12 * Math.log2(hz / ref);

describe('the seed', () => {
  it('hashes the same text the same way, Korean included', () => {
    expect(hashText('Noted.')).toBe(hashText('Noted.'));
    expect(hashText('Noted.')).not.toBe(hashText('Noted!'));
    expect(hashText('기록했어요.')).toBe(hashText('기록했어요.'));
    expect(hashText('기록했어요.')).not.toBe(hashText('기록했어요'));
  });

  it('is a fixed sequence for a fixed seed', () => {
    const a = prng(7);
    const b = prng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('the maths', () => {
  it('takes a median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it('snaps to the nearest semitone of the reference', () => {
    expect(snap(220 * 2 ** (0.4 / 12), 220)).toBeCloseTo(220, 6);
    expect(snap(220 * 2 ** (0.6 / 12), 220)).toBeCloseTo(220 * 2 ** (1 / 12), 6);
  });
});

describe('contourFor', () => {
  it('lands every voiced frame on a semitone of the median, and keeps silence silent', () => {
    const f0s = [180, 190, 200, 210, 230, null, 250, 240];
    const out = contourFor(frames(f0s), 'Noted.', S);
    const ref = median(f0s.filter((f): f is number => f !== null));
    out.forEach((hz, i) => {
      if (f0s[i] === null) expect(hz).toBeNull();
      else expect(Math.abs(semis(hz!, ref) - Math.round(semis(hz!, ref)))).toBeLessThan(1e-9);
    });
  });

  it('flattens: an octave of input spans two semitones out', () => {
    const input = [150, 175, 200, 225, 250, 275, 300];
    const out = contourFor(frames(input), 'x', { ...S, jumpChance: 0 }) as number[];
    const span = (xs: number[]) => semis(Math.max(...xs), Math.min(...xs));
    expect(span(input)).toBeGreaterThan(11);
    expect(span(out)).toBeLessThanOrEqual(2 + 1e-9);
  });

  it('gives the same line the same jumps, every time', () => {
    const f = frames([200, 200, null, 200, 200, null, 200, null, 200]);
    expect(contourFor(f, 'Do not do that again.', S)).toEqual(contourFor(f, 'Do not do that again.', S));
  });

  it('moves a whole voiced run by the set interval, never part of one', () => {
    const f = frames([200, 200, 200, null, 200, 200, 200, null, 200, 200, 200]);
    const out = contourFor(f, 'Do not do that again.', { ...S, jumpChance: 1 });
    for (const run of [out.slice(0, 3), out.slice(4, 7), out.slice(8, 11)]) {
      expect(new Set(run).size).toBe(1);
      expect(Math.abs(Math.abs(semis(run[0]!, 200)) - 3)).toBeLessThan(1e-9);
    }
  });

  it('gives different lines different jumps', () => {
    const f = frames(Array.from({ length: 40 }, (_, i) => (i % 4 === 3 ? null : 200)));
    expect(contourFor(f, 'Do not do that again.', S)).not.toEqual(contourFor(f, 'You came back.', S));
  });

  it('leaves a line with no voiced frame entirely unvoiced', () => {
    expect(contourFor(frames([null, null]), 'x', S)).toEqual([null, null]);
  });
});
