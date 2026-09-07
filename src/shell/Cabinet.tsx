import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { registry } from '../modules/registry';
import { isModule } from '../modules/types';
import { T } from './strings';

// The one place a module's own theme is allowed to show through the shell's
// neutral chrome (spec §4): every tile shares the same square and the same
// 14px radius, but a furnished room paints its own — the advice room in its
// cold ink. The unfurnished slots stay bare numerals on a hairline border —
// the shell's own colour, nothing borrowed.
//
// The shell supplies the geometry and nothing else: every slot is the same
// cell, and the tile itself comes from the module's own ModuleDef. Adding a
// module is a folder plus a line in registry.ts — no edit here.
//
// The feature row is gone (2026-09-07). 4a gives the first furnished slot the
// full width and the rest a three-column grid underneath; one room in a
// building of six made that a banner over five holes, so every slot is now
// the same square. This is a deliberate departure from the prototype.

const GRID_TILE_PX = 86; // every slot, in the three-column grid
const PER_ROW = 3;

const pad2 = (n: number) => String(n).padStart(2, '0');

// Rows of three, laid out as rows rather than one wrapping container: `flex:1`
// children in a wrapping row do not settle at three across, and the whole
// point of the change is that every square is the same size.
const inRows = <T,>(items: T[], per: number): T[][] =>
  items.reduce<T[][]>((rows, item, i) => {
    if (i % per === 0) rows.push([]);
    rows[rows.length - 1].push(item);
    return rows;
  }, []);

export function Cabinet() {
  const lang = useFacilityStore((s) => s.lang);
  const setView = useFacilityStore((s) => s.setView);
  const setCabinet = useFacilityStore((s) => s.setCabinet);

  const t = T[lang];
  const close = () => setCabinet(false);

  const furnished = registry.filter(isModule).length;
  const rows = inRows(registry, PER_ROW);
  const countLabel = `${pad2(furnished)} / ${pad2(registry.length)} · ${t.close}`;

  return (
    <Modal transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabBar} />

          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: font('mono', 500, lang) }]}>
              {t.cabinet}
            </Text>
            <Pressable onPress={close} accessibilityLabel={`${t.alloc} ${countLabel}`}>
              <Text style={[styles.count, { fontFamily: font('mono', 500, lang) }]}>
                {countLabel}
              </Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {rows.map((row, i) => (
              <View key={row[0].slot} testID={`cabinet-row-${i}`} style={styles.row}>
                {row.map((entry) =>
                  isModule(entry) ? (
                    <entry.Tile key={entry.id} onPress={() => setView(entry.id)} />
                  ) : (
                    <View key={entry.slot} testID={`tile-${entry.slot}`} style={styles.emptyTile}>
                      <Text
                        style={[styles.emptyNumeral, { fontFamily: font('mono', 500, lang) }]}
                      >
                        {entry.slot}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// 4a's drawer. It is flush to the screen edges and rounded only at the top —
// the inset, floating card was an invention.
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: '#08080699',
    justifyContent: 'flex-end',
  },
  // `left:0;right:0;bottom:0; border-radius:20px 20px 34px 34px; padding:0 18px 20px`
  sheet: {
    backgroundColor: '#17171a',
    borderTopWidth: 1,
    borderColor: palette.hairline,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  // `padding:9px 0 4px`, a 34px bar
  grabBar: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
    marginTop: 9,
    marginBottom: 4,
  },
  // `padding:8px 2px 16px`
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.22,
    color: palette.textDim,
  },
  count: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.14,
    color: palette.textGhost,
  },
  // `margin-top:11px; gap:10px` — the gap now stands between the rows as well
  // as inside them, so the grid is square in both directions.
  grid: {
    marginTop: 11,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyTile: {
    flex: 1,
    height: GRID_TILE_PX,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNumeral: {
    fontSize: ms(24),
    color: '#2b2820',
  },
});
