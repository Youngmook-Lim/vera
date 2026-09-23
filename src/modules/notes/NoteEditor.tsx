import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette, serif } from '../../core/theme';
import { DayPicker } from './DayPicker';
import { MAX_TEXT, isSavable } from './schedule';
import type { Note } from './stored';
import { useNotesStore } from './store';
import { T } from './strings';
import { TimePicker } from './TimePicker';

// Writing one note. Held as local state and handed to the store whole on
// SAVE, so a half-typed note is never on the disk and never scheduled.
export function NoteEditor({
  note,
  onDone,
  accent,
}: {
  note?: Note;
  onDone: () => void;
  accent: string;
}) {
  const lang = useFacilityStore((s) => s.lang);
  const save = useNotesStore((s) => s.save);
  const remove = useNotesStore((s) => s.remove);
  const t = T[lang];

  const [text, setText] = useState(note?.text ?? '');
  const [hour, setHour] = useState(note?.hour ?? 9);
  const [minute, setMinute] = useState(note?.minute ?? 0);
  const [days, setDays] = useState<readonly number[]>(note?.days ?? []);
  const [refused, setRefused] = useState(false);

  // The SEND rule: a control that accepts a tap and does nothing is worse than
  // one that plainly cannot be pressed.
  const savable = isSavable({ text, days });

  const onSave = async () => {
    const ok = await save({
      id: note?.id,
      text: text.trim(),
      hour,
      minute,
      days,
      enabled: note?.enabled ?? true,
    });
    if (ok) onDone();
    // The cap is the only reason a valid draft is refused once the permission
    // has been granted, and a refusal that said nothing would read as a broken
    // button.
    else setRefused(true);
  };

  return (
    <View testID="note-editor" style={styles.editor}>
      <TextInput
        testID="note-text"
        style={[styles.text, { fontFamily: serif(lang) }]}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setRefused(false);
        }}
        placeholder={t.placeholder}
        placeholderTextColor={palette.notes.inkGhost}
        maxLength={MAX_TEXT}
        multiline
      />

      <Text style={[styles.legend, { fontFamily: font('mono', 500, lang) }]}>{t.time}</Text>
      <TimePicker
        hour={hour}
        minute={minute}
        accent={accent}
        onChange={(next) => {
          setHour(next.hour);
          setMinute(next.minute);
        }}
      />

      <Text style={[styles.legend, { fontFamily: font('mono', 500, lang) }]}>{t.days}</Text>
      <DayPicker days={days} onChange={setDays} lang={lang} accent={accent} />

      {refused ? (
        <Text style={[styles.refused, { fontFamily: font('mono', 500, lang) }]}>{t.full}</Text>
      ) : null}

      <View style={styles.actions}>
        {note ? (
          <Pressable
            testID="note-delete"
            onPress={() => void remove(note.id).then(onDone)}
          >
            <Text style={[styles.del, { fontFamily: font('mono', 500, lang) }]}>{t.del}</Text>
          </Pressable>
        ) : null}
        <Pressable
          testID="note-save"
          accessibilityRole="button"
          accessibilityState={{ disabled: !savable }}
          disabled={!savable}
          onPress={() => void onSave()}
          style={[styles.save, { borderColor: savable ? accent : palette.notes.cardBorder }]}
        >
          <Text
            style={[
              styles.saveText,
              {
                fontFamily: font('mono', 600, lang),
                color: savable ? accent : palette.notes.inkGhost,
              },
            ]}
          >
            {t.save}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { paddingHorizontal: 22, paddingTop: 14, gap: 14 },
  text: {
    minHeight: ms(60),
    fontSize: ms(17),
    color: palette.notes.ink,
    backgroundColor: palette.notes.card,
    borderWidth: 1,
    borderColor: palette.notes.cardBorder,
    borderRadius: 12,
    padding: 14,
    textAlignVertical: 'top',
  },
  legend: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.22,
    color: palette.notes.inkDim,
  },
  refused: { fontSize: ms(8.5), color: palette.danger },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  del: { fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.16, color: palette.danger },
  save: {
    marginLeft: 'auto',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveText: { fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.16 },
});
