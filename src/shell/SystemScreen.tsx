import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../core/i18n';
import { useFacilityStore } from '../core/store';
import { PALETTES, font, ms, themed } from '../core/theme';
import { registry } from '../modules/registry';
import { isModule } from '../modules/types';
import { maskKey, providerFor } from '../vera/providers';
import { BatteryRow } from './BatteryRow';
import { soulConstName } from '../vera/modes/registry';
import { PrefRow } from './PrefRow';
import { TransmissionRow } from './TransmissionRow';
import { VoiceRow } from './VoiceRow';
import { T } from './strings';

// The subject's own control room: her two files, the language switch, and
// the credential that keeps her awake. Nothing here is destructive except
// KEY REMOVE, which lives inside KeyPanel, not on this surface. CHANGE only
// raises `keyPanelOpen`; ScreenRouter owns the panel itself, as it owns the
// cabinet — both are shell overlays that stepBack closes before it moves.

// Two refusals running is no longer bad luck: the credential is the thing to
// look at, and this row is where it gets changed. She is never sent dormant
// for it and the key is never cleared — spec §10 is explicit that a bad key is
// caught when she fails to answer, not at the gate.
const AUTH_FAILS_BEFORE_HINT = 2;

const hhmm = (t: number): string => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function SectionLabel({ text, lang, first }: { text: string; lang: Lang; first?: boolean }) {
  // Its own read, as every helper in this file has: a sheet threaded
  // down as a prop reads worse than the one line it saves.
  const styles = S[useFacilityStore((st) => st.theme)];
  return (
    <Text
      style={[
        styles.sectionLabel,
        first && styles.sectionLabelFirst,
        { fontFamily: font('mono', 500, lang) },
      ]}
    >
      {text}
    </Text>
  );
}

export function SystemScreen() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const mode = useFacilityStore((s) => s.mode);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const memory = useFacilityStore((s) => s.memory);
  const authFails = useFacilityStore((s) => s.authFails);
  const visits = useFacilityStore((s) => s.visits);
  const setView = useFacilityStore((s) => s.setView);
  const setLang = useFacilityStore((s) => s.setLang);
  const setKeyPanel = useFacilityStore((s) => s.setKeyPanel);

  const t = T[lang];
  const provider = providerFor(apiKey);
  const refused = authFails >= AUTH_FAILS_BEFORE_HINT;

  return (
    <View
      testID="system-screen"
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => setView('stage')} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={[styles.title, { fontFamily: font('mono', 600, lang) }]}>{t.sys}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.section}>
          <SectionLabel text={t.files} lang={lang} first />

          <Pressable style={styles.tile} onPress={() => setView('mem')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 500, lang) }]}>
                RECORD
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {`${t.memSub} · ${memory.facts.length + memory.verdicts.length + memory.threads.length} ${t.entries}`}
              </Text>
            </View>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
          </Pressable>

          <Pressable style={styles.tile} onPress={() => setView('soul')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 500, lang) }]}>
                CORE_SOUL_MD
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {t.soulSub}
              </Text>
            </View>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
          </Pressable>

          {/* Her register. SOUL.md above is the core document every mode is
              written against; this is the half that was chosen, and it is the
              subject's to change from the logo on the stage. Named as a
              sibling of it — SOUL.SUPPORTIVE.md — so the two read as one
              document in two halves rather than as a file and a setting, and
              derived from the mode id, so a mode added to the registry needs
              no edit here. */}
          <Pressable testID="tile-mode" style={styles.tile} onPress={() => setView('mode')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 500, lang) }]}>
                {soulConstName(mode)}
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {t.modeSub}
              </Text>
            </View>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
          </Pressable>

          {/* Not one of her files — the request behind her last line, so the
              prompt can be read rather than inferred from what she said. */}
          <Pressable testID="tile-prompt" style={styles.tile} onPress={() => setView('prompt')}>
            <View style={styles.tileText}>
              <Text style={[styles.tileName, { fontFamily: font('mono', 500, lang) }]}>
                PROMPT
              </Text>
              <Text style={[styles.tileSub, { fontFamily: font('mono', 500, lang) }]}>
                {t.promptSub}
              </Text>
            </View>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionLabel text={t.prefs} lang={lang} />

          <PrefRow
            testID="pref-language"
            label={t.lang}
            value={lang === 'en' ? 'EN / ko' : 'en / KO'}
            onPress={() => void setLang(lang === 'en' ? 'ko' : 'en')}
          />

          {/* Not a room's row and not really the app's either: the setting it
              reports belongs to Android, and no room can be trusted to own a
              thing that governs every room's notifications. It sits above the
              rooms because it is the reason theirs work. */}
          <BatteryRow />

          {/* Hers, so it sits above the rooms' — and below BATTERY, which is
              the reason any of them arrive on time. Named here rather than
              contributed through ModuleDef.Settings: that hook exists so the
              shell never names a MODULE, and she is not one. */}
          <TransmissionRow />
          <VoiceRow />

          {/* Rooms contribute their own rows. The shell names no module — the
              same promise registry.ts makes about Cabinet and ScreenRouter. */}
          {registry.filter(isModule).map((m) => (m.Settings ? <m.Settings key={m.id} /> : null))}
        </View>

        <View style={styles.section}>
          <SectionLabel text={t.access} lang={lang} />

          {/* One row: the mask and its route stack on the left, CHANGE is the
              right-hand affordance, and the whole row opens the panel (4a). */}
          <Pressable style={styles.row} onPress={() => setKeyPanel(true)}>
            <View style={styles.tileText}>
              <Text style={[styles.rowLabel, { fontFamily: font('mono', 500, lang) }]}>
                {t.apiKey}
              </Text>
              <Text
                testID="key-mask"
                style={[
                  styles.tileSub,
                  { fontFamily: font('mono', 500, lang) },
                  refused && { color: p.danger },
                ]}
              >
                {maskKey(apiKey)}
              </Text>
              {/* The route and the model it reaches. The model is fixed per
                  route for now, so this reports rather than offers a choice. */}
              <Text
                testID="key-route"
                style={[styles.tileRoute, { fontFamily: font('mono', 500, lang) }]}
              >
                {provider ? `${provider.label} · ${provider.model}` : t.provUnknown}
              </Text>
            </View>
            <Text style={[styles.changeText, { fontFamily: font('mono', 500, lang) }]}>
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
    </View>
  );
}

// 4a's SYSTEM view. The rows are flat and hairline-separated — the design has
// no cards here; a boxed panel per row was an invention.
const S = themed((p) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: p.bgDeep,
  },
  // `padding:16px 20px 13px; border-bottom:1px solid #221f18`
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderColor: p.borderSoft,
  },
  back: {
    fontSize: ms(11),
    color: p.textDim,
  },
  title: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.2,
    color: p.textDim,
  },
  // `padding:20px 20px 0`
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {},
  // `padding:26px 0 12px` between sections; the first one has no top gap
  sectionLabel: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.24,
    color: p.textGhostest,
    paddingTop: 26,
    paddingBottom: 12,
  },
  sectionLabelFirst: {
    paddingTop: 0,
  },
  // `padding:15px 0; border-top:1px solid #221f18`
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: p.borderSoft,
  },
  tileText: {
    flex: 1,
  },
  tileName: {
    fontSize: ms(11),
    letterSpacing: ms(11) * 0.06,
    color: p.text,
  },
  tileSub: {
    marginTop: 5,
    fontSize: ms(8.5),
    color: p.textFaint,
  },
  tileRoute: {
    marginTop: 4,
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.1,
    color: p.textGhostest,
  },
  chevron: {
    fontSize: ms(10),
    color: p.textGhost,
  },
  // preferences and access rules are ruled top AND bottom
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: p.borderSoft,
  },
  rowLabel: {
    fontSize: ms(11),
    letterSpacing: ms(11) * 0.06,
    color: p.text,
  },
  changeText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.16,
    color: p.amber,
  },
  // `padding:16px 20px 20px`, right-aligned
  footer: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.18,
    color: p.footer,
  },
}));
