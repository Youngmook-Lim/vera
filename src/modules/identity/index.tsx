import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { KEYS, storage } from '../../core/storage';
import { useFacilityStore } from '../../core/store';
import { ms, palette, serif, serifItalic } from '../../core/theme';
import type { ModuleDef } from '../types';
import { SEED, addLine, editLine, editTitle, removeLine, stamp } from './identity';
import type { Identity } from './identity';
import { T } from './strings';

const GRID_TILE_PX = 86; // matches Cabinet's current hardcoded mod02 tile

// The doorway rule (spec §4): the one exit, top-left, fixed at 44px, drawn in
// this room's own ink — never her amber, never a module's own accent colour.
function ExitAndLabel({ lang }: { lang: Lang }) {
  const setView = useFacilityStore((s) => s.setView);
  return (
    <View style={styles.headerLeft}>
      <Pressable
        testID="module-exit"
        onPress={() => setView('stage')}
        style={styles.exit}
        hitSlop={4}
      >
        <Text style={styles.exitGlyph}>‹</Text>
      </Pressable>
      <Text style={[styles.veraLabel, { fontFamily: serif(lang) }]}>V.E.R.A.</Text>
    </View>
  );
}

export function IdentityScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];

  const [identity, setIdentity] = useState<Identity>(SEED);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [lineDrafts, setLineDrafts] = useState<Record<number, string>>({});

  // Load on mount, falling back to the SEED already in state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await storage.get(KEYS.identity);
      if (cancelled || !raw) return;
      try {
        setIdentity(JSON.parse(raw) as Identity);
      } catch {
        // a corrupt record — keep the SEED already in state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (next: Identity) => {
    setIdentity(next);
    void storage.set(KEYS.identity, JSON.stringify(next));
  };

  const onTitleBlur = () => {
    if (titleDraft === null) return;
    const next = editTitle(identity, titleDraft);
    setTitleDraft(null);
    if (next !== identity) persist(next);
  };

  const onLineBlur = (i: number) => {
    const draft = lineDrafts[i];
    if (draft === undefined) return;
    const next = editLine(identity, i, draft);
    setLineDrafts({});
    if (next !== identity) persist(next);
  };

  const onAdd = () => {
    setLineDrafts({});
    persist(addLine(identity));
  };

  const onRemove = (i: number) => {
    setLineDrafts({});
    persist(removeLine(identity, i));
  };

  return (
    <View style={styles.screen} testID="view-mod02">
      <View style={styles.header}>
        <ExitAndLabel lang={lang} />
        <Text style={[styles.headerLabel, { fontFamily: serif(lang) }]}>{t.label}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.titleRow}>
          <TextInput
            style={[styles.title, { fontFamily: serifItalic(lang) }]}
            value={titleDraft ?? identity.title}
            onChangeText={setTitleDraft}
            onBlur={onTitleBlur}
            multiline
          />
          <Pressable testID="add-line" onPress={onAdd} hitSlop={10} style={styles.addButton}>
            <Text style={styles.addGlyph}>+</Text>
          </Pressable>
        </View>

        {identity.lines.length === 0 ? (
          <Text style={[styles.empty, { fontFamily: serif(lang) }]}>{t.empty}</Text>
        ) : (
          identity.lines.map((line, i) => (
            <View key={i} style={[styles.lineRow, i > 0 && styles.lineRule]}>
              <TextInput
                testID={`line-${i}`}
                style={[styles.lineInput, { fontFamily: serif(lang) }]}
                value={lineDrafts[i] ?? line}
                onChangeText={(text) => setLineDrafts((d) => ({ ...d, [i]: text }))}
                onBlur={() => onLineBlur(i)}
                multiline
              />
              <Pressable testID={`remove-${i}`} onPress={() => onRemove(i)} hitSlop={10}>
                <Text style={styles.removeGlyph}>×</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text style={[styles.stamp, { fontFamily: serifItalic(lang) }]}>{stamp(identity)}</Text>
          <Text style={styles.slot}>02</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Cabinet's preview of this room — same content Cabinet.tsx currently
// hardcodes for its mod02 tile, moved here so Task 18 can swap it in from the
// registry (see registry.ts's comment for the shape it expects).
function IdentityTile({ onPress }: { onPress: () => void }) {
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];
  return (
    <Pressable testID="tile-mod02" style={tileStyles.tile} onPress={onPress}>
      <Text style={[tileStyles.title, { fontFamily: serif(lang) }]}>{t.label}</Text>
    </Pressable>
  );
}

export const identity: ModuleDef = {
  id: 'mod02',
  slot: '02',
  Tile: IdentityTile,
  Screen: IdentityScreen,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.identity.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: palette.identity.rule,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exit: {
    width: 44,
    height: 44,
    marginLeft: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitGlyph: {
    fontSize: ms(15),
    color: palette.identity.inkSoft,
  },
  veraLabel: {
    fontSize: ms(10),
    color: palette.identity.inkSoft,
  },
  headerLabel: {
    fontSize: ms(9),
    color: palette.identity.inkSoft,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: ms(24),
    color: palette.identity.ink,
    padding: 0,
  },
  addButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGlyph: {
    fontSize: ms(18),
    color: palette.identity.inkSoft,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
  },
  lineRule: {
    borderTopWidth: 1,
    borderColor: palette.identity.rule,
  },
  lineInput: {
    flex: 1,
    fontSize: ms(25),
    lineHeight: ms(25) * 1.3,
    color: palette.identity.ink,
    padding: 0,
  },
  removeGlyph: {
    fontSize: ms(15),
    color: palette.identity.inkFaint,
  },
  empty: {
    marginTop: 24,
    fontSize: ms(11),
    lineHeight: ms(11) * 1.5,
    color: palette.identity.inkFaint,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: palette.identity.rule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stamp: {
    fontSize: ms(12),
    color: palette.identity.inkFaint,
  },
  slot: {
    fontSize: ms(11),
    color: palette.identity.inkGhost,
  },
});

const tileStyles = StyleSheet.create({
  tile: {
    width: GRID_TILE_PX,
    height: GRID_TILE_PX,
    borderRadius: 12,
    backgroundColor: palette.identity.paper,
    borderWidth: 1,
    borderColor: palette.identity.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  title: {
    fontSize: ms(10.5),
    textAlign: 'center',
    color: palette.identity.ink,
  },
});
