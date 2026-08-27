import { DORMANT, FACES, faceFor } from '../appIcon';
import faces from '../faces.json';

const DAY = 86_400_000;
// A Thursday, and epoch day 20688 — 20688 % 8 === 0, so this lands on Calm.
const NOW = 20_688 * DAY;

describe('faceFor', () => {
  it('is dormant without a credential, whatever the day', () => {
    for (let i = 0; i < FACES.length + 2; i += 1) {
      expect(faceFor(NOW + i * DAY, false)).toBe(DORMANT);
    }
  });

  it('never shows dormant in the cycle — it is the override, not a face', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 64; i += 1) seen.add(faceFor(NOW + i * DAY, true));
    expect(seen.has(DORMANT)).toBe(false);
    expect(seen.size).toBe(FACES.length);
  });

  it('holds one face for a whole day, and turns over at the boundary', () => {
    const start = faceFor(NOW, true);
    expect(faceFor(NOW + DAY - 1, true)).toBe(start);
    expect(faceFor(NOW + DAY, true)).not.toBe(start);
  });

  it('walks the authored order, so no two dim faces fall together', () => {
    const week = Array.from({ length: FACES.length }, (_, i) => faceFor(NOW + i * DAY, true));
    expect(week).toEqual([...FACES]);
  });

  it('wraps after eight days rather than running out', () => {
    expect(faceFor(NOW + FACES.length * DAY, true)).toBe(faceFor(NOW, true));
  });

  // Day-of-year would: 365 % 8 is 5, so three faces would be skipped every
  // New Year. Epoch days cross it without noticing.
  it('crosses a year boundary without skipping faces', () => {
    const newYear = Date.parse('2027-01-01T12:00:00Z');
    const before = faceFor(newYear - DAY, true);
    const after = faceFor(newYear, true);
    const step = (FACES.indexOf(after as never) - FACES.indexOf(before as never) + 8) % 8;
    expect(step).toBe(1);
  });

  it('does not throw on a clock before the epoch', () => {
    expect(FACES).toContain(faceFor(-5 * DAY, true));
    expect(FACES).toContain(faceFor(-1, true));
  });
});

// The rotation and the launcher aliases both read faces.json, so they cannot
// name different faces. What that shared file cannot enforce is its own shape,
// and the plugin turns each name into a resource id and an asset path.
describe('faces.json', () => {
  it('keeps dormant out of the rotation — it is the override, not a face', () => {
    expect(faces.order).not.toContain(faces.dormant);
  });

  it('names each face once, or a day would be skipped and another doubled', () => {
    expect(new Set(faces.order).size).toBe(faces.order.length);
  });

  // Each becomes `ic_launcher_<lowercase>` in the manifest and
  // `icon-fg-<lowercase>.png` on disk. Android resource ids are lowercase
  // alphanumerics and underscores; anything else fails at aapt, deep inside a
  // build, having already cost the round trip.
  it('names faces that are legal android resource ids', () => {
    for (const face of [faces.dormant, ...faces.order]) {
      expect(face.toLowerCase()).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('is what the rotation actually uses', () => {
    expect(FACES).toEqual(faces.order);
    expect(DORMANT).toBe(faces.dormant);
  });
});
