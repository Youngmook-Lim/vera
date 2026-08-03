import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { Blob, BLOB_SIZE } from '../modules/organism/Blob';
import { isHungry } from '../modules/organism/hunger';
import { registry } from '../modules/registry';
import { isEmpty } from '../modules/types';
import { T } from './strings';

// The one place a module's own theme is allowed to show through the shell's
// neutral chrome (spec §4): every tile shares the same square and the same
// 12px radius, but Module 01 is painted in the terrarium's greens and Module
// 02 in the identity's bone paper. The two unfurnished slots stay bare
// numerals on a hairline border — the shell's own colour, nothing borrowed.

const TILE_ICON_PX = 58; // Module 01's preview square, inside its full-width row
const GRID_TILE_PX = 86; // Modules 02–04, in the three-column grid

const pad2 = (n: number) => String(n).padStart(2, '0');

// Modules 01 and 02 don't have a folder yet (Tasks 16/17), so their tiles are
// built here directly rather than sourced from the registry — see
// registry.ts for the shape Tasks 16/17 leave behind.
const FURNISHED_COUNT = 2;

export function Cabinet() {
  const lang = useFacilityStore((s) => s.lang);
  const hunger = useFacilityStore((s) => s.hunger);
  const setView = useFacilityStore((s) => s.setView);
  const setCabinet = useFacilityStore((s) => s.setCabinet);

  const t = T[lang];
  const close = () => setCabinet(false);

  const emptySlots = registry.filter(isEmpty);
  const total = FURNISHED_COUNT + emptySlots.length;
  const countLabel = `${pad2(FURNISHED_COUNT)} / ${pad2(total)} · ${t.close}`;

  const hungry = isHungry(hunger);
  const hungerPct = Math.round(hunger);

  return (
    <Modal transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabBar} />

          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: font('mono', 600, lang) }]}>
              {t.cabinet}
            </Text>
            <Pressable onPress={close} accessibilityLabel={`${t.alloc} ${countLabel}`}>
              <Text style={[styles.count, { fontFamily: font('mono', 600, lang) }]}>
                {countLabel}
              </Text>
            </Pressable>
          </View>

          <Pressable testID="tile-mod01" style={styles.mod01Row} onPress={() => setView('mod01')}>
            <View style={styles.blobWell}>
              <View style={styles.blobScaler}>
                <Blob hunger={hunger} tapNonce={0} />
              </View>
            </View>
            <View style={styles.mod01Text}>
              <Text style={[styles.mod01Name, { fontFamily: font('mono', 600, lang) }]}>
                {t.spec}
              </Text>
              <Text
                style={[
                  styles.mod01Status,
                  { color: hungry ? palette.organism.hungry : palette.organism.green },
                  { fontFamily: font('mono', 600, lang) },
                ]}
              >
                {hungry ? t.hungry : t.fed}
              </Text>
              <Text style={[styles.mod01Sub, { fontFamily: font('mono', 500, lang) }]}>
                {`${t.inCare} ${hungerPct}%`}
              </Text>
              <View style={styles.hungerTrack}>
                <View
                  style={[
                    styles.hungerFill,
                    {
                      width: `${hungerPct}%`,
                      backgroundColor: hungry ? palette.organism.hungry : palette.organism.green,
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <View style={styles.grid}>
            <Pressable testID="tile-mod02" style={styles.identityTile} onPress={() => setView('mod02')}>
              <Text style={[styles.identityTitle, { fontFamily: serif(lang) }]}>
                {t.identName}
              </Text>
            </Pressable>

            {emptySlots.map((entry) => (
              <View key={entry.slot} testID={`tile-${entry.slot}`} style={styles.emptyTile}>
                <Text style={[styles.emptyNumeral, { fontFamily: font('mono', 600, lang) }]}>
                  {entry.slot}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#17171a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingTop: 10,
    paddingBottom: 28,
    marginBottom: 10,
    marginHorizontal: 8,
  },
  grabBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
  },
  header: {
    marginTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: ms(10),
    letterSpacing: ms(10) * 0.2,
    color: palette.text,
  },
  count: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.1,
    color: palette.textDim,
  },
  mod01Row: {
    marginTop: 18,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: palette.organism.card,
    borderWidth: 1,
    borderColor: palette.organism.cardBorder,
  },
  blobWell: {
    width: TILE_ICON_PX,
    height: TILE_ICON_PX,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: palette.organism.well,
    borderWidth: 1,
    borderColor: palette.organism.wellBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blobScaler: {
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    transform: [{ scale: TILE_ICON_PX / BLOB_SIZE }],
  },
  mod01Text: {
    flex: 1,
    gap: 4,
  },
  mod01Name: {
    fontSize: ms(11),
    color: palette.organism.textBright,
  },
  mod01Status: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.08,
  },
  mod01Sub: {
    fontSize: ms(7.5),
    color: palette.organism.label,
  },
  hungerTrack: {
    marginTop: 4,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: palette.organism.well,
  },
  hungerFill: {
    height: 4,
    borderRadius: 2,
  },
  grid: {
    marginTop: 14,
    marginHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  identityTile: {
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
  identityTitle: {
    fontSize: ms(10.5),
    textAlign: 'center',
    color: palette.identity.ink,
  },
  emptyTile: {
    width: GRID_TILE_PX,
    height: GRID_TILE_PX,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNumeral: {
    fontSize: ms(18),
    color: palette.textGhost,
  },
});
