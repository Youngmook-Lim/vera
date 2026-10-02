import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useFacilityStore } from '../core/store';
import { font, ms, themed } from '../core/theme';
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
//
// And the drawer is a floating sheet now (`1d`, 2026-09-29). It used to sit
// flush to the screen edges, rounded 20 at the top and 34 at the bottom
// because the bottom two corners were off-screen — the shape of something
// dragged up from the edge, which is what opened it. A button opens it now
// (`cabinet-dock` in Stage.tsx), so it is a card that arrives rather than an
// edge that lifts: clear of all four sides, one radius, and no grab bar,
// since there is no longer anything to grab.

const GRID_TILE_PX = 86; // every slot, in the three-column grid
const PER_ROW = 3;

// `transform:translateY(40px)` → `0` on the design's own curve. Short, because
// the sheet is already where it belongs and is only settling; the long travel
// belonged to the drawer that came from off-screen.
const SHEET_RISE_PX = 40;
const SHEET_RISE_MS = 320;
const SHEET_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);

// Reanimated drives the rise; the Modal's own `fade` drives the opacity, which
// is why nothing here animates it. Doing both would fade the sheet twice.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];

  const furnished = registry.filter(isModule).length;
  const rows = inRows(registry, PER_ROW);
  const count = `${pad2(furnished)} / ${pad2(registry.length)}`;

  const rise = useSharedValue(SHEET_RISE_PX);
  useEffect(() => {
    rise.value = withTiming(0, { duration: SHEET_RISE_MS, easing: SHEET_EASING });
  }, [rise]);
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));

  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <AnimatedPressable
          testID="cabinet-sheet"
          style={[styles.sheet, riseStyle]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: font('mono', 500, lang) }]}>
              {t.cabinet}
            </Text>
            {/* The word CLOSE left the header with the rest of `1d`, and did
                not leave the screen reader with it: the design governs what is
                on screen, and a label announcing what a press does is not.
                Keeping it here is also what keeps `t.close` a live string
                rather than orphaned copy in two languages. */}
            <Pressable onPress={close} accessibilityLabel={`${t.alloc} ${count} · ${t.close}`}>
              <Text style={[styles.count, { fontFamily: font('mono', 500, lang) }]}>
                {count}
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
        </AnimatedPressable>
      </Pressable>
    </Modal>
  );
}

// `1d`'s sheet. Every number read off `design/Vera Final.dc.html`.
const S = themed((p) => StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: p.scrim,
    justifyContent: 'flex-end',
  },
  // `left:12px;right:12px;bottom:100px; border-radius:20px; padding:0 16px 16px`
  //
  // The 100 is what holds it above the input row the dock button sits in, so
  // the button that opened it is still visible underneath. It is measured from
  // the screen's own bottom rather than from the safe area: the Modal is not
  // inside the stage's padding, and the mock measures from the same edge.
  sheet: {
    backgroundColor: p.sheet,
    borderWidth: 1,
    borderColor: p.hairline,
    borderRadius: 20,
    marginHorizontal: 12,
    marginBottom: 100,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // `padding:16px 2px 16px` — symmetrical now that no grab bar sits above it
  // eating the top half.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 16,
  },
  title: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.22,
    color: p.textDim,
  },
  count: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.14,
    color: p.textGhost,
  },
  // `gap:10px` — the gap stands between the rows as well as inside them, so
  // the grid is square in both directions. Its old 11px top margin is gone:
  // the header's own bottom padding is the whole of that gap in `1d`.
  grid: {
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
    borderColor: p.borderFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNumeral: {
    fontSize: ms(24),
    color: p.emptyNum,
  },
}));
