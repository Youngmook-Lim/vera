import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { faceFor } from '../core/appIcon';
import { font, ms, palette } from '../core/theme';
import { isEmotionKey, type EmotionKey } from '../vera/emotions';
import { Optic } from './Optic';

// The first frame of the app, and it is the launcher icon enlarged — same
// ground, same eye, same face (design 2a, and turn 4's nine).
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
const WORDMARK_BOTTOM = 54;

// `faceFor` answers in the launcher's vocabulary ('Calm'), the optic reads
// emotions.ts's ('calm'). The guard is not ceremony: faces.json is edited by
// hand and shared with the config plugin, and a name added there with no
// emotion behind it must show a dead eye, not crash the first frame.
export const faceEmotion = (face: string): EmotionKey => {
  const key = face.toLowerCase();
  return isEmotionKey(key) ? key : 'dormant';
};

export function Splash({ hasKey, now = Date.now() }: { hasKey: boolean; now?: number }) {
  const emotion = faceEmotion(faceFor(now, hasKey));

  return (
    <View testID="splash" style={styles.splash}>
      <Optic emotion={emotion} size={OPTIC_PX} />
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
  // riding under the eye, so the eye stays centred on the screen.
  wordmark: {
    position: 'absolute',
    bottom: WORDMARK_BOTTOM,
    fontSize: ms(10),
    letterSpacing: ms(10) * 0.38,
    color: palette.textDim,
  },
});
