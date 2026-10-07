import React from 'react';
import { render } from '@testing-library/react-native';
import { PALETTES } from '../../core/theme';
import type { Theme } from '../../core/theme';
import { EMOTIONS, type EmotionKey } from '../../vera/emotions';
import { Optic } from '../Optic';

// Skia renders to no-ops under jsdom, so this proves mounting only — the
// numbers behind the eye are covered in opticGeometry.test.ts.
describe('Optic', () => {
  // Both grounds, every state: 1f adds four layers the dark eye does not draw
  // (a sweep on the bezel, the knurl, the socket's edge, the ring inside the
  // iris) and drops one it does (the pupil's outer glow). Nothing here can see
  // a COLOUR, so what it holds is that neither branch throws on mount in any
  // state — which is the whole of what the eye's blind spot leaves testable.
  it.each(Object.keys(PALETTES) as Theme[])('mounts in every emotional state on %s', async (theme) => {
    for (const emotion of Object.keys(EMOTIONS) as EmotionKey[]) {
      const view = await render(<Optic emotion={emotion} size={158} theme={theme} />);
      expect(view.toJSON()).toBeTruthy();
      await view.unmount();
    }
  });

  // The ground she is on is the caller's to state. Splash.tsx is
  // theme-invariant and passes nothing, so the default has to be the dark eye
  // or its pale housing would land on the near-black icon ground.
  it('draws the dark eye when nobody says which ground', async () => {
    const view = await render(<Optic emotion="calm" size={158} />);
    expect(view.toJSON()).toBeTruthy();
    await view.unmount();
  });

  it('mounts mid-wake without throwing', async () => {
    const view = await render(<Optic emotion="calm" size={158} waking />);
    expect(view.toJSON()).toBeTruthy();
  });
});
