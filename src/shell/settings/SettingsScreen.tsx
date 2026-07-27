import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { settingsStrings } from './strings';

const L = palette.light;

// Amber-selected language option (optCard/tick, mock lines 1109–1119).
function LangButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: active ? '#fff6e3' : '#f4f3ee',
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? '#f4b43a' : '#dcd9cf',
      }}
    >
      <Text style={{ fontFamily: font('display', active ? 600 : 500), fontSize: ms(14), color: active ? L.ink : L.textDim }}>{label}</Text>
      {active ? <Text style={{ color: '#f4b43a', fontSize: ms(14) }}>✓</Text> : null}
    </Pressable>
  );
}

// Custom pill toggle (mock lines 1240–1241): 40×23 track, 18px white knob.
function NotifToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="notifications"
      style={{ width: 40, height: 23, borderRadius: 12, backgroundColor: on ? '#f4b43a' : '#cbc7bb' }}
    >
      <View style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

function ProgramRow({ title, sub, right, onPress, divider }: { title: string; sub: string; right: React.ReactNode; onPress?: () => void; divider: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: '#e4e1d7',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font('display', 600), fontSize: ms(13.5), color: L.ink }}>{title}</Text>
        <Text style={{ marginTop: 3, fontFamily: font('mono', 500), fontSize: ms(9), color: L.textDim }}>{sub}</Text>
      </View>
      {right}
    </Pressable>
  );
}

export function SettingsScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const notif = useFacilityStore((s) => s.notif);
  const setLang = useFacilityStore((s) => s.setLang);
  const setStep = useFacilityStore((s) => s.setStep);
  const reprocess = useFacilityStore((s) => s.reprocess);
  const updateNotif = useFacilityStore((s) => s.updateNotif);
  const insets = useSafeAreaInsets();
  const t = settingsStrings[lang];

  const chevron = <Text style={{ color: '#b3aea1', fontSize: ms(15) }}>▸</Text>;
  const setL = (l: Lang) => () => setLang(l);

  return (
    <View style={{ flex: 1, backgroundColor: L.bg, paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 11, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#dcd9cf' }}>
        <Pressable hitSlop={16} onPress={() => setStep('facility')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: L.inkSoft }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(11), color: L.ink }}>{t.settingsTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), letterSpacing: ms(9) * 0.06, color: L.textDim }}>{t.code}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* language */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: L.textDim }}>{t.langOfCompliance}</Text>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 9 }}>
            <LangButton label="English" active={lang === 'en'} onPress={setL('en')} />
            <LangButton label="한국어" active={lang === 'ko'} onPress={setL('ko')} />
          </View>
          <View style={{ marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4fd08a' }} />
            <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(10), lineHeight: ms(10) * 1.5, color: L.textDim }}>{t.detectedNote}</Text>
          </View>
        </View>

        {/* program */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.12, color: L.textDim }}>{t.programWord}</Text>
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#dcd9cf', borderRadius: 13, overflow: 'hidden', backgroundColor: '#f4f3ee' }}>
            <ProgramRow title={t.reprocess} sub={t.reprocessSub} right={chevron} onPress={() => { void reprocess(); }} divider />
            <ProgramRow title={t.notif} sub={t.notifSub} right={<NotifToggle on={notif} onToggle={() => { void updateNotif(!notif); }} />} divider />
            <ProgramRow title={t.notifLog} sub={t.notifLogSub} right={chevron} onPress={() => setStep('notiflog')} divider={false} />
          </View>
        </View>

        {/* V.E.R.A. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={{ backgroundColor: '#17171a', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderLeftWidth: 3, borderLeftColor: '#ff6a1a' }}>
            <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(8), letterSpacing: ms(8) * 0.14, color: '#f4b43a', marginBottom: 5 }}>{t.veraKicker}</Text>
            <Text style={{ fontFamily: font('display', 500, lang), fontSize: ms(12), lineHeight: ms(12) * 1.55, color: '#f2e7d3' }}>{t.settingsVera}</Text>
          </View>
        </View>

        {/* footer */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.08, color: '#b3aea1' }}>{t.build}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
