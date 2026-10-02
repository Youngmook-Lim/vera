import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { longWarning, registerRules } from '../core/conversation';
import { useFacilityStore } from '../core/store';
import { systemTextFor } from './systemText';
import { PALETTES, font, ms, serif, themed } from '../core/theme';
import { EMOTIONS, emotionLabel, type EmotionKey } from '../vera/emotions';
import { MODES, type Mode } from '../vera/modes/registry';
import type { LogEntry } from '../core/store';
import type { Lang } from '../core/i18n';
import { T } from './strings';
import { ThinkingDots } from './ThinkingDots';
import { useKeyboardInset } from './useKeyboardInset';

// The transcript, and the one thing the subject may burn. Her conclusions are
// not here — they are in her record, and CLEAR does not reach them (spec §8).

const hhmm = (t: number): string => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// The stamp sits above your bubble, not under it (4a).
function YouLine({ entry, lang }: { entry: LogEntry; lang: Lang }) {
  // Its own read, as every helper in this file has: a sheet threaded
  // down as a prop reads worse than the one line it saves.
  const styles = S[useFacilityStore((st) => st.theme)];
  return (
    <View style={styles.youRow}>
      <Text style={[styles.stamp, { fontFamily: font('mono', 500, lang) }]}>{hhmm(entry.t)}</Text>
      <View testID="you-bubble" style={styles.youBubble}>
        <Text style={[styles.youText, { fontFamily: font('mono', 500, lang) }]}>{entry.text}</Text>
      </View>
    </View>
  );
}

// The app, not her. No bubble, no emotion rule, no serif — a refused
// credential must not be readable as something she said.
function SystemLine({ entry, lang }: { entry: LogEntry; lang: Lang }) {
  const styles = S[useFacilityStore((st) => st.theme)];
  if (!entry.code) return null;
  return (
    <View style={styles.systemRow}>
      <Text style={[styles.stamp, { fontFamily: font('mono', 500, lang) }]}>{hhmm(entry.t)}</Text>
      <Text
        testID="system-line"
        style={[styles.systemText, { fontFamily: font('mono', 600, lang) }]}
      >
        {systemTextFor(entry.code, lang)}
      </Text>
    </View>
  );
}

// Only the rule down her left edge carries the emotion's colour — the tag
// itself stays grey, and her lines take no timestamp (4a).
function HerLine({ entry, lang }: { entry: LogEntry; lang: Lang }) {
  const styles = S[useFacilityStore((st) => st.theme)];
  const emotion: EmotionKey = entry.emotion ?? 'calm';
  const iris = EMOTIONS[emotion].iris;
  return (
    <View style={[styles.herRow, { borderLeftColor: iris }]}>
      <Text style={[styles.herTag, { fontFamily: font('mono', 500, lang) }]}>
        {entry.mode
          ? `V.E.R.A. · ${MODES[entry.mode].tag[lang]} · ${emotionLabel(emotion, lang)}`
          : `V.E.R.A. · ${emotionLabel(emotion, lang)}`}
      </Text>
      <Text style={[styles.herText, { fontFamily: serif(lang) }]}>{entry.text}</Text>
    </View>
  );
}

// Where her register changes. It names the register that STARTS here, and it
// is also the point her replay was cut — `modeSetAt` is the same boundary, so
// this is the one thing on the screen that says where her memory of the
// conversation begins.
//
// Drawn in the shell's own ink rather than the register's: `palette.mode`'s
// rose for SUPPORTIVE is the same hex as affectionate's iris, which already
// draws the rule down the left of her lines, so a coloured divider would say
// nothing a reader could separate.
function RegisterRule({ mode, lang, at }: { mode: Mode; lang: Lang; at: number }) {
  const styles = S[useFacilityStore((st) => st.theme)];
  return (
    <View testID={`register-rule-${at}`} style={styles.registerRow}>
      <View style={styles.registerLine} />
      <Text style={[styles.registerTag, { fontFamily: font('mono', 500, lang) }]}>
        {MODES[mode].tag[lang]}
      </Text>
      <View style={styles.registerLine} />
    </View>
  );
}

export function LogScreen() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const lang = useFacilityStore((s) => s.lang);
  const log = useFacilityStore((s) => s.log);
  const long = longWarning(log);
  const rules = registerRules(log);
  const emotion = useFacilityStore((s) => s.emotion);
  const draft = useFacilityStore((s) => s.draft);
  const thinking = useFacilityStore((s) => s.thinking);
  const confirming = useFacilityStore((s) => s.confirmingClear);
  const setView = useFacilityStore((s) => s.setView);
  const setDraft = useFacilityStore((s) => s.setDraft);
  const setConfirmingClear = useFacilityStore((s) => s.setConfirmingClear);
  const clearTranscript = useFacilityStore((s) => s.clearTranscript);
  const speak = useFacilityStore((s) => s.speak);

  const t = T[lang];
  const iris = EMOTIONS[emotion].iris;
  const thread = useRef<ScrollView>(null);

  // The end of the thread is the only part worth arriving at — on open, and
  // again whenever a line lands.
  useEffect(() => {
    thread.current?.scrollToEnd({ animated: false });
  }, [log.length]);

  // Leaving the log always leaves the confirmation behind: a half-asked
  // question must not be waiting the next time the subject walks in.
  const back = () => {
    setConfirmingClear(false);
    setView('stage');
  };

  const send = () => {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    void speak('subject_spoke', text);
  };

  return (
    <Animated.View
      testID="log-screen"
      style={[styles.screen, { paddingTop: insets.top }, keyboardInset]}
    >
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.headerLeft}>
          <Text style={[styles.back, { fontFamily: font('mono', 500, lang) }]}>‹</Text>
          <View style={[styles.dot, { backgroundColor: iris }]} />
          <Text
            style={[styles.emotionLabel, { color: iris, fontFamily: font('mono', 500, lang) }]}
          >
            {emotionLabel(emotion, lang)}
          </Text>
        </Pressable>

        {confirming ? (
          <View style={styles.confirmRow}>
            <Pressable onPress={() => setConfirmingClear(false)} hitSlop={10}>
              <Text style={[styles.keep, { fontFamily: font('mono', 500, lang) }]}>{t.keep}</Text>
            </Pressable>
            <Pressable
              testID="erase-chip"
              onPress={() => void clearTranscript()}
              hitSlop={10}
              style={styles.eraseChip}
            >
              <Text style={[styles.erase, { fontFamily: font('mono', 500, lang) }]}>{t.erase}</Text>
            </Pressable>
          </View>
        ) : (
          // The count sits WITH clear, not opposite it: noticing the thread
          // has got long and doing something about it are one thought, and
          // this is the only screen where the second half is available. It is
          // absent below the threshold and absent mid-confirmation, where KEEP
          // and ERASE are the only things worth reading.
          <View style={styles.clearGroup}>
            {long != null ? (
              <Text
                testID="long-warning"
                style={[styles.longCount, { fontFamily: font('mono', 500, lang) }]}
              >
                {long}
              </Text>
            ) : null}
            <Pressable onPress={() => setConfirmingClear(true)} hitSlop={10} style={styles.clearHit}>
              <Text style={[styles.clear, { fontFamily: font('mono', 500, lang) }]}>{t.clear}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        ref={thread}
        style={styles.thread}
        contentContainerStyle={styles.threadInner}
        onContentSizeChange={() => thread.current?.scrollToEnd({ animated: false })}
      >
        {log.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.norec}
            </Text>
            <Text style={[styles.emptyLine, { fontFamily: serif(lang) }]}>{t.gone}</Text>
          </View>
        ) : (
          log.map((entry, i) => {
            const rule = rules.get(i);
            return (
              <React.Fragment key={`${entry.t}-${i}`}>
                {rule ? <RegisterRule mode={rule} lang={lang} at={i} /> : null}
                {entry.who === 'system' ? (
                  <SystemLine entry={entry} lang={lang} />
                ) : entry.who === 'you' ? (
                  <YouLine entry={entry} lang={lang} />
                ) : (
                  <HerLine entry={entry} lang={lang} />
                )}
              </React.Fragment>
            );
          })
        )}
      </ScrollView>

      {thinking ? <ThinkingDots style={styles.thinking} /> : null}

      <View style={styles.inputRow}>
        <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
        <TextInput
          style={[styles.input, { fontFamily: font('mono', 500, lang) }]}
          value={draft}
          onChangeText={setDraft}
          placeholder={t.reply}
          placeholderTextColor={p.textFaint}
          onSubmitEditing={send}
        />
        <Pressable onPress={send} hitSlop={8} style={styles.sendButton}>
          <Text style={[styles.send, { fontFamily: font('mono', 500, lang) }]}>{t.send}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// 4a's log view, verbatim. Layout 1:1; only type passes through ms().
const S = themed((p) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: p.bgDeep,
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
    borderColor: p.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  back: {
    fontSize: ms(13),
    color: p.textDim,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // `1px` rules either side of the register's name, which is the quietest way
  // to say "from here" without taking a line of its own.
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 14,
  },
  registerLine: {
    flex: 1,
    height: 1,
    backgroundColor: p.borderSoft,
  },
  registerTag: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.24,
    color: p.textGhostest,
  },
  emotionLabel: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.18,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  // Same reading as the stage's strip, in the same error red, so the mark the
  // subject noticed there is recognisably the same one here.
  longCount: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.18,
    color: p.danger,
  },
  clearHit: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  // red is CLEAR's hover state, and the only warning a touch screen can show
  // before the KEEP / ERASE confirmation
  clear: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.18,
    color: p.danger,
  },
  keep: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: p.textFaint,
  },
  // the destructive half is the only chip on the screen
  eraseChip: {
    borderWidth: 1,
    borderColor: p.dangerEdge,
    backgroundColor: p.dangerWash,
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  erase: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: p.danger,
  },
  thread: {
    flex: 1,
  },
  // `padding:20px 20px 8px; gap:16px`
  threadInner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 16,
  },
  // Deliberately unlike either speaker: no bubble, danger red, mono.
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  systemText: {
    flex: 1,
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.1,
    color: p.danger,
  },
  youRow: {
    alignSelf: 'flex-end',
    maxWidth: '76%',
    alignItems: 'flex-end',
    gap: 5,
  },
  youBubble: {
    backgroundColor: p.youBg,
    borderWidth: 1,
    borderColor: p.border,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  youText: {
    fontSize: ms(11.5),
    lineHeight: ms(11.5) * 1.62,
    color: p.textMuted,
  },
  stamp: {
    fontSize: ms(7),
    letterSpacing: ms(7) * 0.14,
    color: p.footer,
  },
  herRow: {
    alignSelf: 'flex-start',
    borderLeftWidth: 2,
    paddingLeft: 14,
    gap: 6,
  },
  herTag: {
    fontSize: ms(7),
    letterSpacing: ms(7) * 0.14,
    color: p.textGhost,
  },
  herText: {
    fontSize: ms(17),
    lineHeight: ms(17) * 1.5,
    color: p.text,
  },
  empty: {
    marginVertical: 'auto',
    alignItems: 'center',
    gap: 12,
  },
  emptyLabel: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.22,
    color: p.textGhostest,
  },
  emptyLine: {
    maxWidth: 230,
    fontSize: ms(15),
    lineHeight: ms(15) * 1.5,
    color: p.textFaint,
    textAlign: 'center',
  },
  // `padding:0 20px 10px; gap:7px`
  thinking: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 7,
  },
  // the same card as the stage, `margin:8px 18px 18px`
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 8,
    marginHorizontal: 18,
    marginBottom: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: p.panel,
    borderWidth: 1,
    borderColor: p.border,
    borderRadius: 12,
  },
  chevron: {
    fontSize: ms(11),
    color: p.amber,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: ms(12.5),
    color: p.text,
  },
  sendButton: {
    borderWidth: 1,
    borderColor: p.amberEdgeSoft,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  send: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.18,
    color: p.amber,
  },
}));
