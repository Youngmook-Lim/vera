import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { faceFor } from '../core/appIcon';
import { font, ms, palette } from '../core/theme';
import { EMOTIONS, isEmotionKey, type EmotionKey } from '../vera/emotions';
import { Optic } from './Optic';

// The first frame of the app, and it is the launcher icon enlarged — same
// ground, same eye, same face (design 2a, and turn 4's nine).
//
// **The native splash carries no image (2026-09-10), and this is why.** It used
// to ship `icon-fg-dormant.png`, so the launch showed a grey eye and then
// flipped to the day's colour when this screen took over. Pointing it at
// `icon-fg-calm.png` fixed the colour and exposed the real problem: those
// assets are 432² launcher-icon foregrounds, drawn to be masked into an
// adaptive-icon squircle at about 48dp. At the splash's 390dp — 1024px on a
// 420dpi screen — one upscales 2.4× and looks it, the sclera runs to the frame
// edge and reads as cropped on four sides, and there is no lid, because the
// art is a flat render and the lid belongs to the optic's geometry.
//
// So the native splash is now the bare `#131011` ground and nothing else. It
// gets there by way of `assets/splash-blank.png`, a 108² fully transparent PNG,
// rather than by omitting the image — **omitting it does not build.**
// `withAndroidSplashStyles` writes `windowSplashScreenAnimatedIcon` →
// `@drawable/splashscreen_logo` into the theme unconditionally, while
// `withAndroidSplashImages` only creates that drawable `if (image)`, so a
// config with no image links against a resource that was never generated:
// `error: resource drawable/splashscreen_logo not found`. The image is also
// what stops Android falling back to its own default, which is the launcher
// icon. A transparent one satisfies both and draws nothing.
//
// And
// the eye you see is always this one: Skia, vector, sharp at any density, with
// the lid and the drift and the blink. Nothing underneath means nothing to
// disagree with, which is what lets the daily rotation stay.
//
// Nothing here decides anything about the rotation. `faceFor` is the launcher's
// own decision function, called with the same two inputs the alias swap uses,
// so the splash and the icon cannot disagree about which day it is or whether
// she is awake. Two consequences the design names and we accept: a launcher
// that has cached yesterday's icon will disagree for one launch, and with no
// key she is dormant regardless of the day — which is why `hasKey` is the first
// gate, not the second.
//
// The nine faces are not drawn here either. Every value turn 4 lists — iris,
// glow, aperture, pupil, lid, blink — is already in `emotions.ts`, and the
// optic already reads it. A face is a key, and this file hands it over.

const OPTIC_PX = 234; // 60% of the 388 frame, the icon's own proportion

// 2a put the wordmark at bottom:54 and at ms(10). This is the title card and
// the only screen her name gets to be the subject of, so it is bigger, higher,
// and carries the acronym's expansion underneath (2026-09-16). A deliberate
// departure from the design, which is otherwise the authority on every pixel.
// How long the day's face stays up once there is nothing left to wait for. The
// eye is the whole point of the screen, and on a warm start fonts and hydration
// together can finish inside 200ms — long enough to hide the wait, far too
// short to read a face by.
//
// Lives here rather than in App.tsx because the bar below has to fill over
// exactly this long: two copies of the number would drift and the bar would
// finish early or get cut off mid-travel.
export const SPLASH_HOLD_MS = 2000;

const TITLE_BOTTOM = 96;
const WORDMARK_PX = ms(15);
const EXPANSION_PX = ms(7);
const BAR_W = 132;
const BAR_H = 2;

// `faceFor` answers in the launcher's vocabulary ('Calm'), the optic reads
// emotions.ts's ('calm'). The guard is not ceremony: faces.json is edited by
// hand and shared with the config plugin, and a name added there with no
// emotion behind it must show a dead eye, not crash the first frame.
export const faceEmotion = (face: string): EmotionKey => {
  const key = face.toLowerCase();
  return isEmotionKey(key) ? key : 'dormant';
};

// The wait, drawn. The hold is a KNOWN length, so this fills in step with it
// rather than looping the way the thinking dots do — those say "still going",
// which is all they can say, and this can say how much longer. Linear easing
// for the same reason: a bar that decelerates is describing something other
// than the wait it is timing.
//
// It wears the day's iris, so the line under her name is the colour of the face
// above it, and goes dead grey along with the eye when there is no key.
function WakingBar({ colour }: { colour: string }) {
  const grown = useSharedValue(0);
  useEffect(() => {
    grown.value = withTiming(1, { duration: SPLASH_HOLD_MS, easing: Easing.linear });
    return () => cancelAnimation(grown);
  }, [grown]);
  const fill = useAnimatedStyle(() => ({ width: grown.value * BAR_W }));

  return (
    <View testID="splash-bar" style={styles.track}>
      <Animated.View testID="splash-bar-fill" style={[styles.fill, { backgroundColor: colour }, fill]} />
    </View>
  );
}

export function Splash({ hasKey, now = Date.now() }: { hasKey: boolean; now?: number }) {
  const emotion = faceEmotion(faceFor(now, hasKey));

  return (
    <View testID="splash" style={styles.splash}>
      <Optic emotion={emotion} size={OPTIC_PX} />
      <View style={styles.title}>
        <Text style={[styles.wordmark, { fontFamily: font('mono', 700) }]}>V.E.R.A.</Text>
        {/* Hardcoded beside the wordmark rather than taken from T, for the same
            reason the wordmark is: the acronym is English, so its expansion is
            English, and a translation pair holding one identical string twice
            would be a lie about there being two. */}
        <Text style={[styles.expansion, { fontFamily: font('mono', 500) }]}>
          Very Emotional Robot Assistant
        </Text>
        <WakingBar colour={EMOTIONS[emotion].iris} />
      </View>
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
  // Hangs off the bottom rather than riding under the eye, so the eye keeps the
  // centre of the screen — 2a's arrangement, at 2a's proportions, just higher.
  title: {
    position: 'absolute',
    bottom: TITLE_BOTTOM,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // **The full width and textAlign, not a self-sized box.** letterSpacing in
  // React Native adds its space after EVERY character including the last, and
  // Android's measurement does not always account for the trailing one — so an
  // absolutely positioned Text sized to its own content clipped the final
  // period off `V.E.R.A.`. A box that spans the screen cannot clip, and
  // textAlign does the centring the box used to do.
  wordmark: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: WORDMARK_PX,
    letterSpacing: WORDMARK_PX * 0.38,
    color: palette.textSoft,
  },
  // A hairline, because that is what this app draws when it wants a line: the
  // conversation pill is made of them and the status strip is closed by one.
  track: {
    marginTop: 20,
    width: BAR_W,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
  },
  // Dim against the wordmark on purpose: two lines at one weight would read as
  // a sentence rather than a name and a gloss on it.
  expansion: {
    alignSelf: 'stretch',
    textAlign: 'center',
    marginTop: 9,
    fontSize: EXPANSION_PX,
    letterSpacing: EXPANSION_PX * 0.2,
    color: palette.textGhost,
  },
});
