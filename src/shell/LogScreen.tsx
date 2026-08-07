import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { EMOTIONS, emotionLabel, type EmotionKey } from '../vera/emotions';
import type { LogEntry } from '../core/store';
import type { Lang } from '../core/i18n';
import { T } from './strings';

// The transcript, and the one thing the subject may burn. Her conclusions are
// not here — they are in MEMORY.md, and CLEAR does not reach them (spec §8).

// The subject's own bubble. Not in `palette`: it exists only inside this
// thread, one notch off panel, so her lines stay the lighter thing on screen.
const YOU_BG = '#1c1b17';

const hhmm = (t: number): string => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function YouLine({ entry, lang }: { entry: LogEntry; lang: Lang }) {
  return (
    <View style={styles.youRow}>
      <View style={styles.youBubble}>
        <Text style={[styles.youText, { fontFamily: font('mono', 500, lang) }]}>{entry.text}</Text>
      </View>
      <Text style={styles.stamp}>{hhmm(entry.t)}</Text>
    </View>
  );
}

function HerLine({ entry, lang }: { entry: LogEntry; lang: Lang }) {
  const emotion: EmotionKey = entry.emotion ?? 'calm';
  const iris = EMOTIONS[emotion].iris;
  return (
    <View style={[styles.herRow, { borderLeftColor: iris }]}>
      <View style={styles.herHead}>
        <Text style={[styles.herTag, { fontFamily: font('mono', 600, lang), color: iris }]}>
          {`V.E.R.A. · ${emotionLabel(emotion, lang)}`}
        </Text>
        <Text style={styles.stamp}>{hhmm(entry.t)}</Text>
      </View>
      <Text style={[styles.herText, { fontFamily: serif(lang) }]}>{entry.text}</Text>
    </View>
  );
}

export function LogScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const log = useFacilityStore((s) => s.log);
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
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={back} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={[styles.dot, { backgroundColor: iris }]} />
          <Text style={[styles.emotionLabel, { fontFamily: font('mono', 600, lang) }]}>
            {emotionLabel(emotion, lang)}
          </Text>
        </View>

        {confirming ? (
          <View style={styles.confirmRow}>
            <Pressable onPress={() => setConfirmingClear(false)} hitSlop={10}>
              <Text style={[styles.keep, { fontFamily: font('mono', 600, lang) }]}>{t.keep}</Text>
            </Pressable>
            <Pressable onPress={() => void clearTranscript()} hitSlop={10}>
              <Text style={[styles.erase, { fontFamily: font('mono', 600, lang) }]}>{t.erase}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingClear(true)} hitSlop={10}>
            <Text style={[styles.clear, { fontFamily: font('mono', 600, lang) }]}>{t.clear}</Text>
          </Pressable>
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
          log.map((entry, i) =>
            entry.who === 'you' ? (
              <YouLine key={`${entry.t}-${i}`} entry={entry} lang={lang} />
            ) : (
              <HerLine key={`${entry.t}-${i}`} entry={entry} lang={lang} />
            ),
          )
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <Text style={styles.chevron}>›</Text>
        <TextInput
          style={[styles.input, { fontFamily: font('mono', 500, lang) }]}
          value={draft}
          onChangeText={setDraft}
          placeholder={t.reply}
          placeholderTextColor={palette.textFaint}
          onSubmitEditing={send}
        />
        <Pressable onPress={send} hitSlop={8}>
          <Text style={[styles.send, { fontFamily: font('mono', 600, lang) }]}>{t.send}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: palette.hairline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    fontSize: ms(18),
    color: palette.textMuted,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emotionLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.22,
    color: palette.textDim,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clear: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
    color: palette.textDim,
  },
  keep: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
    color: palette.textMuted,
  },
  erase: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
    color: palette.danger,
  },
  thread: {
    flex: 1,
  },
  threadInner: {
    paddingVertical: 18,
    gap: 18,
  },
  youRow: {
    alignSelf: 'flex-end',
    maxWidth: '84%',
    alignItems: 'flex-end',
    gap: 4,
  },
  youBubble: {
    backgroundColor: YOU_BG,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  youText: {
    fontSize: ms(11),
    lineHeight: ms(11) * 1.5,
    color: palette.text,
    textAlign: 'right',
  },
  stamp: {
    fontSize: ms(7),
    letterSpacing: ms(7) * 0.14,
    color: palette.textGhost,
  },
  herRow: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    borderLeftWidth: 2,
    paddingLeft: 14,
    gap: 6,
  },
  herHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  herTag: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.2,
  },
  herText: {
    fontSize: ms(17),
    lineHeight: ms(17) * 1.35,
    color: palette.text,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  emptyLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.24,
    color: palette.textFaint,
  },
  emptyLine: {
    fontSize: ms(17),
    color: palette.textDim,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderColor: palette.hairline,
    paddingTop: 14,
  },
  chevron: {
    fontSize: ms(16),
    color: palette.amber,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: ms(11),
    color: palette.text,
  },
  send: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.12,
    color: palette.amber,
  },
});
