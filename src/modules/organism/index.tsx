import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { PALETTES, font, ms, themed } from '../../core/theme';
import { T } from '../../shell/strings';
import type { ModuleDef } from '../types';
import { Blob, BLOB_SIZE } from './Blob';
import { isHungry } from './hunger';
import { useOrganism } from './store';

// The 168px vivarium is fixed; only the blob inside it tracks hunger (spec
// §12: `74 + hunger × 0.24` px).
const VIVARIUM_PX = 168;
const blobSizeFor = (hunger: number) => 74 + hunger * 0.24;

const TILE_ICON_PX = 58; // matches Cabinet's current hardcoded mod01 row

// The doorway rule (spec §4): this is the one exit, top-left, fixed at 44px,
// drawn in the terrarium's own ink — never the shell's amber.
function ExitAndLabel({ lang }: { lang: 'en' | 'ko' }) {
  const styles = S[useFacilityStore((st) => st.theme)];
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
      <Text style={[styles.veraLabel, { fontFamily: font('mono', 600, lang) }]}>V.E.R.A.</Text>
    </View>
  );
}

export function OrganismScreen() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const { hunger, feed } = useOrganism();
  const [tapNonce, setTapNonce] = useState(0);

  const t = T[lang];
  const hungry = isHungry(hunger);
  const pct = Math.round(hunger);
  const blobSize = blobSizeFor(hunger);

  const onFeed = () => {
    setTapNonce((n) => n + 1);
    void feed();
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="view-mod06"
    >
      <View style={styles.header}>
        <ExitAndLabel lang={lang} />
        <Text style={[styles.title, { fontFamily: font('mono', 600, lang) }]}>{t.orgTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.pillRow}>
          <Text
            style={[
              styles.statusPill,
              { color: hungry ? p.organism.hungry : p.organism.green },
              { fontFamily: font('mono', 600, lang) },
            ]}
          >
            {hungry ? t.orgStatusHungry : t.orgStatusFed}
          </Text>
          <Text style={[styles.dayPill, { fontFamily: font('mono', 600, lang) }]}>{t.orgDay}</Text>
        </View>

        <Pressable testID="vivarium" onPress={onFeed} style={styles.vivarium}>
          <View
            style={[
              styles.blobWell,
              { width: blobSize, height: blobSize, borderRadius: blobSize / 2 },
            ]}
          >
            <View
              style={{
                width: BLOB_SIZE,
                height: BLOB_SIZE,
                transform: [{ scale: blobSize / BLOB_SIZE }],
              }}
            >
              <Blob hunger={hunger} tapNonce={tapNonce} />
            </View>
          </View>
        </Pressable>

        <Text style={[styles.mood, { fontFamily: font('mono', 500, lang) }]}>
          {hungry ? t.orgMoodHungry : t.orgMoodFed}
        </Text>
        <Text style={[styles.hint, { fontFamily: font('mono', 500, lang) }]}>
          {hungry ? t.orgTapHint : t.orgFedHint}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={[styles.statLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.orgHungerL}
            </Text>
            <Text style={[styles.statValue, { fontFamily: font('display', 700, lang) }]}>
              {pct}%
            </Text>
            <View style={styles.statBarTrack}>
              <View
                style={[
                  styles.statBarFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: hungry ? p.organism.hungry : p.organism.green,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.orgTempL}
            </Text>
            <Text style={[styles.statValue, { fontFamily: font('display', 700, lang) }]}>
              36.1°
            </Text>
            <Text style={[styles.statSub, { fontFamily: font('mono', 500, lang) }]}>
              {t.orgTempSub}
            </Text>
          </View>
          <View style={styles.statTile}>
            <Text style={[styles.statLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.orgNauseaL}
            </Text>
            <Text
              style={[
                styles.statValue,
                { color: p.organism.green },
                { fontFamily: font('display', 700, lang) },
              ]}
            >
              {t.orgNauseaV}
            </Text>
            <Text style={[styles.statSub, { fontFamily: font('mono', 500, lang) }]}>
              {t.orgNauseaSub}
            </Text>
          </View>
        </View>

        <Text style={[styles.mutLogTitle, { fontFamily: font('mono', 600, lang) }]}>
          {t.orgMutLog}
        </Text>
        <View style={styles.mutLog}>
          {t.muts.map(([date, text], i) => (
            <View
              key={date}
              style={[styles.mutRow, i < t.muts.length - 1 && styles.mutRowBorder]}
            >
              <Text style={[styles.mutDate, { fontFamily: font('mono', 500, lang) }]}>{date}</Text>
              <Text style={[styles.mutText, { fontFamily: font('display', 500, lang) }]}>
                {text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Cabinet's preview of the specimen — same content Cabinet.tsx currently
// hardcodes for its mod01 row, moved here so Task 18 can swap it in from the
// registry (see registry.ts's comment for the shape it expects).
function OrganismTile({ onPress }: { onPress: () => void }) {
  const theme = useFacilityStore((st) => st.theme);
  const tileStyles = TileStylesSheets[theme];
  const p = PALETTES[theme];
  const lang = useFacilityStore((s) => s.lang);
  const { hunger } = useOrganism();
  const t = T[lang];
  const hungry = isHungry(hunger);
  const pct = Math.round(hunger);

  return (
    <Pressable testID="tile-mod06" style={tileStyles.row} onPress={onPress}>
      <View style={tileStyles.blobWell}>
        <View style={tileStyles.blobScaler}>
          <Blob hunger={hunger} tapNonce={0} />
        </View>
      </View>
      <View style={tileStyles.text}>
        {/* name and status share a baseline row (4a), not a stack */}
        <View style={tileStyles.nameRow}>
          <Text style={[tileStyles.name, { fontFamily: font('mono', 500, lang) }]}>{t.spec}</Text>
          <Text
            style={[
              tileStyles.status,
              { color: hungry ? p.organism.hungry : p.organism.green },
              { fontFamily: font('mono', 500, lang) },
            ]}
          >
            {hungry ? t.hungry : t.fed}
          </Text>
        </View>
        <Text style={[tileStyles.sub, { fontFamily: font('mono', 500, lang) }]}>
          {`${t.inCare} ${pct}%`}
        </Text>
        <View style={tileStyles.hungerTrack}>
          <View
            style={[
              tileStyles.hungerFill,
              {
                width: `${pct}%`,
                backgroundColor: hungry ? p.organism.hungry : p.organism.green,
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

// Benched (2026-09-07), and parked on the LAST slot rather than the next one
// — a room waiting to be revived must not sit on the id the next room built
// will want. Nothing imports this while it is off the registry.
export const organism: ModuleDef = {
  id: 'mod06',
  slot: '06',
  Tile: OrganismTile,
  Screen: OrganismScreen,
};

const S = themed((p) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: p.organism.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: p.organism.cardBorder,
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
    color: p.organism.ink,
  },
  veraLabel: {
    fontSize: ms(10),
    color: p.organism.ink,
  },
  title: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    color: p.organism.label,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.08,
  },
  dayPill: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.08,
    color: p.organism.label,
    borderWidth: 1,
    borderColor: p.organism.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vivarium: {
    marginTop: 18,
    width: VIVARIUM_PX,
    height: VIVARIUM_PX,
    borderRadius: VIVARIUM_PX / 2,
    backgroundColor: p.organism.well,
    borderWidth: 1,
    borderColor: p.organism.wellBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobWell: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mood: {
    marginTop: 13,
    fontSize: ms(9.5),
    letterSpacing: ms(9.5) * 0.18,
    color: p.organism.label,
  },
  hint: {
    marginTop: 6,
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.1,
    color: p.organism.textBright,
  },
  statsRow: {
    marginTop: 15,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: p.organism.card,
    borderWidth: 1,
    borderColor: p.organism.cardBorder,
    borderRadius: 12,
    padding: 10,
  },
  statLabel: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.1,
    color: p.organism.label,
  },
  statValue: {
    marginTop: 5,
    fontSize: ms(15),
    color: p.organism.textBright,
  },
  statSub: {
    marginTop: 5,
    fontSize: ms(8),
    color: p.organism.label,
  },
  statBarTrack: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: p.organism.wellBorder,
  },
  statBarFill: {
    height: 3,
    borderRadius: 2,
  },
  mutLogTitle: {
    marginTop: 18,
    width: '100%',
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.16,
    color: p.organism.label,
  },
  mutLog: {
    marginTop: 8,
    width: '100%',
    backgroundColor: p.organism.card,
    borderWidth: 1,
    borderColor: p.organism.cardBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mutRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  mutRowBorder: {
    borderBottomWidth: 1,
    borderColor: p.organism.cardBorder,
  },
  mutDate: {
    fontSize: ms(9),
    color: p.organism.label,
    flexShrink: 0,
    minWidth: 44,
  },
  mutText: {
    flex: 1,
    fontSize: ms(11),
    lineHeight: ms(11) * 1.45,
    color: p.organism.text,
  },
}));

const TileStylesSheets = themed((p) => StyleSheet.create({
  // `gap:15px; padding:14px; border-radius:14px` (4a)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 14,
    borderRadius: 14,
    backgroundColor: p.organism.card,
    borderWidth: 1,
    borderColor: p.organism.cardBorder,
  },
  blobWell: {
    width: TILE_ICON_PX,
    height: TILE_ICON_PX,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: p.organism.well,
    borderWidth: 1,
    borderColor: p.organism.wellBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobScaler: {
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    transform: [{ scale: TILE_ICON_PX / BLOB_SIZE }],
  },
  text: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    fontSize: ms(10),
    letterSpacing: ms(10) * 0.1,
    color: p.organism.textBright,
  },
  status: {
    fontSize: ms(7.5),
    letterSpacing: ms(7.5) * 0.1,
  },
  sub: {
    marginTop: 6,
    fontSize: ms(8),
    color: p.organism.inkDim,
  },
  hungerTrack: {
    marginTop: 9,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: p.organism.well,
  },
  hungerFill: {
    height: 4,
    borderRadius: 2,
  },
}));
