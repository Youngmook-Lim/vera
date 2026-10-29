import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { PALETTES, font, ms, themed } from '../../core/theme';
import type { ModuleDef } from '../types';
import { advance, current, goTo, retreat } from '../deck';
import { displayOrder } from '../favorites';
import { fieldFor } from './colour';
import { LINES, SOURCE } from './lines';
import { onTap, readTapTarget } from './notify';
import { AffirmationsSettings } from './Settings';
import { useAffirmationsStore, useFavorites } from './store';
import { T } from './strings';
import { type Swipe, claims, settle } from './swipe';

const GRID_TILE_PX = 86; // the cabinet's grid cell, shared by every slot
const SLIDE_MS = 220;

const pad3 = (n: number) => String(n).padStart(3, '0');

const STAR_ON = '★';
const STAR_OFF = '☆';

// The star, the advice room's control drawn in whatever ink it sits on. The
// kept and unkept glyphs differ in shape, so one ink serves both: on a poster
// there is no second colour that reads on all six fields.
function Star({
  testID,
  on,
  ink,
  onPress,
  lang,
  style,
}: {
  testID: string;
  on: boolean;
  ink: string;
  onPress: () => void;
  lang: Lang;
  style: TextStyle;
}) {
  const t = T[lang];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? t.release : t.keep}
    >
      <Text style={[style, { color: ink }]}>{on ? STAR_ON : STAR_OFF}</Text>
    </Pressable>
  );
}

export function AffirmationsScreen() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const setView = useFacilityStore((s) => s.setView);
  const t = T[lang];

  const deck = useAffirmationsStore((s) => s.deck);
  const setDeck = useAffirmationsStore((s) => s.setDeck);
  const [listing, setListing] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const p = PALETTES[theme];
  // A way of looking at the list, not a thing you own: it starts off every
  // visit. Derived rather than reset, so letting the last card go withdraws
  // the sort and keeping one again restores it — the advice room's rule.
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  const canSort = favorites.size > 0;
  const sorting = favoritesFirst && canSort;
  const order = useMemo(() => displayOrder(LINES, favorites, sorting), [favorites, sorting]);

  const onPick = (index: number) => {
    setDeck((d) => goTo(d, index));
    setListing(false);
  };

  const pending = useFacilityStore((s) => s.pendingAffirmation);

  // A card the 10:00 notification asked for. Taken once and cleared; goTo moves
  // within this pass rather than starting a new one. It takes the room off the
  // list too, since the tap asked to see the card.
  useEffect(() => {
    if (pending == null) return;
    useFacilityStore.setState({ pendingAffirmation: null });
    // A card already in the shade from before a re-run of the script that
    // dropped lines can name one that is gone; `goTo` would land on nothing.
    if (pending < 0 || pending >= LINES.length) return;
    setDeck((d) => goTo(d, pending));
    setListing(false);
  }, [pending]);

  const card = current(deck);
  const field = fieldFor(card);

  // The poster follows the finger; on release it either moves on or springs
  // back. Every decision is in swipe.ts, where a test can reach it.
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;
  const tx = useSharedValue(0);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  // Reads the deck from the store rather than from this render, because the
  // responder below is built once and would otherwise hold the first deck
  // forever. `retreat` hands back the same deck at the start of a pass, which
  // is how a swipe back there knows to spring rather than slide.
  const go = (to: Swipe, dx = 0): void => {
    const was = useAffirmationsStore.getState().deck;
    const next = to === 'next' ? advance(was) : to === 'prev' ? retreat(was) : was;
    if (next === was) {
      tx.value = withSpring(0);
      return;
    }
    setDeck(() => next);
    // The new card enters from the side the old one left by, from wherever
    // the finger let go, so the swipe does not jump.
    const from = (to === 'next' ? widthRef.current : -widthRef.current) + dx;
    tx.value = withSequence(withTiming(from, { duration: 0 }), withTiming(0, { duration: SLIDE_MS }));
  };
  const goRef = useRef(go);
  goRef.current = go;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => claims(g.dx, g.dy),
      onPanResponderMove: (_e, g) => {
        tx.value = g.dx;
      },
      onPanResponderRelease: (_e, g) => goRef.current(settle(g.dx, g.vx, widthRef.current), g.dx),
      onPanResponderTerminate: () => {
        tx.value = withSpring(0);
      },
    }),
  ).current;

  // The unlit mode is `dim` where the ground has a second ink to give, and the
  // lit one's own ink at half strength on a poster, where it has none.
  const modes = (ink: string, dim: string | null) => {
    const lit = { color: ink };
    const unlit = dim ? { color: dim } : { color: ink, opacity: 0.5 };
    return (
      <View style={styles.modes}>
        <Pressable testID="affirmations-mode-cards" onPress={() => setListing(false)} hitSlop={8}>
          <Text style={[styles.mode, listing ? unlit : lit, { fontFamily: font('mono', 500, lang) }]}>
            {t.cards}
          </Text>
        </Pressable>
        <Pressable testID="affirmations-mode-list" onPress={() => setListing(true)} hitSlop={8}>
          <Text style={[styles.mode, listing ? lit : unlit, { fontFamily: font('mono', 500, lang) }]}>
            {`${t.list} ${LINES.length}`}
          </Text>
        </Pressable>
      </View>
    );
  };

  if (listing) {
    const ink = p.affirmations.room;
    return (
      <View testID="view-mod04" style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.header, styles.listHeader]}>
          <Pressable testID="module-exit" onPress={() => setView('stage')} style={styles.exit} hitSlop={4}>
            <Text style={[styles.exitGlyph, { color: ink.inkSoft }]}>‹</Text>
          </Pressable>
          <Text style={[styles.label, { color: ink.inkDim, fontFamily: font('mono', 500, lang) }]}>
            {t.label}
          </Text>
        </View>
        <FlatList
          testID="affirmations-list"
          data={order}
          style={styles.list}
          keyExtractor={(index) => String(index)}
          contentContainerStyle={styles.listBody}
          extraData={favorites.size}
          renderItem={({ item: index, index: position }) => (
            // The numeral is the card's own number, so under the sort — where
            // the list runs out of order — it still says where a card lives.
            <Pressable
              testID={`affirmations-row-${index}`}
              onPress={() => onPick(index)}
              style={[styles.row, position > 0 && styles.rowRule]}
            >
              <View
                testID={`affirmations-row-${index}-chip`}
                style={[styles.chip, { backgroundColor: fieldFor(index).bg }]}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowIndex, { fontFamily: font('mono', 500) }]}>{pad3(index + 1)}</Text>
                <Text style={styles.rowLine}>{LINES[index]}</Text>
              </View>
              <Star
                testID={`affirmations-row-${index}-star`}
                on={favorites.has(LINES[index])}
                ink={favorites.has(LINES[index]) ? ink.ink : ink.inkGhost}
                onPress={() => void toggleFavorite(LINES[index])}
                lang={lang}
                style={styles.rowStar}
              />
            </Pressable>
          )}
        />
        <View style={[styles.footerRow, styles.listFooter]}>
          {/* The sort orders the list, so it is only offered here. */}
          <Pressable
            testID="affirmations-sort"
            onPress={() => setFavoritesFirst((on) => !on)}
            disabled={!canSort}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: sorting, disabled: !canSort }}
          >
            <Text
              style={[
                styles.mode,
                { color: sorting ? ink.ink : ink.inkGhost, fontFamily: font('mono', 500, lang) },
              ]}
            >
              {`${STAR_ON} ${t.first} ${favorites.size}`}
            </Text>
          </Pressable>
          {modes(ink.ink, ink.inkGhost)}
        </View>
      </View>
    );
  }

  return (
    <View testID="view-mod04" style={styles.screen}>
      <View
        testID="affirmations-field"
        style={[
          styles.field,
          { backgroundColor: field.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* The poster runs behind the status bar and ignores the theme, so the
            clock and battery follow the field. The latest mounted bar wins,
            and leaving for the list hands it back to the router's. */}
        <StatusBar style={field.bar} />
        {/* The doorway rule's one exit, in this room's ink — which on a
            poster is the card's, since no fixed ink reads on all six. */}
        <View style={styles.header}>
          <Pressable testID="module-exit" onPress={() => setView('stage')} style={styles.exit} hitSlop={4}>
            <Text style={[styles.exitGlyph, { color: field.ink }]}>‹</Text>
          </Pressable>
          <Text style={[styles.label, { color: field.ink, fontFamily: font('mono', 500, lang) }]}>
            {t.label}
          </Text>
        </View>

        {/* Adjustable, so a screen reader swipes it too — and so the tests
            can, since a PanResponder cannot be driven from jest. A tap does
            nothing: the swipe is the whole gesture. */}
        <Animated.View
          testID="affirmations-card"
          style={[styles.poster, slide]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={LINES[card]}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 'next' : 'prev')}
        >
          {/* The drag lives on an inner view, apart from the actions: a
              responder that declines every touch START (it claims only
              sideways moves) would otherwise mark the whole poster as
              refusing events, and the test renderer honours that. */}
          <View style={styles.dragArea} {...pan.panHandlers}>
            <Text testID="affirmations-numeral" style={[styles.numeral, { color: field.ink }]}>
              {pad3(card + 1)}
            </Text>
            {/* One size and a ScrollView behind it, the advice room's answer to
                a long line. Her longest is 156 characters. */}
            <ScrollView style={styles.lineScroller} contentContainerStyle={styles.lineScroll}>
              <Text testID="affirmations-line" style={[styles.line, { color: field.ink }]}>
                {LINES[card]}
              </Text>
              <Text style={[styles.credit, { color: field.ink }]}>{SOURCE.author}</Text>
            </ScrollView>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          {/* How far through this pass: the one place the shuffle's position
              shows, and not as a number, so it is never read as the card's. */}
          <View style={styles.track}>
            {/* The track's own faded ground, as a layer: an opacity on the
                track itself would fade the fill inside it too. */}
            <View style={[StyleSheet.absoluteFill, styles.trackGround, { backgroundColor: field.ink }]} />
            <View
              style={[
                styles.progress,
                { backgroundColor: field.ink, width: `${((deck.at + 1) / LINES.length) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.footerRow}>
            <Star
              testID="affirmations-star"
              on={favorites.has(LINES[card])}
              ink={field.ink}
              onPress={() => void toggleFavorite(LINES[card])}
              lang={lang}
              style={styles.star}
            />
            {modes(field.ink, null)}
          </View>
        </View>
      </View>
    </View>
  );
}

// The cabinet's preview of this room: the first field, edge to edge.
function AffirmationsTile({ onPress }: { onPress: () => void }) {
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];
  const field = fieldFor(0);
  return (
    <Pressable testID="tile-mod04" style={[tileStyles.tile, { backgroundColor: field.bg }]} onPress={onPress}>
      <Text style={[tileStyles.slot, { color: field.ink, fontFamily: font('mono', 500, lang) }]}>04</Text>
      <Text style={[tileStyles.title, { color: field.ink, fontFamily: font('display', 700, lang) }]}>
        {t.label}
      </Text>
    </Pressable>
  );
}

export const affirmations: ModuleDef = {
  id: 'mod04',
  slot: '04',
  Tile: AffirmationsTile,
  Screen: AffirmationsScreen,
  Settings: AffirmationsSettings,
  // The advice room's boot: hydrate, refresh the horizon if the day turned
  // over, take a tap Android held while the app was dead, then listen for the
  // ones that arrive while it runs.
  onBoot: async () => {
    await useAffirmationsStore.getState().hydrate();
    void useAffirmationsStore.getState().syncIfDue(useFacilityStore.getState().lang);

    const tapped = await readTapTarget();
    if (tapped != null) useFacilityStore.getState().openAffirmation(tapped);

    return onTap((index) => useFacilityStore.getState().openAffirmation(index));
  },
};

const S = themed((p) => StyleSheet.create({
  // The themed ground the posters lie on, and the list's own.
  screen: {
    flex: 1,
    backgroundColor: p.affirmations.room.bg,
  },
  field: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
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
  },
  label: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    opacity: 0.7,
  },
  poster: {
    flex: 1,
    paddingHorizontal: 22,
  },
  dragArea: {
    flex: 1,
  },
  numeral: {
    fontFamily: font('display', 700),
    fontSize: ms(56),
    letterSpacing: -ms(56) * 0.04,
    opacity: 0.35,
    marginTop: 18,
  },
  lineScroller: {
    flex: 1,
  },
  lineScroll: {
    paddingTop: 18,
    paddingBottom: 18,
  },
  line: {
    fontFamily: font('display', 700),
    fontSize: ms(32),
    lineHeight: ms(32) * 1.05,
    letterSpacing: -ms(32) * 0.02,
  },
  credit: {
    marginTop: 16,
    fontFamily: font('mono', 500),
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  track: {
    height: 3,
  },
  trackGround: {
    opacity: 0.25,
  },
  progress: {
    height: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
  },
  star: {
    fontSize: ms(18),
  },
  modes: {
    flexDirection: 'row',
    gap: 18,
  },
  mode: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
  },
  listHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: p.affirmations.room.rule,
  },
  list: {
    flex: 1,
  },
  listBody: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  rowRule: {
    borderTopWidth: 1,
    borderColor: p.affirmations.room.rule,
  },
  chip: {
    width: 10,
    height: 34,
    borderRadius: 2,
  },
  rowText: {
    flex: 1,
  },
  rowIndex: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.15,
    color: p.affirmations.room.inkGhost,
    marginBottom: 3,
  },
  rowLine: {
    fontFamily: font('display', 600),
    fontSize: ms(13),
    lineHeight: ms(13) * 1.25,
    color: p.affirmations.room.ink,
  },
  rowStar: {
    fontSize: ms(13),
  },
  listFooter: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderColor: p.affirmations.room.rule,
  },
}));

// Not themed: the tile is a field, and the fields are the same in both.
const tileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    height: GRID_TILE_PX,
    borderRadius: 14,
    justifyContent: 'space-between',
    padding: 11,
    overflow: 'hidden',
  },
  slot: {
    fontSize: ms(11),
    opacity: 0.6,
  },
  title: {
    fontSize: ms(12),
    lineHeight: ms(12) * 1.1,
  },
});
