import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFacilityStore } from '../core/store';
import { themed } from '../core/theme';
import { EMOTIONS } from '../vera/emotions';
import { T } from './strings';

// `4b` in `design/Theme Options.dc.html`, picked by `design/Vera Final.dc.html`:
// "Split track, ring thumb. An iris ring frames the half you are in, leaving
// both grounds unobstructed. The ring slides across."
//
// The halves are HARDCODED and must stay so. They are pictures of the two
// grounds rather than uses of either, so a switch whose dark half went pale in
// light mode would be drawing the same colour twice and saying nothing. These
// are the only literal hexes outside `theme.ts` that the theme adds, and they
// belong to the control rather than to either palette.
const GROUND_DARK = '#14130f';
const GROUND_LIGHT = '#eceef0';

// 2px inside a 30px track at each end, for a 10px thumb: 2 and 16.
const THUMB_LEFT: Record<'dark' | 'light', number> = { dark: 2, light: 16 };

// The design's own travel: "the marker actually travels when you tap, over
// 0.3s, while the screen crossfades underneath." The crossfade is not ours —
// it would mean rendering the whole tree twice — but the 300ms is, and a thumb
// that jumps reads as two controls rather than one moving.
const SLIDE_MS = 300;
const SLIDE_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);

const S = themed((p) =>
  StyleSheet.create({
    // 30×16, radius 9, in the tag pill's own border — it sits level with
    // DEFAULT on the other side of the header. `overflow:hidden` is what keeps
    // the two grounds inside the rounded track.
    track: {
      width: 30,
      height: 16,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: p.borderPill,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    half: { flex: 1 },
    // A ring, not a filled thumb, so neither ground is covered by the thing
    // pointing at it.
    thumb: {
      position: 'absolute',
      top: 2,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
    },
  }),
);

export function ThemeSlider() {
  const theme = useFacilityStore((s) => s.theme);
  const emotion = useFacilityStore((s) => s.emotion);
  const setTheme = useFacilityStore((s) => s.setTheme);
  const lang = useFacilityStore((s) => s.lang);

  const styles = S[theme];

  // Driven from the theme rather than from the press, so the thumb is in the
  // right place on a first render too — the control is remounted by every
  // screen that shows it, and a position animated from a press would start at
  // the wrong end each time.
  const left = useSharedValue(THUMB_LEFT[theme]);
  useEffect(() => {
    left.value = withTiming(THUMB_LEFT[theme], { duration: SLIDE_MS, easing: SLIDE_EASING });
  }, [left, theme]);
  const slide = useAnimatedStyle(() => ({ left: left.value }));

  return (
    <Pressable
      testID="theme-slider"
      accessibilityRole="switch"
      accessibilityState={{ checked: theme === 'light' }}
      accessibilityLabel={T[lang].theme}
      hitSlop={10}
      onPress={() => void setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={styles.track}
    >
      <View testID="theme-slider-dark" style={[styles.half, { backgroundColor: GROUND_DARK }]} />
      <View testID="theme-slider-light" style={[styles.half, { backgroundColor: GROUND_LIGHT }]} />
      {/* Her mood, not the theme's amber — `Vera Final`'s own change to the
          option it picked. The ring is the one thing in this cluster that
          would otherwise stop following her. */}
      <Animated.View
        testID="theme-slider-thumb"
        style={[styles.thumb, { borderColor: EMOTIONS[emotion].iris }, slide]}
      />
    </Pressable>
  );
}
