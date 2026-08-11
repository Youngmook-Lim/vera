import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { T } from './strings';

// The ACCESS panel's replace-credential modal. Same input treatment as
// KeyGate — the password field, the rejection line — but centred over a
// dimmed stage rather than filling it, since she is already awake while this
// is open. Save routes through the same `activate` the gate uses, so a
// replacement is silent (spec: she does not notice a transplant) — `activate`
// only signals a *first* wake internally (`waking`), and returns true for any
// accepted key, first or not.
export function KeyPanel() {
  const lang = useFacilityStore((s) => s.lang);
  const activate = useFacilityStore((s) => s.activate);
  const removeKey = useFacilityStore((s) => s.removeKey);
  const setKeyPanel = useFacilityStore((s) => s.setKeyPanel);
  const t = T[lang];

  const [draft, setDraft] = useState('');
  const [rejected, setRejected] = useState(false);

  const onChangeText = (value: string) => {
    setDraft(value);
    setRejected(false);
  };

  const onCancel = () => {
    setDraft('');
    setRejected(false);
    setKeyPanel(false);
  };

  const onSave = async () => {
    const ok = await activate(draft);
    if (!ok) {
      setRejected(true);
      return;
    }
    setDraft('');
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          {/* ACCESS is the small mono eyebrow; her serif carries the question
              under it (4a) — the two were the wrong way round. */}
          <Text style={[styles.eyebrow, { fontFamily: font('mono', 500, lang) }]}>{t.access}</Text>
          <Text style={[styles.title, { fontFamily: serif(lang) }]}>{t.keyTitle}</Text>

          <View style={styles.inputRow}>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
            <TextInput
              style={[styles.input, { fontFamily: font('mono', 500, lang) }]}
              value={draft}
              onChangeText={onChangeText}
              placeholder={t.gatePh}
              placeholderTextColor={palette.textFaint}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void onSave()}
            />
          </View>
          {rejected ? (
            <Text style={[styles.error, { fontFamily: font('mono', 500, lang) }]}>
              {t.gateBad}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelText, { fontFamily: font('mono', 600, lang) }]}>
                {t.keyCancel}
              </Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={() => void onSave()}>
              <Text style={[styles.saveText, { fontFamily: font('mono', 600, lang) }]}>
                {t.keySave}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => void removeKey()} hitSlop={8}>
            <Text style={[styles.removeText, { fontFamily: font('mono', 600, lang) }]}>
              {t.keyRemove}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// 4a's ACCESS modal, verbatim.
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#080806cc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  // `padding:20px 18px 16px; gap:13px; radius 18; border #35322a`
  panel: {
    width: '100%',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderRadius: 18,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.hairline,
    gap: 13,
  },
  eyebrow: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.24,
    color: palette.textFaint,
  },
  title: {
    fontSize: ms(19),
    lineHeight: ms(19) * 1.34,
    color: palette.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 13,
    backgroundColor: palette.bgDeep,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 11,
  },
  chevron: {
    fontSize: ms(10),
    color: palette.textFaint,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: ms(12),
    letterSpacing: ms(12) * 0.06,
    color: palette.text,
  },
  error: {
    fontSize: ms(9),
    lineHeight: ms(9) * 1.6,
    color: palette.dangerSoft,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 9,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.borderLift,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.18,
    color: palette.textDim,
  },
  saveButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.amberEdge,
    backgroundColor: palette.amberWash,
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.18,
    color: palette.amber,
  },
  // the one control that destroys something: red, because that is the state
  // the design shows when you are about to press it
  removeText: {
    marginTop: 2,
    paddingVertical: 6,
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.16,
    color: palette.danger,
    textAlign: 'center',
  },
});
