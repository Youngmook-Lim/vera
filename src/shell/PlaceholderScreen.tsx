import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { shellStrings } from './strings';

// Stand-in for screens that arrive in later phases. Matches the module
// header pattern from the prototype (back arrow → facility).
export function PlaceholderScreen({ title }: { title: string }) {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = shellStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#2a2820',
        }}
      >
        {/* arrow + title are one target: the glyph alone is too small a tap zone */}
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8168' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{title}</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
        <Text
          style={{
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.accent.amber,
          }}
        >
          {t.underConstruction}
        </Text>
        <Text
          style={{
            fontFamily: font('display', 500, lang),
            fontSize: ms(13),
            lineHeight: ms(13) * 1.6,
            color: palette.dark.text,
            textAlign: 'center',
          }}
        >
          {t.underConstructionBody}
        </Text>
      </View>
    </View>
  );
}
