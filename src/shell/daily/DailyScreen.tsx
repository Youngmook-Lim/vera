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
import { dayKey, rollAudit } from '../../core/compliance';
import { tmpl } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { VeraPanel } from '../components/VeraPanel';
import { ComplyRing } from './ComplyRing';
import { dailyStrings } from './strings';

type Phase = 'directive' | 'deliberating' | 'done';

function AuditSpinner() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
  }, [spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: 75,
            borderWidth: 3,
            borderColor: palette.light.borderStrong,
            borderTopColor: palette.accent.amber,
          },
          style,
        ]}
      />
      <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: palette.accent.amber }} />
    </View>
  );
}

export function DailyScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const streak = useFacilityStore((s) => s.streak);
  const lastComply = useFacilityStore((s) => s.lastComply);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = dailyStrings[lang];

  const alreadyDone = lastComply === dayKey(new Date());
  const [phase, setPhase] = useState<Phase>(alreadyDone ? 'done' : 'directive');
  const [audited, setAudited] = useState(false);
  const [holding, setHolding] = useState(false);
  const auditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (auditTimer.current) clearTimeout(auditTimer.current);
  }, []);

  const finishComply = async () => {
    await useFacilityStore.getState().completeComply();
    setPhase('done');
  };

  const onHoldComplete = () => {
    if (rollAudit()) {
      setAudited(true);
      setPhase('deliberating');
      auditTimer.current = setTimeout(() => void finishComply(), 2200);
    } else {
      void finishComply();
    }
  };

  const veraPhase = phase === 'deliberating' ? 'deliberating' : phase === 'done' ? (audited ? 'doneAudit' : 'done') : 'idle';

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
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
      </View>

      <View style={{ paddingTop: 20, paddingHorizontal: 20, alignItems: 'center' }}>
        <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: palette.light.textDim }}>
          {t.directiveCode}
        </Text>
        <Text style={{ marginTop: 6, fontFamily: font('display', 700, lang), fontSize: ms(22), lineHeight: ms(22) * 1.14, color: palette.light.ink, textAlign: 'center' }}>
          {t.directiveTitle}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: 30, minHeight: 300 }}>
        {phase === 'directive' && (
          <>
            <ComplyRing onComplete={onHoldComplete} onHoldChange={setHolding} lang={lang} />
            <Text style={{ marginTop: 22, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim, height: 20 }}>
              {holding ? t.verifyingPresence : t.holdToComply}
            </Text>
          </>
        )}
        {phase === 'deliberating' && (
          <>
            <AuditSpinner />
            <Text style={{ marginTop: 24, fontFamily: font('mono', 600, lang), fontSize: ms(10), letterSpacing: ms(10) * 0.1, color: palette.light.textDim }}>
              {t.auditing}
            </Text>
            <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textFaint }}>
              {t.auditingSub}
            </Text>
          </>
        )}
        {phase === 'done' && <Verdict audited={audited} streak={streak} lang={lang} />}
      </View>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 22 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], marginLeft: 22, marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'daily', phase: veraPhase, lang })} lang={lang} rec="REC 03:15:07" />
      </View>
    </View>
  );
}

function Verdict({ audited, streak, lang }: { audited: boolean; streak: number; lang: 'en' | 'ko' }) {
  const t = dailyStrings[lang];
  const scale = useSharedValue(2.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.2, 0.7, 0.3, 1.4) });
  }, [opacity, scale]);
  const stampStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View style={{ alignItems: 'center', marginTop: 24 }}>
      <Animated.View
        style={[
          {
            borderWidth: 3,
            borderColor: palette.accent.green,
            borderRadius: 13,
            paddingVertical: 11,
            paddingHorizontal: 24,
            backgroundColor: '#4fd08a1a',
          },
          stampStyle,
        ]}
      >
        <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(18), letterSpacing: ms(18) * 0.06, color: '#2c9a63', textAlign: 'center' }}>
          {audited ? t.provCompliantLabel : t.compliantLabel}
        </Text>
      </Animated.View>
      <Text style={{ marginTop: 16, fontFamily: font('mono', 600, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.08, color: palette.light.ink }}>
        {tmpl(t.streakText, { n: streak })}
      </Text>
    </View>
  );
}
