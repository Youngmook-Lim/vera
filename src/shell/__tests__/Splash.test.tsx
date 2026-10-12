// src/shell/__tests__/Splash.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { DORMANT, FACES, faceFor } from '../../core/appIcon';
import { EMOTIONS } from '../../vera/emotions';
import { DARK, LIGHT } from '../../core/theme';
import * as OpticModule from '../Optic';
import { SPLASH_HOLD_MS, Splash, faceEmotion } from '../Splash';

// The bar renders nothing under jest and its exports cannot be spied on, so it
// is stood in for by text carrying the one prop worth checking.
jest.mock('expo-status-bar', () => {
  const { createElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    StatusBar: ({ style }: { style: string }) => createElement(Text, { testID: 'status-bar' }, style),
  };
});

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

type Rendered = Awaited<ReturnType<typeof render>>;

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 7, 31);

// The eye itself is Skia, a no-op under jest, so nothing about how the splash
// LOOKS can be caught here. What can be — and what the whole screen exists for
// — is that the face it hands the optic is the one the launcher is wearing.
describe('Splash', () => {
  // Unmounted before the next render: RTL v14 keeps the previous tree mounted
  // until its own cleanup runs, and a second render over it overlaps act().
  const faceShown = async (hasKey: boolean, now: number): Promise<string> => {
    const spy = jest.spyOn(OpticModule, 'Optic');
    try {
      const view = await render(<Splash hasKey={hasKey} now={now} />);
      const face = spy.mock.calls.at(-1)?.[0].emotion as string;
      await view.unmount();
      return face;
    } finally {
      spy.mockRestore();
    }
  };

  it('wears the same face the launcher does, every day of the cycle', async () => {
    for (let i = 0; i < FACES.length; i += 1) {
      const now = NOW + i * DAY;
      expect(await faceShown(true, now)).toBe(faceFor(now, true).toLowerCase());
    }
  });

  // hasKey is the FIRST gate, not the second: with no credential she is dormant
  // whatever the day is, which is what the launcher does too — otherwise a
  // fresh install would show a face on the splash and a dead eye on the icon.
  it('is dormant with no key, whatever day it is', async () => {
    for (let i = 0; i < FACES.length; i += 1) {
      expect(await faceShown(false, NOW + i * DAY)).toBe(DORMANT.toLowerCase());
    }
  });

  it('draws the eye at the icon-sized 234px, and the wordmark', async () => {
    const spy = jest.spyOn(OpticModule, 'Optic');
    try {
      const view = await render(<Splash hasKey now={NOW} />);
      expect(spy.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ size: 234 }));
      expect(view.getByText('V.E.R.A.')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  // The splash follows the theme now (2026-10-08) — the native frame under it
  // does too, through per-app night mode — so the ground, the type and the
  // eye's finish all change together, and nothing about the composition does.
  it.each(['dark', 'light'] as const)('draws the %s splash whole', async (theme) => {
    const spy = jest.spyOn(OpticModule, 'Optic');
    try {
      const view = await render(<Splash hasKey now={NOW} theme={theme} />);
      const palette = theme === 'dark' ? DARK : LIGHT;
      expect(flat(view.getByTestId('splash').props.style).backgroundColor).toBe(palette.iconBg);
      expect(flat(view.getByText('V.E.R.A.').props.style).color).toBe(palette.textSoft);
      expect(spy.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({ theme, size: 234, emotion: faceFor(NOW, true).toLowerCase() }),
      );
      await view.unmount();
    } finally {
      spy.mockRestore();
    }
  });

  // It still rotates on the pale ground: the day decides the face, the theme
  // decides only how it is drawn.
  it('wears the launcher\'s face on the light ground too, every day of the cycle', async () => {
    const spy = jest.spyOn(OpticModule, 'Optic');
    try {
      for (let i = 0; i < FACES.length; i += 1) {
        const now = NOW + i * DAY;
        const view = await render(<Splash hasKey now={now} theme="light" />);
        expect(spy.mock.calls.at(-1)?.[0].emotion).toBe(faceFor(now, true).toLowerCase());
        await view.unmount();
      }
    } finally {
      spy.mockRestore();
    }
  });

  // Anything that renders it without saying gets the splash every build before
  // this one showed, and the dark eye with it.
  it('defaults to the dark splash', async () => {
    const spy = jest.spyOn(OpticModule, 'Optic');
    try {
      const view = await render(<Splash hasKey now={NOW} />);
      expect(flat(view.getByTestId('splash').props.style).backgroundColor).toBe(DARK.iconBg);
      expect(spy.mock.calls.at(-1)?.[0].theme).toBe('dark');
      await view.unmount();
    } finally {
      spy.mockRestore();
    }
  });

  // The title card is the one screen her name is the subject of, so it carries
  // the acronym's expansion. The stage's logo deliberately does not.
  it('spells the acronym out underneath it', async () => {
    const view = await render(<Splash hasKey now={NOW} />);

    expect(view.getByText('Very Emotional Robot Assistant')).toBeTruthy();

    await view.unmount();
  });

  // letterSpacing in React Native adds its space after EVERY character
  // including the last, and Android's measurement does not always allow for
  // the trailing one — so a self-sized absolute Text clipped the final period
  // off `V.E.R.A.`. A full-width box cannot clip, and textAlign does the
  // centring. Invisible to jsdom, so the assertion is on the mechanism.
  it('gives the wordmark a box too wide to clip', async () => {
    const view = await render(<Splash hasKey now={NOW} />);

    const style = flat(view.getByText('V.E.R.A.').props.style);
    expect(style.alignSelf).toBe('stretch');
    expect(style.textAlign).toBe('center');
    expect(style.letterSpacing).toBeGreaterThan(0);

    await view.unmount();
  });

  // The wait, drawn: a ring of the app's own hairline with one arc of it lit in
  // the day's colour.
  describe('the waking spinner', () => {
    const spinner = (view: Rendered) => flat(view.getByTestId('splash-spinner').props.style);

    it('is under her name, wearing the day’s own colour', async () => {
      const view = await render(<Splash hasKey now={NOW} />);

      expect(spinner(view).borderTopColor).toBe(EMOTIONS[faceEmotion(faceFor(NOW, true))].iris);

      await view.unmount();
    });

    // Dead eye, dead ring. Nothing on this screen is lit before there is a key.
    it('goes dead grey with no key', async () => {
      const view = await render(<Splash hasKey={false} now={NOW} />);

      expect(spinner(view).borderTopColor).toBe(EMOTIONS.dormant.iris);

      await view.unmount();
    });

    // Three quarters of the ring stays the app's own line; only the leading arc
    // is lit, which is what makes the rotation readable at all.
    it('lights one arc and leaves the rest a hairline', async () => {
      const view = await render(<Splash hasKey now={NOW} />);

      const style = spinner(view);
      expect(style.borderColor).toBe(DARK.hairline);
      expect(style.borderTopColor).not.toBe(DARK.hairline);
      expect(style.borderRadius).toBe(Number(style.width) / 2);

      await view.unmount();
    });

    it('holds the day’s face long enough to be read', () => {
      expect(SPLASH_HOLD_MS).toBe(2000);
    });
  });

  // The eye and the title take their natural heights and the leftover is pooled
  // above the eye, between them, and below the title. Proportions rather than an
  // absolute offset from the bottom edge, so the composition reads the same on a
  // short screen and a tall one.
  //
  // Layout is invisible to jsdom, so this asserts the mechanism: three Views
  // that look empty and are exactly what a tidy-up deletes.
  describe('the composition', () => {
    const pools = (view: Rendered) => ({
      above: flat(view.getByTestId('splash-above-eye').props.style),
      between: flat(view.getByTestId('splash-between').props.style),
      below: flat(view.getByTestId('splash-below-title').props.style),
    });

    // The eye sits above the half-line, because the mass of a face reads above
    // its middle and an eye on the exact centre looks low.
    it('leaves more room above the eye than below the title', async () => {
      const view = await render(<Splash hasKey now={NOW} />);

      const { above, between, below } = pools(view);
      expect(Number(above.flex)).toBeGreaterThan(Number(below.flex));
      expect(Number(between.flex)).toBeGreaterThan(0);

      await view.unmount();
    });

    // The title is its own block and is stretched to the screen, which is what
    // gives the wordmark inside it a box too wide to clip.
    it('keeps the name and its expansion together, under the eye', async () => {
      const view = await render(<Splash hasKey now={NOW} />);

      expect(view.getByText('V.E.R.A.')).toBeTruthy();
      expect(view.getByText('Very Emotional Robot Assistant')).toBeTruthy();

      await view.unmount();
    });

    // Bigger than it was at ms(7), and still clearly under the wordmark rather
    // than beside it in weight.
    it('sets the expansion smaller than the name but not tiny', async () => {
      const view = await render(<Splash hasKey now={NOW} />);

      const name = Number(flat(view.getByText('V.E.R.A.').props.style).fontSize);
      const full = Number(flat(view.getByText('Very Emotional Robot Assistant').props.style).fontSize);

      expect(full).toBeLessThan(name);
      expect(full / name).toBeGreaterThan(0.5);

      await view.unmount();
    });
  });

  // faces.json is hand-edited and shared with the config plugin. A name added
  // there with no emotion behind it must cost a dead eye on the first frame,
  // never a crash before anything has rendered.
  describe('faceEmotion', () => {
    it('reads every launcher face as its emotion', () => {
      for (const face of [...FACES, DORMANT]) {
        expect(faceEmotion(face)).toBe(face.toLowerCase());
      }
    });

    it('falls back to dormant for a face with no emotion behind it', () => {
      expect(faceEmotion('Smug')).toBe('dormant');
    });
  });
});

// Before 2026-10-12 the splash drew no bar at all, so the light splash wore the
// system default over it — white icons on a pale ground.
describe('the splash status bar', () => {
  it.each(['dark', 'light'] as const)('matches the %s ground', async (theme) => {
    const view = await render(<Splash hasKey now={NOW} theme={theme} />);
    expect(view.getByTestId('status-bar').props.children).toBe(theme === 'dark' ? 'light' : 'dark');
    await view.unmount();
  });
});

