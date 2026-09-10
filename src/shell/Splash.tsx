import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, ms, palette } from '../core/theme';
import { Optic } from './Optic';

// The wordmark's screen, and only the wordmark's. Android's native splash
// draws the eye and the ground; it has no way to draw text under them —
// `windowSplashScreenBrandingImage` is the slot for that, it wants a PNG we
// have no way to generate here, and it is API 31+ with OEM support nobody has
// verified on this phone. So the eye is handed over from the native splash to
// this one unchanged, and the only thing that appears is the name.
//
// **This deliberately does NOT follow the daily rotation** (2026-09-10). It
// used to: `faceFor(Date.now(), hasKey)`, the same decision the launcher icon
// makes. That is exactly what put a grey dormant eye on screen and then flipped
// it to a colour, because the native PNG underneath is baked at build time and
// cannot know the day. The face here is fixed at `calm` for one reason — it is
// what `app.json` ships as the splash image — and the two must be changed
// together or the flip comes back.
const FACE = 'calm' as const;

const OPTIC_PX = 234; // 60% of the 388 frame, the icon's own proportion
const WORDMARK_BOTTOM = 54;

export function Splash() {
  return (
    <View testID="splash" style={styles.splash}>
      <Optic emotion={FACE} size={OPTIC_PX} />
      <Text style={[styles.wordmark, { fontFamily: font('mono', 600) }]}>V.E.R.A.</Text>
    </View>
  );
}

// Every number read off 2a. The ground is the icon's #131011, not the stage's
// #14130f, so the native splash underneath and this one are the same colour and
// the handover has no seam in it.
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.iconBg,
  },
  // `position:absolute;bottom:54px` — it hangs off the bottom rather than
  // riding under the eye, so the eye stays centred on the screen and lands
  // exactly where the native splash had already drawn it.
  wordmark: {
    position: 'absolute',
    bottom: WORDMARK_BOTTOM,
    fontSize: ms(10),
    letterSpacing: ms(10) * 0.38,
    color: palette.textDim,
  },
});
