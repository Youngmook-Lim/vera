import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { dayKey } from '../../core/compliance';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { FIRST_DELTA, formatQueue, nextTick, queueForDay, type TickState } from './queue';
import { resultsStrings } from './strings';

// Home-grid tile — unchanged from the placeholder.
const tileStrings = {
  en: { title: 'RESULTS PENDING', sub: '#8,442,105', tag: 'QUEUED' },
  ko: { title: '결과 대기', sub: '#8,442,105', tag: '대기열' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 14, color: '#b9b09a' }}>⌛</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = resultsStrings[lang];

  // Starting number is deterministic per day (drift-on-open) and known
  // synchronously; delta is refined from the previous visit once storage reads.
  const [state, setState] = useState<TickState>(() => ({
    queue: queueForDay(enrolledAt, dayKey(new Date())),
    delta: FIRST_DELTA,
    event: 'none',
    tick: 0,
  }));

  useEffect(() => {
    const start = queueForDay(enrolledAt, dayKey(new Date()));
    let alive = true;
    void storage
      .get(KEYS.lastSeenQueue)
      .then((raw) => {
        if (!alive) return;
        const last = raw == null ? NaN : Number(raw);
        if (Number.isFinite(last)) setState((s) => ({ ...s, delta: start - last }));
        return storage.set(KEYS.lastSeenQueue, String(start));
      })
      .catch(() => {});
    const id = setInterval(() => setState((s) => nextTick(s)), 1100);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enrolledAt]);

  const up = state.event === 'up';
  const numberColor = up ? '#ff8a6a' : '#f4efe2';
  const deltaImproved = state.delta <= 0;
  const deltaColor = deltaImproved ? palette.accent.green : '#ff6a5a';
  const deltaText =
    (up ? `${t.rLiveUp} · ` : '') + formatQueue(Math.abs(state.delta)) + ' ' + t.rSince;

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
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
          borderBottomColor: '#2a2820',
        }}
      >
        <Pressable
          hitSlop={16}
          onPress={() => setStep('facility')}
          accessibilityRole="button"
          accessibilityLabel="back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8168' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{t.title}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c6656' }}>{t.caseLabel}</Text>
      </View>

      {/* readout */}
      <View style={{ alignItems: 'center', paddingHorizontal: 26, paddingTop: 56 }}>
        <Text
          style={{
            fontFamily: font('mono', 500, lang),
            fontSize: ms(9.5),
            letterSpacing: ms(9.5) * 0.24,
            color: '#6c6656',
          }}
        >
          {t.rPosition}
        </Text>
        <Text
          style={{
            marginTop: 24,
            fontFamily: font('display', 700, lang),
            fontSize: ms(52),
            letterSpacing: ms(52) * 0.01,
            color: numberColor,
            textShadowColor: up ? '#ff6a1a44' : '#f4b43a33',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 34,
          }}
        >
          {formatQueue(state.queue)}
        </Text>
        <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: ms(12), color: deltaColor }}>{deltaImproved ? '▼' : '▲'}</Text>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(10), color: deltaColor }}>{deltaText}</Text>
        </View>
        <Text style={{ marginTop: 10, fontFamily: font('mono', 500, lang), fontSize: ms(9.5), color: '#8a8168' }}>
          {t.rWait}
        </Text>

        {/* progress + labels (authored constants) */}
        <View style={{ marginTop: 40, width: '100%', height: 6, backgroundColor: '#221f18', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ width: '2%', height: '100%', backgroundColor: palette.accent.orange }} />
        </View>
        <View style={{ marginTop: 8, width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
          {[t.rEnrolled, t.rProcessed, t.rResult].map((label) => (
            <Text key={label} style={{ fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: '#57534a' }}>
              {label}
            </Text>
          ))}
        </View>

        {/* history (authored constants) */}
        <View style={{ marginTop: 34, width: '100%', gap: 7 }}>
          {[
            { date: 'Mar 02', text: '▼ 1,204', color: '#8a8168' },
            { date: 'Mar 01', text: '▲ 3,991', color: '#ff6a5a' },
            { date: 'Feb 28', text: '▼ 812', color: '#8a8168' },
          ].map((row) => (
            <View key={row.date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(10), color: '#6c6656' }}>{row.date}</Text>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(10), color: row.color }}>{row.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* V.E.R.A. transmission */}
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={up ? t.rVeraUp : t.rVera} lang={lang} />
      </View>
    </View>
  );
}

export const results: ModuleDef = {
  id: 'results',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'blue' }),
  Screen,
};
