import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notifStrings } from '../../core/notifications';
import { useFacilityStore } from '../../core/store';
import { font, ms } from '../../core/theme';
import { CARDS, notiflogStrings, type NotifCard } from './strings';

function TransmissionCard({ card, lang, onComply }: { card: NotifCard; lang: 'en' | 'ko'; onComply: () => void }) {
  const m = notifStrings[lang];
  const c = notiflogStrings[lang];
  const big = card.size === 'big';
  const avatar = big ? 30 : 22;
  const dot = big ? 11 : 8;

  return (
    <View
      style={{
        backgroundColor: big ? '#201f1b' : '#1c1b17',
        borderWidth: 1,
        borderColor: card.remain ? '#ff6a1a44' : '#2c2a22',
        borderRadius: big ? 24 : 20,
        paddingVertical: big ? 14 : 11,
        paddingHorizontal: 15,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: avatar, height: avatar, borderRadius: big ? 9 : 7, backgroundColor: '#17171a', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: card.dot }} />
        </View>
        <Text style={{ flex: 1, fontFamily: font('mono', 500, lang), fontSize: ms(big ? 10 : 9.5), color: '#8a8578' }}>
          {`${m[card.senderKey]} · ${card.time}`}
        </Text>
        {card.remain ? <Text style={{ fontFamily: font('mono', 600), fontSize: ms(9), letterSpacing: ms(9) * 0.08, color: '#ff5a48' }}>{c.nRemain}</Text> : null}
      </View>

      {card.titleKey ? (
        <Text style={{ marginTop: 10, fontFamily: font('display', 700, lang), fontSize: ms(13.5), color: '#f4efe2' }}>{m[card.titleKey]}</Text>
      ) : null}
      <Text style={{ marginTop: card.titleKey ? 5 : 7, fontFamily: font('display', 500, lang), fontSize: ms(big ? 12 : 11.5), lineHeight: ms(big ? 12 : 11.5) * 1.5, color: '#b9b09a' }}>
        {m[card.bodyKey]}
      </Text>

      {card.comply || card.defer ? (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 18 }}>
          {card.comply ? (
            <Pressable onPress={onComply} accessibilityRole="button">
              <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.06, color: card.remain ? '#ff8a4a' : '#f4b43a' }}>{c.nComply}</Text>
            </Pressable>
          ) : null}
          {card.defer ? (
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.06, color: '#8a8578' }}>{c.nDefer}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function NotifLogScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const setStep = useFacilityStore((s) => s.setStep);
  const insets = useSafeAreaInsets();
  const c = notiflogStrings[lang];

  return (
    <View style={{ flex: 1, backgroundColor: '#131211', paddingTop: insets.top }}>
      {/* sticky header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#26251f' }}>
        <Pressable hitSlop={16} onPress={() => setStep('settings')} accessibilityRole="button" accessibilityLabel="back" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: font('display', 600), fontSize: ms(15), color: '#8a8578' }}>◂</Text>
          <Text style={{ fontFamily: font('display', 600, lang), fontSize: ms(10), color: '#f4efe2' }}>{c.notifLogTitle}</Text>
        </Pressable>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: '#57534a' }}>{c.notifLogDate}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: insets.bottom + 22, gap: 8 }}>
        {CARDS.map((card) => (
          <TransmissionCard key={card.time} card={card} lang={lang} onComply={() => setStep('daily')} />
        ))}
        <Text style={{ textAlign: 'center', fontFamily: font('mono', 500, lang), fontSize: ms(9), letterSpacing: ms(9) * 0.08, color: '#57534a', paddingTop: 6 }}>{c.nFooter}</Text>
      </ScrollView>
    </View>
  );
}
