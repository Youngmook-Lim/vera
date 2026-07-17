import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { shellStrings } from '../strings';
import { enrollStrings } from './strings';

function Stat({ value, label, lang }: { value: string; label: string; lang: 'en' | 'ko' }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: font('display', 700), fontSize: ms(20), color: '#f4efe2' }}>{value}</Text>
      <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.08, color: palette.dark.textFaint }}>
        {label}
      </Text>
    </View>
  );
}

export function AssignedScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  // fstamp: pop in tilted, overshooting down to rest scale
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0.7, 0.3, 1.4) });
  }, [opacity, scale]);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: '-11deg' }, { scale: scale.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline />
      <EnrollHeader mood="dark" right={t.assignedStep} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 52, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.2, color: '#8a8168' }}>
          {t.enrollComplete}
        </Text>
        <Text style={{ marginTop: 30, fontFamily: font('mono', 500, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.14, color: '#6c6656' }}>
          {t.designated}
        </Text>
        <View style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.3, color: palette.accent.amber }}>
            {t.subjectWord}
          </Text>
          <Text style={{ fontFamily: font('display', 700), fontSize: ms(74), lineHeight: ms(74) * 0.95, color: '#f4efe2' }}>#50640</Text>
        </View>
        <Animated.View
          style={[
            { marginTop: 28, borderWidth: 3, borderColor: palette.accent.green, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 20 },
            stampStyle,
          ]}
        >
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(16), letterSpacing: ms(16) * 0.1, color: palette.accent.green }}>
            {shellStrings[lang].goodStanding}
          </Text>
        </Animated.View>
        <View style={{ marginTop: 32, flexDirection: 'row', gap: 24, alignItems: 'stretch' }}>
          <Stat value="01" label={t.tenure} lang={lang} />
          <View style={{ width: 1, backgroundColor: '#2a2820' }} />
          <Stat value="00/11" label={t.evals} lang={lang} />
          <View style={{ width: 1, backgroundColor: '#2a2820' }} />
          <Stat value="100%" label={t.compliant} lang={lang} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 34, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'assigned', lang })} lang={lang} rec="REC 00:01:41" cursor />
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 2 }}>
        <AmberButton label={t.enterBtn} onPress={() => setStep('permission')} lang={lang} />
      </View>
    </View>
  );
}
