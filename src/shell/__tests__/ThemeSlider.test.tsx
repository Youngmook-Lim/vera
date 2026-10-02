import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { EMOTIONS } from '../../vera/emotions';
import { ThemeSlider } from '../ThemeSlider';

const flat = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[]);

beforeEach(() => {
  useFacilityStore.setState({ theme: 'dark', emotion: 'calm', lang: 'en' });
});

describe('ThemeSlider', () => {
  it('rests its ring on the dark half, and moves it to the light one', async () => {
    const dark = await render(<ThemeSlider />);
    expect(flat(dark.getByTestId('theme-slider-thumb').props.style).left).toBe(2);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<ThemeSlider />);
    expect(flat(light.getByTestId('theme-slider-thumb').props.style).left).toBe(16);
    await light.unmount();
  });

  it('switches the theme, both ways', async () => {
    const view = await render(<ThemeSlider />);
    await fireEvent.press(view.getByTestId('theme-slider'));
    expect(useFacilityStore.getState().theme).toBe('light');
    await fireEvent.press(view.getByTestId('theme-slider'));
    expect(useFacilityStore.getState().theme).toBe('dark');
    await view.unmount();
  });

  // `Vera Final`'s change to `Theme Options`, which ringed it in the theme's
  // own amber. The control sits beside her pulse dot and her wordmark; a fixed
  // amber there would be the one thing in that cluster not following her.
  it('rings the thumb in her current mood, not in the theme', async () => {
    useFacilityStore.setState({ emotion: 'alarmed' });
    const view = await render(<ThemeSlider />);
    expect(flat(view.getByTestId('theme-slider-thumb').props.style).borderColor)
      .toBe(EMOTIONS.alarmed.iris);
    await view.unmount();

    useFacilityStore.setState({ emotion: 'pleased' });
    const pleased = await render(<ThemeSlider />);
    expect(flat(pleased.getByTestId('theme-slider-thumb').props.style).borderColor)
      .toBe(EMOTIONS.pleased.iris);
    await pleased.unmount();
  });

  // The two halves are PICTURES of the two grounds, so they must not follow the
  // theme — a switch whose dark half went pale in light mode would be showing
  // the same colour twice and saying nothing.
  it('shows both grounds whichever one it is standing on', async () => {
    const halves = (v: Awaited<ReturnType<typeof render>>) => [
      flat(v.getByTestId('theme-slider-dark').props.style).backgroundColor,
      flat(v.getByTestId('theme-slider-light').props.style).backgroundColor,
    ];

    const dark = await render(<ThemeSlider />);
    expect(halves(dark)).toEqual(['#14130f', '#eceef0']);
    // And the track clips them, or two square halves poke out of a radius-9
    // pill at all four corners.
    expect(flat(dark.getByTestId('theme-slider').props.style).overflow).toBe('hidden');
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<ThemeSlider />);
    expect(halves(light)).toEqual(['#14130f', '#eceef0']);
    await light.unmount();
  });

  // It is a switch, and what it is set to is state rather than a picture — the
  // idiom the advice room's star already follows.
  it('reports which way it is set', async () => {
    const dark = await render(<ThemeSlider />);
    expect(dark.getByTestId('theme-slider').props.accessibilityState.checked).toBe(false);
    await dark.unmount();

    useFacilityStore.setState({ theme: 'light' });
    const light = await render(<ThemeSlider />);
    expect(light.getByTestId('theme-slider').props.accessibilityState.checked).toBe(true);
    await light.unmount();
  });
});
