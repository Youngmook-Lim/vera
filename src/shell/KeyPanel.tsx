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
          <Text style={[styles.title, { fontFamily: serif(lang) }]}>{t.access}</Text>
          <Text style={[styles.subtitle, { fontFamily: font('mono', 500, lang) }]}>
            {t.keyTitle}
          </Text>

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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderRadius: 16,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  title: {
    fontSize: ms(19),
    color: palette.text,
  },
  subtitle: {
    fontSize: ms(9),
    color: palette.textDim,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: ms(11),
    color: palette.text,
  },
  error: {
    fontSize: ms(9),
    color: palette.dangerSoft,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: ms(9.5),
    letterSpacing: ms(9.5) * 0.12,
    color: palette.textMuted,
  },
  saveButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.amber,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    fontSize: ms(9.5),
    letterSpacing: ms(9.5) * 0.12,
    color: palette.amber,
  },
  removeText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.1,
    color: '#6c4a44',
    textAlign: 'center',
  },
});
