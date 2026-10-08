import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { faceFor } from '../core/appIcon';
import { font, ms, themed, type Theme } from '../core/theme';
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
// So the native splash is now a bare ground and nothing else — `#131011`, or
// `#eceef0` when the subject has chosen light (2026-10-08; see the styles). It
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

// How long the day's face stays up once there is nothing left to wait for. The
// eye is the whole point of the screen, and on a warm start fonts and hydration
// together can finish inside 200ms — long enough to hide the wait, far too
// short to read a face by.
//
// Exported because App.tsx waits it out and this is the screen it is waiting
// on; the number belongs with the thing it holds up.
export const SPLASH_HOLD_MS = 2000;

// 2a put the wordmark at bottom:54 and at ms(10). This is the title card and
// the only screen her name gets to be the subject of, so it is bigger and
// carries the acronym's expansion underneath (2026-09-16). A deliberate
// departure from the design, which is otherwise the authority on every pixel.
const WORDMARK_PX = ms(15);
const EXPANSION_PX = ms(9);

// The composition, as three pools of the leftover height rather than an eye
// pinned to the middle and a title pinned to the bottom. Proportions travel —
// the same reading on a short screen and a tall one, which an absolute offset
// from the bottom edge does not give.
//
// 3 : 2 : 2 puts the eye's centre near 41% of the screen and the title block
// near 77%, both above where dead centre and a bottom offset had them. An eye
// on the exact half-line reads as low, because the mass of a face is read above
// its middle.
const ABOVE_EYE = 3;
const BETWEEN = 2;
const BELOW_TITLE = 2;
const SPIN_PX = 20;
const SPIN_MS = 900;

// `faceFor` answers in the launcher's vocabulary ('Calm'), the optic reads
// emotions.ts's ('calm'). The guard is not ceremony: faces.json is edited by
// hand and shared with the config plugin, and a name added there with no
// emotion behind it must show a dead eye, not crash the first frame.
export const faceEmotion = (face: string): EmotionKey => {
  const key = face.toLowerCase();
  return isEmotionKey(key) ? key : 'dormant';
};

// The wait, drawn. A ring of the app's own hairline with one arc of it lit,
// turning at a constant rate — linear, because a spinner that eases is
// pretending to know something about the wait, and this one does not.
//
// The lit arc wears the day's iris, so the ring under her name is the colour of
// the face above it, and it goes dead grey along with the eye when there is no
// key. Drawn with a border rather than as an arc: four border colours on a
// circle give three quarters of hairline and one quarter lit, with no path and
// nothing for Skia to do.
// The lit arc is her raw iris on both grounds: it is an object beside her eye,
// like the slider's ring, not type.
function WakingSpinner({ colour, theme }: { colour: string; theme: Theme }) {
  const styles = S[theme];
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(
      withTiming(360, { duration: SPIN_MS, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(turn);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  return (
    <Animated.View
      testID="splash-spinner"
      style={[styles.spinner, { borderTopColor: colour }, spin]}
    />
  );
}

// `theme` is a prop and not a store read for the reason the optic's is: this
// screen is drawn before the store has hydrated, sitting unseen behind the
// native splash, and only becomes visible once it has — so App.tsx hands over
// the settled theme, and anything that renders this without one gets the dark
// splash every build before 2026-10-08 showed.
export function Splash({
  hasKey,
  now = Date.now(),
  theme = 'dark',
}: {
  hasKey: boolean;
  now?: number;
  theme?: Theme;
}) {
  const emotion = faceEmotion(faceFor(now, hasKey));
  const styles = S[theme];

  return (
    <View testID="splash" style={styles.splash}>
      <View testID="splash-above-eye" style={styles.aboveEye} />

      <Optic emotion={emotion} size={OPTIC_PX} theme={theme} />

      <View testID="splash-between" style={styles.between} />

      <View style={styles.title}>
        <Text style={[styles.wordmark, { fontFamily: font('mono', 700) }]}>V.E.R.A.</Text>
        {/* Hardcoded beside the wordmark rather than taken from T, for the same
            reason the wordmark is: the acronym is English, so its expansion is
            English, and a translation pair holding one identical string twice
            would be a lie about there being two. */}
        <Text style={[styles.expansion, { fontFamily: font('mono', 500) }]}>
          Very Emotional Robot Assistant
        </Text>
        <WakingSpinner colour={EMOTIONS[emotion].iris} theme={theme} />
      </View>

      <View testID="splash-below-title" style={styles.belowTitle} />
    </View>
  );
}

// Every number read off 2a. The ground is the icon's, not the stage's, so the
// native splash underneath and this one are the same colour and the handover
// has no seam in it.
//
// **It follows the theme now (2026-10-08), and that used to be impossible.**
// This screen sits on the native splash, whose colour is fixed at build time —
// so until then it was DARK in both themes, and a light-theme launch went dark
// splash → pale app. What closed it is not anything here: `syncLaunchTheme`
// tells Android this app's own night mode, Android persists it, and app.json
// gives the day half of the native splash the light ground. So the native
// frame, this screen, the light launcher icon and the light stage are one
// ground. Composition, sizes and timings are identical in both — only the
// palette and the optic's finish change.
const S = themed((p) => StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: p.iconBg,
  },
  aboveEye: {
    flex: ABOVE_EYE,
  },
  between: {
    flex: BETWEEN,
  },
  belowTitle: {
    flex: BELOW_TITLE,
  },
  // Stretched to the screen rather than sized to its contents, so the wordmark
  // inside it has a full-width box to sit in — see the note on `wordmark`.
  title: {
    alignSelf: 'stretch',
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
    color: p.textSoft,
  },
  // Hairline for three quarters of the ring, the day's colour for the fourth.
  // borderTopColor is overridden at render; the rest stays the app's own line.
  spinner: {
    marginTop: 22,
    width: SPIN_PX,
    height: SPIN_PX,
    borderRadius: SPIN_PX / 2,
    borderWidth: 2,
    borderColor: p.hairline,
  },
  // Dim against the wordmark on purpose: two lines at one weight would read as
  // a sentence rather than a name and a gloss on it.
  expansion: {
    alignSelf: 'stretch',
    textAlign: 'center',
    marginTop: 9,
    fontSize: EXPANSION_PX,
    letterSpacing: EXPANSION_PX * 0.2,
    color: p.textGhost,
  },
}));
