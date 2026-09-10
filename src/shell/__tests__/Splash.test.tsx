// src/shell/__tests__/Splash.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { DORMANT, FACES, faceFor } from '../../core/appIcon';
import * as OpticModule from '../Optic';
import { Splash, faceEmotion } from '../Splash';

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
