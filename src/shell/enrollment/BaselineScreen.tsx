import Slider from '@react-native-community/slider';
import { getLocales } from 'expo-localization';
import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tmpl, type Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { enrollStrings } from './strings';

function FieldLabel({ children, lang }: { children: string; lang: Lang }) {
  return (
    <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: palette.light.inkSoft }}>
      {children}
    </Text>
  );
}

function OptionCard({
  label,
  active,
  onPress,
  lang,
  style,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  lang: Lang;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: active ? '#fff6e3' : palette.light.cardAlt,
          borderWidth: active ? 1.5 : 1,
          borderColor: active ? palette.accent.amber : palette.light.borderStrong,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 13,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font('display', active ? 600 : 500, lang),
          fontSize: ms(13.5),
          color: active ? palette.light.ink : palette.light.textDim,
        }}
      >
        {label}
      </Text>
      {active && <Text style={{ color: palette.accent.amber, fontSize: 14 }}>✓</Text>}
    </Pressable>
  );
}

export function BaselineScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const name = useFacilityStore((s) => s.name);
  const adequacy = useFacilityStore((s) => s.adequacy);
  const motive = useFacilityStore((s) => s.motive);
  const { setStep, setLang, setName, setAdequacy, setMotive } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];
  const device = getLocales()[0]?.languageCode === 'ko' ? '한국어' : 'English';

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <EnrollHeader mood="light" right={t.baselineStep} lang={lang} />
      <View style={{ height: 3, backgroundColor: palette.light.borderStrong }}>
        <View style={{ width: '50%', height: '100%', backgroundColor: palette.accent.amber }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 22 }}>
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: palette.light.textDim }}>
            {t.formCode}
          </Text>
          <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(22), lineHeight: ms(22) * 1.15, color: palette.light.ink }}>
            {t.baselineTitle}
          </Text>
          <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.55, color: '#7a766c' }}>
            {t.baselineSub}
          </Text>
        </View>

        <View style={{ paddingTop: 6, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.designation}</FieldLabel>
          <View
            style={{
              marginTop: 7,
              backgroundColor: palette.light.cardAlt,
              borderWidth: 1,
              borderColor: palette.light.borderStrong,
              borderRadius: 11,
              paddingVertical: 13,
              paddingHorizontal: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Dana"
              placeholderTextColor={palette.light.textFaint}
              accessibilityLabel="designation"
              style={{ flex: 1, padding: 0, fontFamily: font('display', 500, lang), fontSize: ms(14), color: palette.light.ink }}
            />
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textFaint }}>{t.mispron}</Text>
          </View>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.adequacyLabel}</FieldLabel>
          <Slider
            style={{ marginTop: 8, width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            value={adequacy}
            onValueChange={(v) => setAdequacy(Math.round(v))}
            minimumTrackTintColor={palette.light.borderStrong}
            maximumTrackTintColor={palette.light.borderStrong}
            thumbTintColor={palette.light.ink}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>{t.inadequate}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.accent.orange }}>{t.disputed}</Text>
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>{t.adequate}</Text>
          </View>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.motiveLabel}</FieldLabel>
          <View style={{ marginTop: 9, gap: 8 }}>
            {t.motive.map((label, i) => (
              <OptionCard key={label} label={label} active={motive === i} onPress={() => setMotive(i)} lang={lang} />
            ))}
          </View>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <FieldLabel lang={lang}>{t.langLabel}</FieldLabel>
          <View style={{ marginTop: 9, flexDirection: 'row', gap: 9 }}>
            <OptionCard label="English" active={lang === 'en'} onPress={() => setLang('en')} lang={lang} style={{ flex: 1 }} />
            <OptionCard label="한국어" active={lang === 'ko'} onPress={() => setLang('ko')} lang={lang} style={{ flex: 1 }} />
          </View>
          <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: palette.light.textDim }}>
            {tmpl(t.langHint, { device })}
          </Text>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: palette.dark.bgAlt, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderLeftWidth: 3, borderLeftColor: palette.accent.orange }}>
            <Text style={{ fontFamily: font('mono', 600), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: palette.accent.amber, marginBottom: 5 }}>
              V.E.R.A.
            </Text>
            <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12), lineHeight: ms(12) * 1.55, color: palette.dark.text }}>
              {getTransmission({ screen: 'baseline', lang })}
            </Text>
          </View>
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20 }}>
          <AmberButton label={t.submitBtn} onPress={() => setStep('consent')} lang={lang} />
        </View>
      </ScrollView>
    </View>
  );
}
