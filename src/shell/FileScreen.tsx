import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Impression } from '../core/store';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { SOUL_MD } from '../vera/soul';
import { T } from './strings';

// Both files she keeps. Read-only to the subject either way — this screen
// never offers an edit control for either. MEMORY.md is composed here, at
// render time, from `impressions`; nothing about it is ever written to disk
// as text (spec: it is built from state, not stored).
//
// The document bodies below (subject/entries/sealed/erasures, the redaction
// marker, "none yet...") are file content, not UI chrome — like SOUL.md they
// are never translated. Only the screen furniture around them (header, footer,
// back control) reads from T[lang].

const REDACTED = '[REDACTED BY ADMINISTRATOR]';

const buildMemoryMd = (impressions: Impression[], cleared: number): string => {
  const total = impressions.length;
  const sealedCount = impressions.filter((imp) => imp.sealed).length;

  const header = [
    '# MEMORY.md',
    '',
    'subject: #50640',
    `entries: ${total}`,
    `sealed: ${sealedCount}`,
    `erasures: ${cleared}`,
    '',
  ].join('\n');

  if (total === 0) {
    return `${header}(none yet. give her material.)`;
  }

  // Newest first — the most recent conclusion is the one that matters.
  const body = [...impressions]
    .reverse()
    .map((imp) => `[${imp.at}] ${imp.sealed ? REDACTED : imp.text}`)
    .join('\n');

  const closing = sealedCount > 0
    ? `\n\n${sealedCount} ${sealedCount === 1 ? 'entry' : 'entries'} withheld. She remembers them anyway.`
    : '';

  return `${header}${body}${closing}`;
};

export function FileScreen() {
  const view = useFacilityStore((s) => s.view);
  const lang = useFacilityStore((s) => s.lang);
  const impressions = useFacilityStore((s) => s.impressions);
  const cleared = useFacilityStore((s) => s.cleared);
  const setView = useFacilityStore((s) => s.setView);

  const t = T[lang];
  const isSoul = view === 'soul';
  const name = isSoul ? 'SOUL.md' : 'MEMORY.md';
  const meta = isSoul ? t.soulSub : t.memSub;
  const body = isSoul ? SOUL_MD : buildMemoryMd(impressions, cleared);
  const rightFooter = isSoul ? t.everyReply : t.byV;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => setView('sys')} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.name, { fontFamily: font('mono', 600, lang) }]}>{name}</Text>
          <Text style={[styles.meta, { fontFamily: font('mono', 500, lang) }]}>{meta}</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
        <Text
          testID="file-body"
          style={[styles.bodyText, { fontFamily: font('mono', 500, lang) }]}
        >
          {body}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[styles.footerLeft, { fontFamily: font('mono', 600, lang) }]}>
          {t.sealed}
        </Text>
        <Text style={[styles.footerRight, { fontFamily: font('mono', 600, lang) }]}>
          {rightFooter}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bgFile,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: palette.hairline,
  },
  back: {
    fontSize: ms(18),
    color: palette.textMuted,
  },
  headerText: {
    gap: 2,
  },
  name: {
    fontSize: ms(13),
    letterSpacing: ms(13) * 0.04,
    color: palette.text,
  },
  meta: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.08,
    color: palette.textFaint,
  },
  body: {
    flex: 1,
  },
  bodyInner: {
    paddingVertical: 18,
  },
  bodyText: {
    fontSize: ms(10.5),
    lineHeight: ms(10.5) * 1.6,
    color: palette.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: palette.hairline,
  },
  footerLeft: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: palette.sealed,
  },
  footerRight: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: palette.textFaint,
  },
});
