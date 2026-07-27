import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Compass } from './Compass';
import { fieldStrings } from './strings';
import { signalLitCount, START_DIST, TICK_MS, veraKey, walkStep } from './walk';

const tileStrings = {
  en: { title: 'FIELD TRIAL', sub: 'proceed as directed', tag: 'ACTIVE' },
  ko: { title: '현장 시험', sub: '지시대로 이동', tag: '활성' },
} as const;

// Mock: 13px amber-ringed compass with a 2×6 tick at 12 o'clock.
function Icon() {
  return (
    <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: palette.accent.amber }}>
      <View style={{ position: 'absolute', left: 4, top: -5, width: 2, height: 6, backgroundColor: palette.accent.amber }} />
    </View>
  );
}

const BAR_HEIGHTS = [35, 55, 80, 45, 100];

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = fieldStrings[lang];

  const [dist, setDist] = useState(START_DIST);
  const [walking, setWalking] = useState(false);
  const [arrived, setArrived] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitArmed = useRef(false);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => stop(), []);

  const onPressIn = () => {
    if (arrived) {
      exitArmed.current = true; // arm exit; do not walk
      return;
    }
    setWalking(true);
    stop();
    timer.current = setInterval(() => {
      setDist((d) => {
        const nd = walkStep(d);
        if (nd === 0) {
          stop();
          setWalking(false);
          setArrived(true);
        }
        return nd;
      });
    }, TICK_MS);
  };

  const onPressOut = () => {
    if (arrived) {
      if (exitArmed.current) {
        exitArmed.current = false;
        setStep('facility');
      }
      return;
    }
    stop();
    setWalking(false);
  };

  const litCount = signalLitCount(dist);
  const signalText = arrived ? t.signalArrived : walking ? t.signalRising : t.signalIdle;
  const veraLine = t[veraKey(dist, walking, arrived)];

  return (
    <View style={{ flex: 1, backgroundColor: '#0c1012', paddingTop: insets.top }}>
      {/* header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1a2226' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#5a6e72' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#dbe8ea' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#5a6e72' }}>{t.trial}</Text>
      </View>

      {/* directive card */}
      <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
        <View style={{ backgroundColor: '#111819', borderWidth: 1, borderColor: '#1e2a2d', borderLeftWidth: 3, borderLeftColor: '#38c8c8', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: '#38c8c8', marginBottom: 6 }}>{t.directive}</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(14), lineHeight: ms(14) * 1.35, color: '#dbe8ea' }}>{t.task}</Text>
        </View>
      </View>

      {/* compass + distance */}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <Compass dist={dist} walking={walking} arrived={arrived} />
          {arrived && (
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(15), letterSpacing: ms(15) * 0.1, color: '#38f0e0' }}>{t.arrivedBig}</Text>
              <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.12, color: '#5a6e72' }}>{t.arrivedSub}</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 26, flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text testID="distance" style={{ fontFamily: font('display', 700, lang), fontSize: ms(40), color: '#e4eff0' }}>{dist}</Text>
          <Text style={{ marginBottom: ms(6), fontFamily: font('mono', 500), fontSize: ms(16), color: '#5a6e72' }}>m</Text>
        </View>
        <Text style={{ marginTop: 6, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#5a6e72' }}>{t.distance}</Text>

        {/* signal bars */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 24 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <View key={i} style={{ width: 8, height: `${h}%`, borderRadius: 2, backgroundColor: i < litCount ? '#38c8c8' : '#1e2a2d' }} />
          ))}
        </View>
        <Text style={{ marginTop: 8, fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: '#5a6e72' }}>{signalText}</Text>
      </View>

      {/* V.E.R.A. + hold-to-walk button pinned to bottom */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 20 }}>
        <VeraPanel line={veraLine} lang={lang} accent="#38c8c8" />
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel="walk"
          style={{
            marginTop: 12,
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            backgroundColor: arrived ? '#38c8c8' : walking ? '#16211f' : '#111819',
            borderWidth: arrived ? 0 : 1,
            borderColor: walking ? '#38c8c866' : '#1e2a2d',
          }}
        >
          <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(12), letterSpacing: ms(12) * 0.08, color: arrived ? '#0c1012' : walking ? '#38f0e0' : '#dbe8ea' }}>
            {arrived ? t.walkDone : walking ? t.walking : t.walk}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const field: ModuleDef = {
  id: 'field',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'amber' }),
  Screen,
};
