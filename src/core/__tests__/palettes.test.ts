import { DARK, LIGHT, PALETTES, emotionText, onLight, themed } from '../theme';
import { EMOTIONS } from '../../vera/emotions';

// Shape, not values: every key at every depth, with its type. This is the one
// test standing between a 76-key migration and a token that renders as
// `undefined` because it was added to one palette and forgotten in the other.
const shape = (v: unknown): unknown =>
  v !== null && typeof v === 'object'
    ? Object.fromEntries(
        Object.keys(v as object)
          .sort()
          .map((k) => [k, shape((v as Record<string, unknown>)[k])]),
      )
    : typeof v;

// WCAG relative luminance and contrast, so the light palette's type tokens can
// be held to a number rather than to an opinion.
const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};

describe('the two palettes', () => {
  it('gives every token in one a counterpart in the other', () => {
    expect(shape(LIGHT)).toEqual(shape(DARK));
  });

  it('is keyed by theme', () => {
    expect(PALETTES.dark).toBe(DARK);
    expect(PALETTES.light).toBe(LIGHT);
  });

  // Dark has one amber. The split is light's alone — `amberText` is the
  // darkened one, and on dark there is nothing to darken it against.
  it('splits amber only on the pale ground', () => {
    expect(DARK.amberText).toBe(DARK.amber);
    expect(LIGHT.amberText).not.toBe(LIGHT.amber);
  });

  // The launcher ground is a build-time asset in app.json and cannot know what
  // theme is stored, so the JS splash must not disagree with it.
  it('keeps the icon ground out of the theme', () => {
    expect(LIGHT.iconBg).toBe(DARK.iconBg);
  });

  // Benched since 2026-09-07 and unreachable. Twelve invented greens for a room
  // nobody can open would be worse than this line.
  it('leaves the benched room unthemed', () => {
    expect(LIGHT.organism).toEqual(DARK.organism);
  });
});

// This is what the derivation rule in the spec is FOR: `danger` carried over
// unchanged would sit at 2.87:1 on the pale ground and look fine in a diff.
describe('light type holds its ground', () => {
  const AA = 4.5;

  it.each([
    ['amberText', LIGHT.amberText, LIGHT.bg],
    ['danger', LIGHT.danger, LIGHT.bg],
    ['sealed', LIGHT.sealed, LIGHT.bg],
    ['text', LIGHT.text, LIGHT.bg],
    ['textDim', LIGHT.textDim, LIGHT.bg],
    ['mode.default.ink', LIGHT.mode.default.ink, LIGHT.panel],
    ['mode.supportive.ink', LIGHT.mode.supportive.ink, LIGHT.panel],
    ['advice.ink', LIGHT.advice.ink, LIGHT.advice.card],
    ['horror.ink', LIGHT.horror.ink, LIGHT.horror.card],
    ['notes.ink', LIGHT.notes.ink, LIGHT.notes.card],
  ])('%s clears AA', (_name, ink, ground) => {
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(AA);
  });

  it('does not carry the dark error red over', () => {
    expect(LIGHT.danger).not.toBe(DARK.danger);
    expect(contrast(DARK.danger, LIGHT.bg)).toBeLessThan(AA); // 2.87:1 — why
  });
});

describe('onLight', () => {
  // The design asks for `color-mix(in srgb, iris 52%, #000)`. 52% leaves
  // AMUSED at 3.82:1 on the strip it is drawn on — the one state the design's
  // own prose names as the case to check. 45% is the same decision with room.
  it('darkens every one of her states enough to read on the strip', () => {
    for (const { iris } of Object.values(EMOTIONS)) {
      expect(contrast(onLight(iris), LIGHT.panel)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mixes toward black, never away from it', () => {
    expect(lum(onLight('#ffd93d'))).toBeLessThan(lum('#ffd93d'));
  });

  it('returns a six-digit hex', () => {
    expect(onLight('#4fd08a')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('leaves her iris alone in the dark and mixes it in the light', () => {
    expect(emotionText('#ffd93d', 'dark')).toBe('#ffd93d');
    expect(emotionText('#ffd93d', 'light')).toBe(onLight('#ffd93d'));
  });
});

// The migration's own guard. A `palette` export would compile, would pass every
// other test in this repo, and would silently pin whatever imported it to one
// theme forever — which is exactly how it survived as a scaffold through six
// tasks of this change.
describe('no theme-blind palette', () => {
  it('offers none to import', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect('palette' in require('../theme')).toBe(false);
  });
});

describe('themed', () => {
  it('builds one sheet per theme, and builds each exactly once', () => {
    const make = jest.fn((p: typeof DARK) => ({ box: { backgroundColor: p.bg } }));
    const S = themed(make);
    expect(make).toHaveBeenCalledTimes(2);
    expect(S.dark.box.backgroundColor).toBe(DARK.bg);
    expect(S.light.box.backgroundColor).toBe(LIGHT.bg);
  });
});
