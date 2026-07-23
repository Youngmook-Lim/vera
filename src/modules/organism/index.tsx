import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { VeraPanel } from '../../shell/components/VeraPanel';
import type { ModuleDef } from '../types';
import { Blob, BLOB_SIZE } from './Blob';
import { feed, hungerForNow, isHungry, START_HUNGER } from './hunger';
import { organismStrings } from './strings';

const tileStrings = {
  en: { title: 'SUPPORT ORGANISM', sub: 'specimen-03', tag: 'HUNGRY' },
  ko: { title: '지원 유기체', sub: '표본-03', tag: '공복' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🐼</Text>;
}

function Vital({
  label,
  value,
  sub,
  color,
  lang,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  lang: 'en' | 'ko';
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.dark.card,
        borderWidth: 1,
        borderColor: palette.dark.border,
        borderRadius: 12,
        paddingHorizontal: 11,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.1, color: '#6c6656' }}>{label}</Text>
      <Text style={{ marginTop: 5, fontFamily: font('display', 700, lang), fontSize: ms(15), color }}>{value}</Text>
      <Text style={{ marginTop: 5, fontFamily: font('mono', 500, lang), fontSize: ms(8), color: '#6c6656' }}>{sub}</Text>
    </View>
  );
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const t = organismStrings[lang];

  const [hunger, setHunger] = useState(START_HUNGER);
  const [tapNonce, setTapNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    void Promise.all([storage.get(KEYS.organismHunger), storage.get(KEYS.organismLastFed)])
      .then(([h, fedAt]) => {
        if (!alive) return;
        const stored = h == null ? null : Number(h);
        setHunger(hungerForNow(Number.isFinite(stored as number) ? stored : null, fedAt, new Date()));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const onFeed = () => {
    setHunger((h) => {
      const next = feed(h);
      void storage.set(KEYS.organismHunger, String(next));
      void storage.set(KEYS.organismLastFed, new Date().toISOString());
      return next;
    });
    setTapNonce((n) => n + 1);
  };

  const hungry = isHungry(hunger);
  const hungerColor = hungry ? '#ff8a4a' : palette.accent.green;

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
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#6c6656' }}>SPECIMEN-03</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, alignItems: 'center' }}>
        {/* status pill + day */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), color: hungerColor, borderWidth: 1, borderColor: palette.dark.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            {hungry ? t.statusHungry : t.statusFed}
          </Text>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#8a8168', borderWidth: 1, borderColor: palette.dark.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
            {t.day}
          </Text>
        </View>

        {/* tank + tappable blob */}
        <Pressable
          onPress={onFeed}
          accessibilityRole="button"
          accessibilityLabel="feed"
          style={{
            marginTop: 18,
            width: BLOB_SIZE,
            height: BLOB_SIZE,
            borderRadius: BLOB_SIZE / 2,
            borderWidth: 1,
            borderColor: palette.dark.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#161d18',
          }}
        >
          <Blob hunger={hunger} tapNonce={tapNonce} />
        </Pressable>

        <Text style={{ marginTop: 13, fontFamily: font('mono', 500, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.18, color: '#6c6656' }}>
          {hungry ? t.moodHungry : t.moodFed}
        </Text>
        <Text style={{ marginTop: 8, fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.14, color: hungry ? '#9a6a52' : '#4fd08a' }}>
          {hungry ? t.tapHint : t.fedHint}
        </Text>

        {/* vitals grid */}
        <View style={{ marginTop: 15, width: '100%', flexDirection: 'row', gap: 8 }}>
          <Vital label={t.hungerLabel} value={`${Math.round(hunger)}%`} sub="" color={hungerColor} lang={lang} />
          <Vital label={t.tempLabel} value="36.1°" sub={t.tempSub} color="#f4efe2" lang={lang} />
          <Vital label={t.nauseaLabel} value={t.nauseaVal} sub={t.nauseaSub} color={palette.accent.green} lang={lang} />
        </View>

        {/* mutation log */}
        <Text style={{ marginTop: 18, width: '100%', fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.16, color: '#6c6656' }}>{t.mutLog}</Text>
        <View style={{ marginTop: 8, width: '100%', backgroundColor: palette.dark.card, borderWidth: 1, borderColor: palette.dark.border, borderRadius: 12, overflow: 'hidden' }}>
          {[
            { d: t.mutD1, m: t.mut1 },
            { d: t.mutD2, m: t.mut2 },
            { d: t.mutD3, m: t.mut3 },
          ].map((row, i) => (
            <View key={row.d} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#221f18' }}>
              <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#57534a', minWidth: 44 }}>{row.d}</Text>
              <Text style={{ flex: 1, fontFamily: font('display', 500, lang), fontSize: ms(11), lineHeight: ms(11) * 1.45, color: '#c9c2ae' }}>{row.m}</Text>
            </View>
          ))}
        </View>

        {/* V.E.R.A. */}
        <View style={{ marginTop: 14, width: '100%' }}>
          <VeraPanel line={hungry ? t.veraHungry : t.veraFed} lang={lang} />
        </View>
      </ScrollView>
    </View>
  );
}

export const organism: ModuleDef = {
  id: 'organism',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...tileStrings[lang], tagScheme: 'orange' }),
  Screen,
};
