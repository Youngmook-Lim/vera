import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { tenureDays } from '../../core/compliance';
import { tmpl } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { VeraPanel } from '../components/VeraPanel';
import { dayLabel, displayName, shellStrings } from '../strings';
import { dailyStrings } from './strings';

type MPhase = 'missed' | 'amending' | 'restored';

const PILL = {
  review: { text: '#d63a2a', border: '#d63a2a55', bg: '#d63a2a12' },
  probation: { text: '#c98a17', border: '#c98a1755', bg: '#c98a1712' },
} as const;

export function MissedScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const name = useFacilityStore((s) => s.name);
  const forfeited = useFacilityStore((s) => s.forfeited);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = dailyStrings[lang];
  const [phase, setPhase] = useState<MPhase>('missed');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const petition = () => {
    setPhase('amending');
    timer.current = setTimeout(() => {
      void useFacilityStore.getState().petitionReinstatement().then(() => setPhase('restored'));
    }, 1900);
  };

  const pill = phase === 'restored' ? PILL.probation : PILL.review;
  const pillLabel = phase === 'restored' ? shellStrings[lang].probation : shellStrings[lang].underReview;

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 11,
          paddingBottom: 9,
          borderBottomWidth: 1,
          borderBottomColor: palette.light.borderStrong,
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: palette.light.inkSoft }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10.5), color: palette.light.ink }}>{t.dailyTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: palette.light.textDim }}>{t.missedHeaderRight}</Text>
      </View>

      {/* identity row, red optic */}
      <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 17, height: 17, borderRadius: 8.5, borderWidth: 2, borderColor: palette.accent.red }} />
          <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.accent.red }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(15), color: palette.light.ink }}>{displayName(name)}</Text>
          <Text style={{ marginTop: 4, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.04, color: palette.light.textDim }}>
            SUBJECT #50640 · {dayLabel(tenureDays(enrolledAt, new Date()), lang)}
          </Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: pill.border, backgroundColor: pill.bg, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.06, color: pill.text }}>
            ● {pillLabel}
          </Text>
        </View>
      </View>

      {/* alert card */}
      <View style={{ paddingTop: 16, paddingHorizontal: 20 }}>
        <View style={{ backgroundColor: '#fbeae7', borderWidth: 1, borderColor: '#e7b3ab', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 15, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: palette.accent.red, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontSize: 15 }}>⚠</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13.5), lineHeight: ms(13.5) * 1.2, color: '#a02718' }}>{t.missedTitle}</Text>
            <Text style={{ marginTop: 4, fontFamily: font('mono', 500, lang), fontSize: ms(10.5), lineHeight: ms(10.5) * 1.5, color: '#8a5c54' }}>{t.missedBody}</Text>
          </View>
        </View>
      </View>

      {/* forfeit */}
      <View style={{ paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', gap: 14, justifyContent: 'center' }}>
        <Text style={{ fontFamily: font('display', 700), fontSize: ms(60), lineHeight: ms(60) * 0.95, color: palette.accent.red }}>0</Text>
        <View>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: palette.light.ink }}>{t.dayStreakLabel}</Text>
          <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: '#a02718', textDecorationLine: 'line-through' }}>
            {tmpl(t.streakForfeited, { n: forfeited })}
          </Text>
        </View>
      </View>

      {/* petition / amending / restored */}
      <View style={{ paddingTop: 20, paddingHorizontal: 20, minHeight: 120 }}>
        {phase === 'missed' && (
          <>
            <Pressable onPress={petition} style={{ backgroundColor: palette.light.ink, borderRadius: 15, padding: 16, alignItems: 'center', elevation: 8 }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.06, color: '#ffffff' }}>{t.petition}</Text>
            </Pressable>
            <Text style={{ marginTop: 9, textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.04, color: palette.light.textFaint }}>
              {t.petitionSub}
            </Text>
          </>
        )}
        {phase === 'amending' && (
          <View style={{ alignItems: 'center', paddingTop: 6 }}>
            <Animated.View style={[{ width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: palette.light.borderStrong, borderTopColor: palette.accent.red }, spinStyle]} />
            <Text style={{ marginTop: 16, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim }}>
              {t.reviewingPetition}
            </Text>
          </View>
        )}
        {phase === 'restored' && (
          <View style={{ alignItems: 'center' }}>
            <View style={{ borderWidth: 2, borderColor: '#c98a17', borderRadius: 11, paddingVertical: 8, paddingHorizontal: 18, backgroundColor: '#c98a171a' }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.06, color: '#8a5c0f', textAlign: 'center' }}>
                {t.standingRestored}
              </Text>
            </View>
            <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: palette.light.textDim, textAlign: 'center', maxWidth: 250 }}>
              {t.restoredBody}
            </Text>
          </View>
        )}
      </View>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], marginLeft: 22, marginBottom: -7 }} />
        <VeraPanel
          line={getTransmission({ screen: 'missed', phase, lang })}
          lang={lang}
          rec="REC 27:03:14"
          accent={palette.accent.red}
        />
      </View>
    </View>
  );
}
