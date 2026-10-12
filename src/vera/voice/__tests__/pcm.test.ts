import { decodeWav, encodeWav, fromS16LE, toS16LE } from '../pcm';

describe('pcm', () => {
  it('round-trips samples through s16le to within one step', () => {
    const x = Float32Array.from([0, 0.5, -0.5, 0.999, -1]);
    const y = fromS16LE(toS16LE(x));
    x.forEach((v, i) => expect(Math.abs(y[i] - v)).toBeLessThan(1 / 32767 + 1e-6));
  });

  it('clamps past full scale rather than wrapping', () => {
    const y = fromS16LE(toS16LE(Float32Array.from([1.5, -1.5])));
    expect(y[0]).toBeCloseTo(32767 / 32768, 5);
    expect(y[1]).toBe(-1);
  });

  it('reads little-endian 16-bit', () => {
    expect(fromS16LE(Uint8Array.from([0x00, 0x40]))[0]).toBe(0.5);
  });

  it('ignores a trailing odd byte', () => {
    expect(fromS16LE(Uint8Array.from([0, 0, 7]))).toHaveLength(1);
  });

  it('writes a WAV that reads back with its rate and samples', () => {
    const x = Float32Array.from([0, 0.25, -0.25]);
    const wav = encodeWav(x, 24000);
    expect(wav).toHaveLength(44 + 6);
    const { samples, rate } = decodeWav(wav);
    expect(rate).toBe(24000);
    expect(Array.from(samples)).toEqual(Array.from(fromS16LE(toS16LE(x))));
  });

  it('refuses something that is not a WAV', () => {
    expect(() => decodeWav(new Uint8Array(44))).toThrow('not a wav');
  });
});
