import React, { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Radar } from './Radar';
import { hazardStrings, type HazardScheme } from './strings';

const strings = {
  en: { title: 'HAZARD ASSESSMENT', sub: 'entity census', tag: '4 ⚠' },
  ko: { title: '위험 평가', sub: '개체 조사', tag: '4 ⚠' },
} as const;

// Mock: 13px red-bordered rounded square.
function Icon() {
  return <View style={{ width: 13, height: 13, borderWidth: 1.5, borderColor: palette.accent.red, borderRadius: 3 }} />;
}

// Census tag pill colors per scheme (from the mock's four entity rows).
const TAG_STYLES: Record<HazardScheme, { text: string; border: string; bg: string }> = {
  benign: { text: '#8a8168', border: '#2c2a22', bg: 'transparent' },
  monitoring: { text: '#c98a17', border: '#f4b43a66', bg: '#f4b43a14' },
  escalated: { text: '#ff5a48', border: '#d63a2a66', bg: '#d63a2a14' },
  known: { text: '#4fd08a', border: '#4fd08a66', bg: '#4fd08a14' },
};

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = hazardStrings[lang];

  // The one interactive-free flourish on the pill: a slow opacity pulse.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.45, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={{ flex: 1, backgroundColor: '#131011', paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2a2020' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a6868' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c5656' }}>{t.sweep}</Text>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 22, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
        {/* status pills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#d63a2a66', backgroundColor: '#d63a2a14', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 }, pulseStyle]}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#ff5a48' }} />
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#ff5a48' }}>{t.unauthorized}</Text>
          </Animated.View>
          <View style={{ borderWidth: 1, borderColor: '#2c2222', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 }}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#8a8168' }}>{t.sector}</Text>
          </View>
        </View>

        {/* radar + "you" label */}
        <View style={{ marginTop: 20, width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
          <Radar />
          <Text style={{ position: 'absolute', top: 125, left: 0, right: 0, textAlign: 'center', fontFamily: font('mono', 600, lang), fontSize: ms(7), letterSpacing: ms(7) * 0.1, color: '#8a8168' }}>{t.you}</Text>
        </View>
        <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.14, color: '#6c5656' }}>{t.youNote}</Text>

        {/* detected entities */}
        <Text style={{ marginTop: 18, alignSelf: 'flex-start', fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#6c5656' }}>{t.detected}</Text>
        <View style={{ marginTop: 8, width: '100%', backgroundColor: '#1c1617', borderWidth: 1, borderColor: '#2c2222', borderRadius: 12, overflow: 'hidden' }}>
          {t.entities.map((e, i) => {
            const s = TAG_STYLES[e.scheme];
            return (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderBottomWidth: i < t.entities.length - 1 ? 1 : 0, borderBottomColor: '#241a1c' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), color: '#8a8168' }}>{e.id}</Text>
                  <Text style={{ marginTop: 3, fontFamily: font('display', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.4, color: '#c9c2ae' }}>{e.desc}</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: s.border, backgroundColor: s.bg, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 20 }}>
                  <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.06, color: s.text }}>{e.tag}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* V.E.R.A. */}
        <View style={{ marginTop: 14, width: '100%' }}>
          <VeraPanel line={t.vera} lang={lang} accent="#ff6a1a" />
        </View>
      </ScrollView>
    </View>
  );
}

export const hazard: ModuleDef = {
  id: 'hazard',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'red' }),
  Screen,
};
