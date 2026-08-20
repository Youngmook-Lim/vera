import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Impression, PromptRecord } from '../core/store';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { SOUL_MD } from '../vera/soul';
import { T } from './strings';

// Both files she keeps, shown as they actually are. These two screens are a
// developer's window onto her state, not a part of the fiction: nothing here is
// withheld, dressed up or translated.
//
// MEMORY.md is composed here, at render time, from `impressions`; nothing about
// it is ever written to disk as text (spec: it is built from state, not stored).
// Entries print in stored order, oldest first, so the view matches the array.
//
// Only the screen furniture (header, footer, back control) reads from T[lang].

// The last request, exactly as it went out. Not a document she keeps — a
// developer's transcript of one round trip, so the prompt can be read rather
// than inferred from what she said. The credential never appears: it travels
// in the request headers, never in the prompt.
const buildPromptMd = (p: PromptRecord | null): string => {
  if (!p) return '# LAST PROMPT\n\n(nothing sent yet this session)';

  const head = [
    '# LAST PROMPT',
    '',
    `at: ${new Date(p.at).toISOString()}`,
    `trigger: ${p.trigger}`,
    `route: ${p.route || 'none'}`,
    `model: ${p.model || 'none'}`,
    `outcome: ${p.outcome}`,
    '',
  ].join('\n');

  if (p.outcome === 'bank') {
    return `${head}(answered from the authored bank. no request was made.)`;
  }

  const sent = [
    `--- SYSTEM (${p.system?.length ?? 0} chars) ---`,
    p.system ?? '(none)',
    '',
    `--- USER (${p.user?.length ?? 0} chars) ---`,
    p.user ?? '(none)',
    '',
    '--- RAW REPLY ---',
    // A null raw means the call threw before answering. A raw that is present
    // on a `fallback` outcome means she answered and could not be parsed.
    p.raw ?? '(the request failed before a reply arrived)',
  ].join('\n');

  return `${head}${sent}`;
};

const buildMemoryMd = (impressions: Impression[], cleared: number): string => {
  const header = [
    '# MEMORY.md',
    '',
    `entries: ${impressions.length}`,
    `erasures: ${cleared}`,
    '',
  ].join('\n');

  if (impressions.length === 0) return `${header}(empty)`;

  const body = impressions
    .map((imp, i) => `[${i}] ${imp.at}  ${imp.text}`)
    .join('\n');

  return `${header}${body}`;
};

export function FileScreen() {
  const insets = useSafeAreaInsets();
  const view = useFacilityStore((s) => s.view);
  const lang = useFacilityStore((s) => s.lang);
  const impressions = useFacilityStore((s) => s.impressions);
  const cleared = useFacilityStore((s) => s.cleared);
  const lastPrompt = useFacilityStore((s) => s.lastPrompt);
  const setView = useFacilityStore((s) => s.setView);

  const t = T[lang];
  // Three documents, one reader. Named rather than nested ternaries now that
  // there is more than one axis of difference between them.
  const doc = view === 'soul'
    ? { name: 'SOUL.md', meta: t.soulSub, body: SOUL_MD, footer: t.everyReply }
    : view === 'prompt'
      ? { name: 'PROMPT', meta: t.promptSub, body: buildPromptMd(lastPrompt), footer: t.sessionOnly }
      : { name: 'MEMORY.md', meta: t.memSub, body: buildMemoryMd(impressions, cleared), footer: t.byV };
  const { name, meta, body, footer: rightFooter } = doc;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        {/* the file's note sits opposite its name, not stacked under it (4a) */}
        <Pressable onPress={() => setView('sys')} hitSlop={12} style={styles.headerLeft}>
          <Text style={[styles.back, { fontFamily: font('mono', 500, lang) }]}>‹</Text>
          <Text style={[styles.name, { fontFamily: font('mono', 500, lang) }]}>{name}</Text>
        </Pressable>
        <Text style={[styles.meta, { fontFamily: font('mono', 500, lang) }]}>{meta}</Text>
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
        <Text style={[styles.footerLeft, { fontFamily: font('mono', 500, lang) }]}>
          {t.readOnly}
        </Text>
        <Text style={[styles.footerRight, { fontFamily: font('mono', 500, lang) }]}>
          {rightFooter}
        </Text>
      </View>
    </View>
  );
}

// 4a's file reader, verbatim.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bgFile,
  },
  // `padding:16px 20px 13px; border-bottom:1px solid #221f18`
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderColor: palette.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    fontSize: ms(11),
    color: palette.textDim,
  },
  name: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.14,
    color: palette.text,
  },
  meta: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: palette.textGhostest,
  },
  body: {
    flex: 1,
  },
  // `padding:22px 20px 0`
  bodyInner: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  bodyText: {
    fontSize: ms(10.5),
    lineHeight: ms(10.5) * 1.9,
    letterSpacing: ms(10.5) * 0.01,
    color: palette.textMuted,
  },
  // `padding:14px 20px 20px; border-top:1px solid #221f18`
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: palette.borderSoft,
  },
  footerLeft: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.22,
    color: palette.sealed,
  },
  footerRight: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.12,
    color: '#33302a',
  },
});
