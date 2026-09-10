import React from 'react';
import { render } from '@testing-library/react-native';
import { palette } from '../../core/theme';
import { Splash } from '../Splash';

// What this screen is for now is the wordmark: the native splash draws the eye
// and the ground and has no way to put text under them. The eye is here only
// so the handover from the native splash changes nothing that was already
// showing.
describe('the splash', () => {
  it('carries the wordmark the native splash cannot draw', async () => {
    const view = await render(<Splash />);
    expect(view.getByText('V.E.R.A.')).toBeTruthy();
    await view.unmount();
  });

  // The ground has to be the ICON's #131011, not the stage's #14130f, or the
  // handover from the native splash shows a seam.
  it('stands on the same ground as the native splash', async () => {
    const view = await render(<Splash />);
    expect(view.getByTestId('splash').props.style).toEqual(
      expect.objectContaining({ backgroundColor: palette.iconBg }),
    );
    await view.unmount();
  });

  // The face is fixed, and fixed to the one app.json ships as the splash
  // image. It used to follow the daily rotation, which is precisely what made
  // the launch show a grey dormant eye and then flip it to a colour — the
  // native PNG is baked at build time and cannot know the day. Nothing here
  // may reintroduce a dependency on the date or on whether she has a key.
  it('takes no arguments, so nothing can make it disagree with the native PNG', () => {
    expect(Splash.length).toBe(0);
  });
});
