import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { themed } from '../core/theme';
import { EMOTIONS } from '../vera/emotions';
import { providerFor } from '../vera/providers';
import { voiceSupported } from '../vera/voice/tts';
import { T } from './strings';

// Three bars, drawn — no icon library, no raster. Dim when she is silent; in
// her own iris when she speaks, an object beside her pulse dot like the
// theme slider's ring. Pressing it while she talks cuts her off at once
// (setVoice stops the player); the text finishes drawing.
const BARS = [5, 10, 7] as const;

export function VoiceToggle() {
  const theme = useFacilityStore((s) => s.theme);
  const styles = S[theme];
  const voice = useFacilityStore((s) => s.voice);
  const setVoice = useFacilityStore((s) => s.setVoice);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const emotion = useFacilityStore((s) => s.emotion);
  const lang = useFacilityStore((s) => s.lang);

  if (!voiceSupported(providerFor(apiKey)?.label)) return null;
  const lit = voice ? { backgroundColor: EMOTIONS[emotion].iris } : null;

  return (
    <Pressable
      testID="voice-toggle"
      accessibilityRole="switch"
      accessibilityLabel={T[lang].voice}
      accessibilityState={{ checked: voice }}
      hitSlop={8}
      onPress={() => void setVoice(!voice)}
      style={styles.box}
    >
      {BARS.map((height, i) => (
        <View key={i} style={[styles.bar, { height }, lit]} />
      ))}
    </Pressable>
  );
}

const S = themed((p) => StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
    paddingHorizontal: 4,
  },
  bar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: p.hairlineDim,
  },
}));
