import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { tmpl } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import type { ModuleDef } from '../types';
import { Chamber } from './Chamber';
import { incineratorStrings } from './strings';

type Phase = 'compose' | 'burning' | 'done';

// Home-grid tile — unchanged from the placeholder.
const tileStrings = {
  en: { title: 'THE INCINERATOR', sub: 'disposal services', tag: 'READY' },
  ko: { title: '소각로', sub: '폐기 처리', tag: '준비됨' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🔥</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = incineratorStrings[lang];

  const [phase, setPhase] = useState<Phase>('compose');
  const [text, setText] = useState('');
  const [burnedCount, setBurnedCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void storage
      .get(KEYS.burnedCount)
      .then((raw) => {
        if (!alive) return;
        const n = raw == null ? 0 : Number(raw);
        if (Number.isFinite(n)) setBurnedCount(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const onPress = () => {
    if (phase === 'burning') return;
    if (phase === 'done') {
      setPhase('compose');
      setText('');
      return;
    }
    if (!text.trim()) return;
    setPhase('burning');
    timer.current = setTimeout(() => {
      setBurnedCount((c) => {
        const next = c + 1;
        void storage.set(KEYS.burnedCount, String(next));
        return next;
      });
      setPhase('done');
    }, 2000);
  };

  const status =
    phase === 'burning'
      ? t.iStatusBurning
      : phase === 'done'
        ? t.iStatusDone
        : words === 0
          ? t.iAwaiting
          : tmpl(t.iWords, { n: words });
  const veraLine = phase === 'burning' ? t.iVeraBurn : phase === 'done' ? t.iVeraDone : t.iVeraCompose;
  const inputOpacity = phase === 'burning' ? 0.12 : phase === 'done' ? 0 : 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#120d0a', paddingTop: insets.top }}>
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#2a1c14',
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a6a58' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#7a5a48' }}>
          {tmpl(t.iBurned, { n: burnedCount.toLocaleString('en-US') })}
        </Text>
      </View>

      {/* grievance input */}
      <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: '#9a6a52' }}>
          {t.iGrievance}
        </Text>
        <View
          style={{
            marginTop: 9,
            backgroundColor: '#1c1410',
            borderWidth: 1,
            borderColor: '#3a281e',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 11,
            minHeight: 104,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            editable={phase === 'compose'}
            multiline
            placeholder={t.iPlaceholder}
            placeholderTextColor="#6c5646"
            accessibilityLabel="grievance"
            style={{
              padding: 0,
              fontFamily: font('display', 500, lang),
              fontSize: ms(13),
              lineHeight: ms(13) * 1.5,
              color: '#f2e7d3',
              opacity: inputOpacity,
              minHeight: 82,
              textAlignVertical: 'top',
            }}
          />
          {phase === 'done' && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.18, color: '#6c5646' }}>
                {t.iAsh}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* chamber */}
      <View style={{ marginTop: 26, alignItems: 'center' }}>
        <Chamber burning={phase === 'burning'} label={t.iChamber} lang={lang} />
        <Text style={{ marginTop: 12, fontFamily: font('mono', 500, lang), fontSize: ms(10), color: '#9a6a52' }}>{status}</Text>
      </View>

      {/* V.E.R.A. pre-combustion review card (distinct from VeraPanel) */}
      <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
        <View style={{ backgroundColor: '#17120e', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: '#ff6a1a' }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.16, color: '#ff8a4a', marginBottom: 5 }}>
            {t.iReviewLabel}
          </Text>
          <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12.5), lineHeight: ms(12.5) * 1.5, color: palette.dark.text }}>
            {veraLine}
          </Text>
        </View>
      </View>

      {/* incinerate button */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24 }}>
        <Pressable
          onPress={onPress}
          disabled={phase === 'burning'}
          accessibilityRole="button"
          accessibilityLabel="incinerate"
        >
          {phase === 'compose' ? (
            <LinearGradient
              colors={['#ff8a3a', '#ff6a1a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ borderRadius: 15, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), letterSpacing: ms(13) * 0.12, color: '#2a0d04' }}>
                🔥 {t.iBtn}
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={
                phase === 'burning'
                  ? { backgroundColor: '#3a281e', borderRadius: 15, paddingVertical: 16, alignItems: 'center' }
                  : { backgroundColor: '#1c1410', borderWidth: 1, borderColor: '#3a281e', borderRadius: 15, paddingVertical: 15, alignItems: 'center' }
              }
            >
              <Text
                style={{
                  fontFamily: font('display', 700, lang),
                  fontSize: ms(13),
                  letterSpacing: ms(13) * 0.12,
                  color: phase === 'burning' ? '#9a6a52' : '#ff8a4a',
                }}
              >
                {phase === 'burning' ? t.iBtnBurning : t.iBtnAgain}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export const incinerator: ModuleDef = {
  id: 'incinerator',
  layout: 'wide',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'green' }),
  Screen,
};
