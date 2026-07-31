import React from 'react';
import { Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { emotionLabel } from '../vera/emotions';

// Temporary. Task 9 gives her the optic and Task 10 the rest of the stage;
// until then this is just proof the app boots into her room.
export function Stage() {
  const emotion = useFacilityStore((s) => s.emotion);
  const lang = useFacilityStore((s) => s.lang);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontFamily: font('mono', 600, lang),
          fontSize: ms(9),
          letterSpacing: ms(9) * 0.22,
          color: palette.textDim,
        }}
      >
        {emotionLabel(emotion, lang)}
      </Text>
    </View>
  );
}
