import React from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { shellStrings } from '../strings';

export function EnrollHeader({ mood, right, lang }: { mood: 'dark' | 'light'; right: string; lang: Lang }) {
  const dark = mood === 'dark';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 11,
        paddingBottom: 9,
        borderBottomWidth: 1,
        borderBottomColor: dark ? '#2a2820' : palette.light.borderStrong,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }} />
        <Text
          style={{
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.06,
            color: dark ? '#b9b09a' : palette.light.inkSoft,
          }}
        >
          {shellStrings[lang].center}
        </Text>
      </View>
      <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: dark ? '#6c6656' : palette.light.textDim }}>
        {right}
      </Text>
    </View>
  );
}
