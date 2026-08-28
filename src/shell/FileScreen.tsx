import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExtractRecord, PromptRecord } from '../core/store';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import type { Memory } from '../vera/memory';
import { SOUL_MD } from '../vera/soul';
import { T } from './strings';

// Both files she keeps, shown as they actually are. These two screens are a
// developer's window onto her state, not a part of the fiction: nothing here is
// withheld, dressed up or translated.
//
// RECORD is composed here, at render time, from her memory; nothing about it
// is ever written to disk as text (spec: it is built from state, not stored).
// It shows the whole record — not the selection she is sent, which the PROMPT
// screen carries instead.
//
// Only the screen furniture (header, footer, back control) reads from T[lang].

// A raw present on a `fallback` outcome means the model answered and could not
// be parsed; a null raw means the call threw before answering.
//
// A reply that arrived and a call that threw are the same blank on the stage,
// and telling them apart is the whole reason this screen exists. When nothing
// arrived, the provider's own sentence is the only thing that says why — an
// exhausted account, a retired model and a dead socket all land here and used
// to read identically.
const rawSection = (raw: string | null, failure: string | null): string[] => {
  if (raw !== null) return ['--- RAW REPLY ---', raw];
  return [
    '--- NO REPLY ---',
    failure ?? '(the request failed before a reply arrived)',
  ];
};

// The last reply's request, exactly as it went out. Not a document she keeps —
// a developer's transcript of one round trip, so the prompt can be read rather
// than inferred from what she said. The credential never appears: it travels
// in the request headers, never in the prompt.
//
// Every turn is printed, in the order they were sent. The composed prompt is
// only the last of them, and the conversation ahead of it went to the provider
// just as literally.
const buildReplyMd = (p: PromptRecord | null): string => {
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

  const turns = p.turns ?? [];
  const sent = [
    `--- SYSTEM (${p.system?.length ?? 0} chars) ---`,
    p.system ?? '(none)',
    '',
    ...(turns.length === 0
      ? ['--- TURNS (0) ---', '(none)', '']
      : turns.flatMap((turn, i) => [
        `--- TURN ${i + 1}/${turns.length} ${turn.role.toUpperCase()} (${turn.text.length} chars) ---`,
        turn.text,
        '',
      ])),
    ...rawSection(p.raw, p.failure),
  ].join('\n');

  return `${head}${sent}`;
};

// The second call, and the only window onto it. Extraction writes her file and
// says nothing on the stage whatever happens to it, so a failure is printed
// here as fully as a success.
const buildExtractMd = (x: ExtractRecord | null): string => {
  const head = '# LAST EXTRACTION\n\n';
  if (!x) return `${head}(no extraction has run yet this session)`;

  return head + [
    `at: ${new Date(x.at).toISOString()}`,
    `route: ${x.route || 'none'}`,
    `model: ${x.model || 'none'}`,
    `outcome: ${x.outcome}`,
    '',
    `--- SYSTEM (${x.system.length} chars) ---`,
    x.system,
    '',
    `--- USER (${x.user.length} chars) ---`,
    x.user,
    '',
    ...rawSection(x.raw, x.failure),
  ].join('\n');
};

// Two calls, two sections, one screen. Both are readable at once: extraction
// fires seconds after a reply, and a screen that showed only the newer request
// would never once show the one that produced the line on the stage.
const buildPromptMd = (p: PromptRecord | null, x: ExtractRecord | null): string =>
  `${buildReplyMd(p)}\n\n\n${buildExtractMd(x)}`;

// The whole record, as it actually is — not the selection she was sent. The
// PROMPT screen already shows what went out, so this stays the ground truth
// (continuity §6). Nothing is hidden: expired facts and resolved threads are
// marked and kept.
const buildMemoryMd = (memory: Memory, cleared: number): string => {
  const { facts, verdicts, threads } = memory;
  const total = facts.length + verdicts.length + threads.length;

  const header = [
    '# RECORD',
    '',
    `facts: ${facts.length}`,
    `verdicts: ${verdicts.length}`,
    `threads: ${threads.length}`,
    `pending: ${memory.pending.length}`,
    `erasures: ${cleared}`,
    '',
  ].join('\n');

  if (total === 0) return `${header}(empty)`;

  const now = Date.now();
  const body = [
    ...facts.map((f) => {
      const expired = !f.durable && f.until !== null && f.until <= now;
      return `[${f.id}] ${expired ? 'EXPIRED ' : ''}${f.text}  {${f.keys.join(' ')}}`;
    }),
    ...verdicts.map((v) =>
      `[${v.id}] ${v.wasAt ? `${v.wasAt} ` : ''}×${v.count}  ${v.text}`),
    ...threads.map((t) => `[${t.id}] ${t.resolved ? 'RESOLVED ' : ''}${t.text}`),
  ].join('\n');

  return `${header}${body}`;
};

export function FileScreen() {
  const insets = useSafeAreaInsets();
  const view = useFacilityStore((s) => s.view);
  const lang = useFacilityStore((s) => s.lang);
  const memory = useFacilityStore((s) => s.memory);
  const cleared = useFacilityStore((s) => s.cleared);
  const lastPrompt = useFacilityStore((s) => s.lastPrompt);
  const lastExtract = useFacilityStore((s) => s.lastExtract);
  const setView = useFacilityStore((s) => s.setView);

  const t = T[lang];
  // Three documents, one reader. Named rather than nested ternaries now that
  // there is more than one axis of difference between them.
  const doc = view === 'soul'
    ? { name: 'SOUL.md', meta: t.soulSub, body: SOUL_MD, footer: t.everyReply }
    : view === 'prompt'
      ? {
        name: 'PROMPT',
        meta: t.promptSub,
        body: buildPromptMd(lastPrompt, lastExtract),
        footer: t.sessionOnly,
      }
      : { name: 'RECORD', meta: t.memSub, body: buildMemoryMd(memory, cleared), footer: t.byV };
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
