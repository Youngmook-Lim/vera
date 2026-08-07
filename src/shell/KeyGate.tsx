import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { T } from './strings';

// The doc's copy never names a provider — she does not deal in vendors — but a
// gate that refuses a key has to say what shape it wants (spec §9). This is a
// human-facing order and deliberately does NOT mirror PROVIDERS in
// src/vera/providers.ts, whose order encodes regex-match precedence (DeepSeek
// before OpenAI, since its pattern is a strict subset) rather than
// presentation.
const ROUTES = 'ANTHROPIC · OPENROUTER · OPENAI · DEEPSEEK · GROQ · GOOGLE';

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

const styles = StyleSheet.create({
  panel: {
    marginBottom: 14,
    padding: 18,
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
  button: {
    borderWidth: 1,
    borderColor: palette.amber,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: ms(9.5),
    letterSpacing: ms(9.5) * 0.12,
    color: palette.amber,
  },
  body: {
    fontSize: ms(8.5),
    lineHeight: ms(8.5) * 1.5,
    color: palette.textDim,
  },
  routes: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.16,
    color: palette.textGhostest,
  },
});
