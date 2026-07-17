import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { OpticEye } from '../components/OpticEye';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { enrollStrings } from './strings';

export function IntakeScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline duration={5500} />
      <EnrollHeader mood="dark" right={`00:00 · ${t.intakeTag}`} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 50, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#6c6656' }}>
          {t.kick1}
        </Text>
        <Text style={{ marginTop: 3, fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#8a8168' }}>
          {t.kick2}
        </Text>
        <View style={{ marginTop: 42 }}>
          <OpticEye size={150} />
        </View>
        <Text style={{ marginTop: 38, fontFamily: font('display', 700), fontSize: ms(18), letterSpacing: ms(18) * 0.16, color: '#f4efe2' }}>
          V.E.R.A.
        </Text>
        <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#8a8168', textAlign: 'center' }}>
          {t.veraSub}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 32, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'intake', lang })} lang={lang} rec="REC 00:00:02" cursor />
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 2 }}>
        <AmberButton label={t.beginBtn} onPress={() => setStep('baseline')} lang={lang} />
        <Text
          style={{
            textAlign: 'center',
            marginTop: 11,
            fontFamily: font('mono', 500, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.06,
            color: '#4f4b40',
          }}
        >
          {t.noOptions}
        </Text>
      </View>
    </View>
  );
}
