import React from 'react';
import { render } from '@testing-library/react-native';
import { EMOTIONS, type EmotionKey } from '../../vera/emotions';
import { Optic } from '../Optic';

// Skia renders to no-ops under jsdom, so this proves mounting only — the
// numbers behind the eye are covered in opticGeometry.test.ts.
describe('Optic', () => {
  it('mounts in every emotional state', async () => {
    for (const emotion of Object.keys(EMOTIONS) as EmotionKey[]) {
      const view = await render(<Optic emotion={emotion} size={158} />);
      expect(view.toJSON()).toBeTruthy();
      await view.unmount();
    }
  });

  it('mounts mid-wake without throwing', async () => {
    const view = await render(<Optic emotion="calm" size={158} waking />);
    expect(view.toJSON()).toBeTruthy();
  });
});
