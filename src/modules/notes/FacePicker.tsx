import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { PALETTES, emotionText, font, ms, themed } from '../../core/theme';
import { EMOTIONS, WAKING_EMOTIONS, emotionLabel, type WakingEmotion } from '../../vera/emotions';

// Which of her faces a note's cards wear where Samsung draws the app's icon
// (2026-10-19). Eight dots in their raw iris — an object, not type, so the
// hue is not darkened on light — with the chosen one ringed and named
// underneath in the darkened ink type takes.
export function FacePicker({
  face,
  onChange,
  lang,
}: {
  face: WakingEmotion;
  onChange: (face: WakingEmotion) => void;
  lang: Lang;
}) {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {WAKING_EMOTIONS.map((key) => {
          const on = key === face;
          return (
            <Pressable
              key={key}
              testID={`face-${key}`}
              accessibilityRole="radio"
              accessibilityLabel={emotionLabel(key, lang)}
              accessibilityState={{ selected: on }}
              hitSlop={6}
              onPress={() => onChange(key)}
              style={[styles.ring, { borderColor: on ? p.notes.ink : 'transparent' }]}
            >
              <View
                testID={`face-${key}-iris`}
                style={[styles.iris, { backgroundColor: EMOTIONS[key].iris }]}
              />
            </Pressable>
          );
        })}
      </View>
      <Text
        testID="face-label"
        style={[
          styles.label,
          { fontFamily: font('mono', 500, lang), color: emotionText(EMOTIONS[face].iris, theme) },
        ]}
      >
        {emotionLabel(face, lang)}
      </Text>
    </View>
  );
}

const S = themed(() => StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  ring: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iris: { width: 18, height: 18, borderRadius: 9 },
  label: { fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.22 },
}));
