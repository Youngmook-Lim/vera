import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { enrollStrings } from './strings';

// Dodge positions from the prototype's declinePos()
const SPOTS = [
  [0, 0],
  [74, -4],
  [-64, 8],
  [92, 16],
  [-92, -10],
  [48, -26],
] as const;

function DeclineButton() {
  const lang = useFacilityStore((s) => s.lang);
  const decline = useFacilityStore((s) => s.decline);
  const nudgeDecline = useFacilityStore((s) => s.nudgeDecline);
  const t = enrollStrings[lang];
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  useEffect(() => {
    const [x, y] = SPOTS[Math.min(decline, SPOTS.length - 1)];
    const cfg = { duration: 280, easing: Easing.bezier(0.3, 0.8, 0.3, 1.2) };
    tx.value = withTiming(x, cfg);
    ty.value = withTiming(y, cfg);
  }, [decline, tx, ty]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  return (
    <Animated.View style={[{ position: 'absolute', right: 0, top: 0 }, style]}>
      <Pressable
        onPressIn={nudgeDecline}
        style={{
          width: 100,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.light.bg,
          borderWidth: 1,
          borderColor: palette.light.borderStrong,
          borderRadius: 15,
        }}
      >
        <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: palette.light.textDim }}>
          {t.declineLabels[Math.min(decline, t.declineLabels.length - 1)]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ConsentScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const poked = useFacilityStore((s) => s.poked);
  const { setStep, poke } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <EnrollHeader mood="light" right={t.consentStep} lang={lang} />
      <View style={{ height: 3, backgroundColor: palette.light.borderStrong }}>
        <View style={{ width: '75%', height: '100%', backgroundColor: palette.accent.amber }} />
      </View>
      <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 6 }}>
        <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: palette.light.textDim }}>
          {t.consentDoc}
        </Text>
        <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(21), lineHeight: ms(21) * 1.1, color: palette.light.ink }}>
          {t.consentTitle}
        </Text>
      </View>
      <View
        style={{
          marginTop: 8,
          marginHorizontal: 20,
          height: 352,
          overflow: 'hidden',
          backgroundColor: palette.light.cardAlt,
          borderWidth: 1,
          borderColor: palette.light.borderStrong,
          borderRadius: 12,
          paddingTop: 15,
          paddingHorizontal: 15,
        }}
      >
        {t.clauses.map((c) => (
          <View key={c.n}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(11), color: palette.light.ink, marginBottom: 6 }}>{c.n}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.62, color: '#4f4b40', marginBottom: 12 }}>
              {c.t}
            </Text>
          </View>
        ))}
        <LinearGradient
          colors={['#f4f3ee00', '#f4f3ee']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 }}
          pointerEvents="none"
        />
        <Text style={{ position: 'absolute', right: 11, bottom: 11, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: palette.light.textFaint }}>
          {t.scrollDisabled}
        </Text>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 20 }}>
        <Pressable
          onPress={poke}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 11,
            backgroundColor: '#fff6e3',
            borderWidth: 1.5,
            borderColor: palette.accent.amber,
            borderRadius: 12,
            paddingVertical: 13,
            paddingHorizontal: 14,
          }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: palette.accent.amber, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: font('display', 700), fontSize: ms(13), color: palette.light.ink }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11.5), lineHeight: ms(11.5) * 1.4, color: palette.light.ink }}>
              {t.consentCheck}
            </Text>
            <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#a58a3a' }}>
              {poked ? t.consentPoked : t.consentNote}
            </Text>
          </View>
        </Pressable>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22, height: 52 }}>
        <AmberButton
          label={t.acceptBtn}
          arrow={false}
          onPress={() => setStep('assigned')}
          lang={lang}
          style={{ position: 'absolute', left: 0, right: 112, top: 0 }}
        />
        <DeclineButton />
      </View>
    </View>
  );
}
