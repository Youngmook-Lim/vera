import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { T } from './strings';

// The doc's copy never names a provider — she does not deal in vendors — but a
// gate that refuses a key has to say what shape it wants (spec §9). This is a
// human-facing order and deliberately does NOT mirror PROVIDERS in
// src/vera/providers.ts, whose order encodes regex-match precedence (anthropic
// and openrouter before openai, since both satisfy its pattern too) rather
// than presentation.
const ROUTES = 'ANTHROPIC · OPENROUTER · OPENAI · DEEPSEEK · GOOGLE';

// Replaces Stage's input row and drawer handle while she is dormant. There is
// no verification step here: a key whose shape matches a route gets in, and a
// wrong one reveals itself when she fails to answer (spec §10).
export function KeyGate() {
  const lang = useFacilityStore((s) => s.lang);
  const activate = useFacilityStore((s) => s.activate);
  const t = T[lang];

  const [draft, setDraft] = useState('');
  const [rejected, setRejected] = useState(false);

  const onChangeText = (value: string) => {
    setDraft(value);
    setRejected(false);
  };

  const onSubmit = async () => {
    const ok = await activate(draft);
    if (!ok) setRejected(true);
  };

  return (
    <View style={styles.panel}>
      <Text style={[styles.title, { fontFamily: serif(lang) }]}>{t.gateTitle}</Text>
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
          onSubmitEditing={onSubmit}
        />
      </View>
      {rejected ? (
        <Text style={[styles.error, { fontFamily: font('mono', 500, lang) }]}>{t.gateBad}</Text>
      ) : null}
      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={[styles.buttonText, { fontFamily: font('mono', 600, lang) }]}>
          {t.gateBtn}
        </Text>
      </Pressable>
      <Text style={[styles.body, { fontFamily: font('mono', 500, lang) }]}>{t.gateBody}</Text>
      <Text style={[styles.routes, { fontFamily: font('mono', 500, lang) }]}>{ROUTES}</Text>
    </View>
  );
}

// 4a's dormant panel, verbatim.
const styles = StyleSheet.create({
  // `margin:0 18px 18px; padding:17px 17px 15px`
  panel: {
    marginHorizontal: 18,
    marginBottom: 18,
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 15,
    borderRadius: 16,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  title: {
    fontSize: ms(19),
    lineHeight: ms(19) * 1.34,
    color: palette.textSoft,
  },
  // `padding:12px 13px; background:#131210; border 1px; radius 11; gap 10`
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
  // a filled amber wash under a soft amber edge, both at hover strength
  button: {
    borderWidth: 1,
    borderColor: palette.amberEdge,
    backgroundColor: palette.amberWash,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.2,
    color: palette.amber,
  },
  body: {
    fontSize: ms(8.5),
    lineHeight: ms(8.5) * 1.7,
    color: palette.textGhost,
  },
  routes: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: palette.textGhostest,
  },
});
