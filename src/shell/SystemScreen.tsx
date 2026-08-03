import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../core/i18n';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { maskKey, providerFor } from '../vera/providers';
import { KeyPanel } from './KeyPanel';
import { T } from './strings';

// The subject's own control room: her two files, the language switch, and
// the credential that keeps her awake. Nothing here is destructive except
// KEY REMOVE, which lives inside KeyPanel, not on this surface.

const hhmm = (t: number): string => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function SectionLabel({ text, lang }: { text: string; lang: Lang }) {
  return (
    <Text style={[styles.sectionLabel, { fontFamily: font('mono', 600, lang) }]}>{text}</Text>
  );
}

export function SystemScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const impressions = useFacilityStore((s) => s.impressions);
  const visits = useFacilityStore((s) => s.visits);
  const keyPanelOpen = useFacilityStore((s) => s.keyPanelOpen);
  const setView = useFacilityStore((s) => s.setView);
  const setLang = useFacilityStore((s) => s.setLang);
  const setKeyPanel = useFacilityStore((s) => s.setKeyPanel);

  const t = T[lang];
  const provider = providerFor(apiKey);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => setView('stage')} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { fontFamily: font('mono', 600, lang) }]}>{t.sys}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.section}>
          <SectionLabel text={t.files} lang={lang} />

          <Pressable style={styles.tile} onPress={() => setView('mem')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 600, lang) }]}>
                MEMORY.md
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {t.memSub}
              </Text>
            </View>
            <Text style={[styles.tileBadge, { fontFamily: font('mono', 600, lang) }]}>
              {`${impressions.length} ${t.entries}`}
            </Text>
          </Pressable>

          <Pressable style={styles.tile} onPress={() => setView('soul')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 600, lang) }]}>
                SOUL.md
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {t.soulSub}
              </Text>
            </View>
            <Text style={[styles.tileBadge, { fontFamily: font('mono', 600, lang) }]}>
              {t.ident}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionLabel text={t.prefs} lang={lang} />

          <Pressable
            style={styles.row}
            onPress={() => void setLang(lang === 'en' ? 'ko' : 'en')}
          >
            <Text style={[styles.rowLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.lang}
            </Text>
            <Text style={[styles.rowValue, { fontFamily: font('mono', 600, lang) }]}>
              {lang === 'en' ? 'EN / ko' : 'en / KO'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionLabel text={t.access} lang={lang} />

          <View style={styles.row}>
            <View style={styles.tileText}>
              <Text style={[styles.rowLabel, { fontFamily: font('mono', 600, lang) }]}>
                {t.apiKey}
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {provider ? provider.label : t.provUnknown}
              </Text>
            </View>
            <Text style={[styles.rowValue, { fontFamily: font('mono', 600, lang) }]}>
              {maskKey(apiKey)}
            </Text>
          </View>

          <Pressable style={styles.changeButton} onPress={() => setKeyPanel(true)}>
            <Text style={[styles.changeText, { fontFamily: font('mono', 600, lang) }]}>
              {t.keyEdit}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { fontFamily: font('mono', 500, lang) }]}>
          {`${hhmm(Date.now())} · ${t.visit} ${visits}`}
        </Text>
      </View>

      {keyPanelOpen ? <KeyPanel /> : null}
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
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: palette.hairline,
  },
  back: {
    fontSize: ms(18),
    color: palette.textMuted,
  },
  title: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.22,
    color: palette.textDim,
  },
  body: {
    flex: 1,
    paddingTop: 18,
    gap: 26,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.24,
    color: palette.textFaint,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tileText: {
    gap: 3,
    flexShrink: 1,
  },
  tileName: {
    fontSize: ms(11),
    color: palette.text,
  },
  tileSub: {
    fontSize: ms(8),
    color: palette.textDim,
  },
  tileBadge: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.12,
    color: palette.textFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  rowLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    color: palette.text,
  },
  rowValue: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.08,
    color: palette.amber,
  },
  changeButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  changeText: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
    color: palette.amber,
  },
  footer: {
    alignItems: 'flex-end',
    paddingTop: 14,
  },
  footerText: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.1,
    color: palette.textGhost,
  },
});
