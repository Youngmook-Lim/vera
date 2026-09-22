import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { EMOTIONS } from '../../vera/emotions';
import { font, ms, palette, serif, serifItalic } from '../../core/theme';
import type { ModuleDef } from '../types';
import { advance, current, goTo } from '../deck';
import { displayOrder } from '../favorites';
import { QUOTES, SOURCE } from './quotes';
import { useFavorites } from './store';
import { T } from './strings';
import { AdviceSettings } from './Settings';
import { onTap, readTapTarget } from './notify';
import { useAdviceStore } from './store';

const GRID_TILE_PX = 86; // the cabinet's grid cell, shared by every slot

const pad3 = (n: number) => String(n).padStart(3, '0');

// The air around the mode row, above and below. The gap up to the header rule
// and the gap down to whatever is showing are the same measurement, so one
// number owns both — the containers underneath contribute no top padding of
// their own, which is what let a card sit 22px clear of the row while the list
// sat 8px under it.
const MODE_AIR = 14;

const STAR_ON = '★';
const STAR_OFF = '☆';

// One control, two places: on the counter row under the card and again on
// every row of the list. `accessibilityState.selected` is what says which way
// it is set — the glyph is the picture of that, not the record of it.
function Star({
  testID,
  on,
  accent,
  onPress,
  lang,
  style,
}: {
  testID: string;
  on: boolean;
  accent: string;
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
      <Text
        testID={`${testID}-glyph`}
        style={[style, { color: on ? accent : palette.advice.inkGhost }]}
      >
        {on ? STAR_ON : STAR_OFF}
      </Text>
    </Pressable>
  );
}

// The doorway rule (spec §4): the one exit, top-left, fixed at 44px, drawn in
// this room's own ink — never the shell's amber.
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
      <Text style={[styles.veraLabel, { fontFamily: font('mono', 500, lang) }]}>V.E.R.A.</Text>
    </View>
  );
}

export function AdviceScreen() {
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const emotion = useFacilityStore((s) => s.emotion);
  const t = T[lang];

  // The room is in her building, so it is lit in whatever she is wearing: the
  // counter, the lit mode label, the sort and a kept star all read her current
  // iris. This is the one place a module reaches into her state — the traffic
  // the doorway rule forbids runs the other way, and she is still told nothing
  // about what is kept in here.
  //
  // Two consequences taken deliberately. On `calm` the accent IS the shell's
  // amber (§4 forbids that for the exit, which draws in `inkSoft` and does not
  // move) and on `alarmed` it is the app's danger red. And while she is dormant
  // the room wears her dead grey, which sits nearer the unkept star's ghost
  // than any waking colour does — an unwoken building is not lit in a colour of
  // its own.
  const accent = EMOTIONS[emotion].iris;

  // The deck lives in the room's store, so it lives as long as the APP does
  // rather than as long as the room is open (2026-09-22). Walking out at card
  // forty and back in used to start a fresh shuffle, which meant seeing a
  // quote again long before the other 231 had been dealt — the once-per-pass
  // guarantee held, but almost nothing held it. Nothing is written down: the
  // deck is not in `Stored`, so an app restart is the one thing that reshuffles.
  // She is told about none of this either way.
  const deck = useAdviceStore((s) => s.deck);
  const setDeck = useAdviceStore((s) => s.setDeck);
  const [listing, setListing] = useState(false);
  // A way of looking at the list rather than a thing you own, so it is not in
  // the store and it starts off every time the room does. The deck no longer
  // keeps it company in that: a sort is about one visit, a pass is not.
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const pendingQuote = useFacilityStore((s) => s.pendingQuote);

  // A card a notification asked for. Taken once and cleared, so walking back
  // into the room later deals an ordinary card. goTo moves the position within
  // this pass rather than starting a new one, so arriving here does not throw
  // away the rest of the shuffle and re-deal cards already seen.
  useEffect(() => {
    if (pendingQuote == null) return;
    setDeck((d) => goTo(d, pendingQuote));
    setListing(false);
    useFacilityStore.setState({ pendingQuote: null });
  }, [pendingQuote]);

  const card = current(deck);

  // A sort with nothing to lift cannot do anything, so it is refused rather
  // than accepted-and-ignored. Deriving it instead of resetting `favoritesFirst`
  // means letting your last card go withdraws the sort AND returns the list to
  // the book's order in one move, and keeping a card again restores the sort
  // you had rather than making you ask for it twice.
  const canSort = favorites.size > 0;
  const sorting = favoritesFirst && canSort;
  const order = useMemo(() => displayOrder(QUOTES, favorites, sorting), [favorites, sorting]);

  const onPick = (index: number) => {
    setDeck((d) => goTo(d, index));
    setListing(false);
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      testID="view-mod01"
    >
      <View style={styles.header}>
        <ExitAndLabel lang={lang} />
        <Text
          testID="advice-label"
          style={[styles.headerLabel, { fontFamily: font('mono', 500, lang) }]}
        >
          {t.label}
        </Text>
      </View>

      <View testID="advice-modes" style={styles.modes}>
        <View style={styles.modesLeft}>
          <Pressable testID="mode-shuffle" onPress={() => setListing(false)} hitSlop={8}>
            <Text
              testID="mode-shuffle-label"
              style={[
                styles.mode,
                !listing && { color: accent },
                { fontFamily: font('mono', 500, lang) },
              ]}
            >
              {t.shuffle}
            </Text>
          </Pressable>
          <Pressable testID="mode-list" onPress={() => setListing(true)} hitSlop={8}>
            <Text
              testID="mode-list-label"
              style={[
                styles.mode,
                listing && { color: accent },
                { fontFamily: font('mono', 500, lang) },
              ]}
            >
              {`${t.all} ${QUOTES.length}`}
            </Text>
          </Pressable>
        </View>

        {/* The sort orders the list, so it is only offered while the list is
            what you are looking at. */}
        {listing ? (
          <Pressable
            testID="sort-favorites"
            onPress={() => setFavoritesFirst((on) => !on)}
            disabled={!canSort}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: sorting, disabled: !canSort }}
          >
            <Text
              style={[
                styles.mode,
                sorting && { color: accent },
                { fontFamily: font('mono', 500, lang) },
              ]}
            >
              {`${STAR_ON} ${t.first} ${favorites.size}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {listing ? (
        <FlatList
          testID="advice-list"
          data={order}
          style={styles.list}
          keyExtractor={(index) => String(index)}
          contentContainerStyle={styles.listBody}
          extraData={`${accent}:${favorites.size}`}
          renderItem={({ item: index, index: position }) => (
            // The row jumps to the card; its star is a nested Pressable, which
            // takes the touch itself, so keeping a card never opens it. The
            // numeral is the BOOK's number, not the row's — under the sort the
            // list runs out of order and the numeral is what says where a card
            // actually lives.
            <Pressable
              testID={`advice-row-${index}`}
              onPress={() => onPick(index)}
              style={[styles.row, position > 0 && styles.rowRule]}
            >
              <Text style={[styles.rowIndex, { fontFamily: font('mono', 500) }]}>
                {pad3(index + 1)}
              </Text>
              <Text style={styles.rowQuote}>{QUOTES[index]}</Text>
              <Star
                testID={`advice-row-${index}-star`}
                on={favorites.has(QUOTES[index])}
                accent={accent}
                onPress={() => void toggleFavorite(QUOTES[index])}
                lang={lang}
                style={styles.rowStar}
              />
            </Pressable>
          )}
        />
      ) : (
        <>
          {/* One fixed size and a ScrollView behind it, not a ladder: the
              longest highlight runs to 513 characters, and type that resized
              itself under the card would fight the frame it sits in — the same
              reason `voice()` stopped moving. */}
          <ScrollView
            testID="advice-card-scroll"
            style={styles.cardScroller}
            contentContainerStyle={styles.cardScroll}
          >
            <Pressable
              testID="advice-card"
              onPress={() => setDeck((d) => advance(d))}
              style={styles.card}
            >
              <Text testID="advice-quote" style={styles.quote}>
                {QUOTES[card]}
              </Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.counterRow}>
              <Text
                testID="advice-counter"
                style={[styles.counter, { color: accent, fontFamily: font('mono', 500) }]}
              >
                {`${pad3(card + 1)} / ${QUOTES.length}`}
              </Text>
              <Star
                testID="advice-star"
                on={favorites.has(QUOTES[card])}
                accent={accent}
                onPress={() => void toggleFavorite(QUOTES[card])}
                lang={lang}
                style={styles.star}
              />
            </View>
            <Text style={styles.attribution}>{`${SOURCE.author} · ${SOURCE.shortTitle}`}</Text>
            <Text
              testID="advice-hint"
              style={[styles.hint, { fontFamily: font('mono', 500, lang) }]}
            >
              {t.hint}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// The cabinet's preview of this room, painted in its own colours — the one
// place a module's theme shows through the shell's neutral chrome (spec §4).
function AdviceTile({ onPress }: { onPress: () => void }) {
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];
  return (
    // The slot numeral sits above the title, not centred with it (4a).
    <Pressable testID="tile-mod01" style={tileStyles.tile} onPress={onPress}>
      <Text style={[tileStyles.slot, { fontFamily: font('mono', 500, lang) }]}>01</Text>
      <Text style={[tileStyles.title, { fontFamily: serif(lang) }]}>{t.label}</Text>
    </Pressable>
  );
}

export const advice: ModuleDef = {
  id: 'mod01',
  slot: '01',
  Tile: AdviceTile,
  Screen: AdviceScreen,
  Settings: AdviceSettings,
  // Hydrate, refresh the horizon if the day has turned over, then take a tap
  // Android held while the app was dead. The listener is for taps arriving
  // while it is running, and its unsubscribe is what goes back to App.tsx.
  onBoot: async () => {
    await useAdviceStore.getState().hydrate();
    void useAdviceStore.getState().syncIfDue(useFacilityStore.getState().lang);

    const tapped = await readTapTarget();
    if (tapped != null) useFacilityStore.getState().openQuote(tapped);

    return onTap((index) => useFacilityStore.getState().openQuote(index));
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.advice.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: palette.advice.rule,
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
    color: palette.advice.inkSoft,
  },
  veraLabel: {
    fontSize: ms(10),
    color: palette.advice.inkSoft,
  },
  headerLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    color: palette.advice.inkDim,
  },
  modes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: MODE_AIR,
    paddingBottom: MODE_AIR,
  },
  modesLeft: {
    flexDirection: 'row',
    gap: 18,
  },
  mode: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.16,
    color: palette.advice.inkGhost,
  },
  // The scroller takes the room left under the mode row so the attribution and
  // the counter stay pinned at the foot; the card inside it centres, and only a
  // card too long to fit ever actually moves.
  cardScroller: {
    flex: 1,
  },
  cardScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  card: {
    backgroundColor: palette.advice.card,
    borderWidth: 1,
    borderColor: palette.advice.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  quote: {
    fontFamily: serif(),
    fontSize: ms(20),
    lineHeight: ms(20) * 1.42,
    color: palette.advice.ink,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  star: {
    fontSize: ms(16),
  },
  counter: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.16,
  },
  attribution: {
    marginTop: 7,
    fontFamily: serifItalic(),
    fontSize: ms(12),
    color: palette.advice.inkDim,
  },
  hint: {
    marginTop: 12,
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.1,
    color: palette.advice.inkGhost,
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
    gap: 14,
    paddingVertical: 16,
  },
  rowRule: {
    borderTopWidth: 1,
    borderColor: palette.advice.rule,
  },
  rowIndex: {
    fontSize: ms(8.5),
    lineHeight: ms(13) * 1.45,
    color: palette.advice.inkGhost,
    flexShrink: 0,
    minWidth: 24,
  },
  rowStar: {
    fontSize: ms(13),
    lineHeight: ms(13) * 1.45,
  },
  rowQuote: {
    flex: 1,
    fontFamily: serif(),
    fontSize: ms(13),
    lineHeight: ms(13) * 1.45,
    color: palette.advice.ink,
  },
});

const tileStyles = StyleSheet.create({
  // `height:86px; radius 14; padding:11px; justify-content:space-between`
  tile: {
    flex: 1,
    height: GRID_TILE_PX,
    borderRadius: 14,
    backgroundColor: palette.advice.card,
    borderWidth: 1,
    borderColor: palette.advice.cardBorder,
    justifyContent: 'space-between',
    padding: 11,
    overflow: 'hidden',
  },
  slot: {
    fontSize: ms(11),
    color: palette.advice.inkGhost,
  },
  title: {
    fontSize: ms(13),
    lineHeight: ms(13) * 1.25,
    color: palette.advice.ink,
  },
});
