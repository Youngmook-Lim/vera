import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../../core/i18n';
import { useFacilityStore } from '../../core/store';
import { EMOTIONS } from '../../vera/emotions';
import { font, ms, palette, serif } from '../../core/theme';
import type { ModuleDef } from '../types';
import { advance, current, goTo, newDeck } from '../deck';
import { displayOrder } from '../favorites';
import { compactScore, storyKey } from './card';
import { SOURCE, STORIES } from './stories';
import { useHorror } from './store';
import { T } from './strings';
import { HorrorSettings } from './Settings';
import { onTap, readTapTarget } from './notify';
import { useHorrorStore } from './store';

const GRID_TILE_PX = 86; // the cabinet's grid cell, shared by every slot

const pad4 = (n: number) => String(n).padStart(4, '0');

// The air around the mode row, above and below — the same measurement either
// side, so the containers underneath contribute no top padding of their own.
const MODE_AIR = 14;

const STAR_ON = '★';
const STAR_OFF = '☆';
const UPVOTE = '▲';

// Every story's key, computed once. The list's sort needs all of them and the
// corpus never changes at runtime.
const KEYS = STORIES.map(storyKey);

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
        style={[style, { color: on ? accent : palette.horror.inkGhost }]}
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

// The withheld second sentence, standing where it will appear. Two bars rather
// than one: a single rule reads as a divider, and what this has to read as is
// a sentence that is being kept from you.
function Redaction() {
  return (
    <View testID="horror-redaction" style={styles.redaction}>
      <View style={[styles.redactionBar, { width: '100%' }]} />
      <View style={[styles.redactionBar, { width: '58%' }]} />
    </View>
  );
}

export function HorrorScreen() {
  // Full bleed means full bleed: the room paints under the status bar and the
  // gesture bar, so it has to pad itself back off them. Without this the
  // header sits underneath Android's own top bar. The advice room does the
  // same, and a room that forgets it looks broken rather than immersive.
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const emotion = useFacilityStore((s) => s.emotion);
  const t = T[lang];

  // The room is in her building, so it is lit in whatever she is wearing —
  // the same as the advice room, and for the same reasons set out there.
  const accent = EMOTIONS[emotion].iris;

  // The deck lives for as long as the room is open. Nothing is written down:
  // a pass you did not finish is not a thing worth keeping.
  const [deck, setDeck] = useState(() => newDeck(STORIES.length));
  const [listing, setListing] = useState(false);
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  // Whether THIS card has been turned over. Never persisted and never carried
  // to the next card: a story you have already been shown the end of is not a
  // story, so dealing always re-hides.
  const [revealed, setRevealed] = useState(false);

  const { favorites, toggleFavorite, hidden, setHidden } = useHorror();

  const pendingStory = useFacilityStore((s) => s.pendingStory);

  // A story a notification asked for. Taken once and cleared, so walking back
  // into the room later deals an ordinary card. goTo moves the position within
  // this pass rather than starting a new one, so arriving here does not throw
  // away the rest of the shuffle — and it arrives REVEALED whatever the
  // withholding says, because the tap on
  // the notification was the asking and there is nothing left to withhold.
  useEffect(() => {
    if (pendingStory == null) return;
    setDeck((d) => goTo(d, pendingStory));
    setRevealed(true);
    setListing(false);
    useFacilityStore.setState({ pendingStory: null });
  }, [pendingStory]);

  const card = current(deck);
  const story = STORIES[card];
  const key = KEYS[card];
  // The turn is on screen when the room is not withholding it, or when this
  // card has been turned over. One expression, so the card and the hint can
  // never disagree about which tap you are on.
  const shown = !hidden || revealed;

  const canSort = favorites.size > 0;
  const sorting = favoritesFirst && canSort;
  const order = useMemo(() => displayOrder(KEYS, favorites, sorting), [favorites, sorting]);

  const onPick = (index: number) => {
    setDeck((d) => goTo(d, index));
    setRevealed(false);
    setListing(false);
  };

  // The card's one gesture, resolved in stages. Hidden and unturned, a tap
  // turns it; anything else deals the next. When the room is not withholding,
  // the first branch never fires and this is the advice card exactly.
  const onCard = () => {
    if (hidden && !revealed) {
      setRevealed(true);
      return;
    }
    setDeck((d) => advance(d));
    setRevealed(false);
  };

  // Turning withholding back ON has to take the sentence on screen with it,
  // or the setting would read HIDDEN over a card showing its own ending.
  const onToggleHidden = () => {
    const next = !hidden;
    if (next) setRevealed(false);
    void setHidden(next);
  };

  return (
    <View
      testID="view-mod02"
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        <ExitAndLabel lang={lang} />
        <Text
          testID="horror-label"
          style={[styles.headerLabel, { fontFamily: font('mono', 500, lang) }]}
        >
          {t.label}
        </Text>
      </View>

      <View testID="horror-modes" style={styles.modes}>
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
              {`${t.all} ${STORIES.length}`}
            </Text>
          </Pressable>
        </View>

        {/* Each control belongs to the thing it governs: the sort orders the
            list, the withholding governs the card, so each is offered only
            while that is what you are looking at. */}
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
        ) : (
          <Pressable
            testID="toggle-hidden"
            onPress={onToggleHidden}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: hidden }}
          >
            <Text
              testID="toggle-hidden-label"
              style={[
                styles.mode,
                hidden && { color: accent },
                { fontFamily: font('mono', 500, lang) },
              ]}
            >
              {t.hidden}
            </Text>
          </Pressable>
        )}
      </View>

      {listing ? (
        <FlatList
          testID="horror-list"
          data={order}
          style={styles.list}
          keyExtractor={(index) => String(index)}
          contentContainerStyle={styles.listBody}
          extraData={`${accent}:${favorites.size}`}
          renderItem={({ item: index, index: position }) => (
            // The list is the archive and always reads whole — the withholding
            // governs the card, which is where you go to be got. Its star is a
            // nested Pressable, which takes the touch itself, so keeping a
            // story never opens it.
            <Pressable
              testID={`horror-row-${index}`}
              onPress={() => onPick(index)}
              style={[styles.row, position > 0 && styles.rowRule]}
            >
              <Text style={[styles.rowIndex, { fontFamily: font('mono', 500) }]}>
                {pad4(index + 1)}
              </Text>
              <View style={styles.rowText}>
                <Text style={styles.rowSetup}>{STORIES[index].setup}</Text>
                <Text style={styles.rowTurn}>{STORIES[index].turn}</Text>
              </View>
              <Star
                testID={`horror-row-${index}-star`}
                on={favorites.has(KEYS[index])}
                accent={accent}
                onPress={() => void toggleFavorite(KEYS[index])}
                lang={lang}
                style={styles.rowStar}
              />
            </Pressable>
          )}
        />
      ) : (
        <>
          <ScrollView
            testID="horror-card-scroll"
            style={styles.cardScroller}
            contentContainerStyle={styles.cardScroll}
          >
            <Pressable
              testID="horror-card"
              onPress={onCard}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={shown ? undefined : t.reveal}
            >
              <Text testID="horror-setup" style={styles.sentence}>
                {story.setup}
              </Text>
              {shown ? (
                <Text testID="horror-turn" style={[styles.sentence, styles.turn]}>
                  {story.turn}
                </Text>
              ) : (
                <Redaction />
              )}
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.counterRow}>
              <Text
                testID="horror-counter"
                style={[styles.counter, { color: accent, fontFamily: font('mono', 500) }]}
              >
                {`${pad4(card + 1)} / ${STORIES.length}`}
              </Text>
              <Star
                testID="horror-star"
                on={favorites.has(key)}
                accent={accent}
                onPress={() => void toggleFavorite(key)}
                lang={lang}
                style={styles.star}
              />
            </View>
            {/* No story carries an author, so the line that would credit one
                credits the community and carries the only quality signal the
                scrape has. */}
            <Text testID="horror-score" style={styles.attribution}>
              {`${UPVOTE} ${compactScore(story.score)} · ${SOURCE.community}`}
            </Text>
            <Text
              testID="horror-hint"
              style={[styles.hint, { fontFamily: font('mono', 500, lang) }]}
            >
              {shown ? t.hintNext : t.hintReveal}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// The cabinet's preview of this room, painted in its own colours — the one
// place a module's theme shows through the shell's neutral chrome (spec §4).
function HorrorTile({ onPress }: { onPress: () => void }) {
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];
  return (
    <Pressable testID="tile-mod02" style={tileStyles.tile} onPress={onPress}>
      <Text style={[tileStyles.slot, { fontFamily: font('mono', 500, lang) }]}>02</Text>
      <Text style={[tileStyles.title, { fontFamily: serif(lang) }]}>{t.label}</Text>
    </Pressable>
  );
}

export const horror: ModuleDef = {
  id: 'mod02',
  slot: '02',
  Tile: HorrorTile,
  Screen: HorrorScreen,
  Settings: HorrorSettings,
  onBoot: async () => {
    await useHorrorStore.getState().hydrate();
    void useHorrorStore.getState().syncIfDue(useFacilityStore.getState().lang);

    const tapped = await readTapTarget();
    if (tapped != null) useFacilityStore.getState().openStory(tapped);

    return onTap((index) => useFacilityStore.getState().openStory(index));
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.horror.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: palette.horror.rule,
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
    color: palette.horror.inkSoft,
  },
  veraLabel: {
    fontSize: ms(10),
    color: palette.horror.inkSoft,
  },
  headerLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.14,
    color: palette.horror.inkDim,
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
    color: palette.horror.inkGhost,
  },
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
    backgroundColor: palette.horror.card,
    borderWidth: 1,
    borderColor: palette.horror.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 26,
    gap: 14,
  },
  sentence: {
    fontFamily: serif(),
    fontSize: ms(19),
    lineHeight: ms(19) * 1.45,
    color: palette.horror.ink,
  },
  // The turn is the room. It reads a shade brighter than the setup so the
  // second sentence lands as the thing arriving rather than more of the first.
  turn: {
    color: palette.horror.ink,
  },
  // Sized off the sentence's own line height, so the bars stand exactly where
  // the words will be and the card does not resize when it turns over.
  redaction: {
    gap: 8,
    paddingVertical: ms(19) * 0.22,
  },
  redactionBar: {
    height: ms(19),
    borderRadius: 3,
    backgroundColor: palette.horror.redaction,
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
    fontFamily: font('mono', 500),
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.1,
    color: palette.horror.inkDim,
  },
  hint: {
    marginTop: 12,
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.1,
    color: palette.horror.inkGhost,
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
    borderColor: palette.horror.rule,
  },
  rowIndex: {
    fontSize: ms(8.5),
    lineHeight: ms(13) * 1.45,
    color: palette.horror.inkGhost,
    flexShrink: 0,
    minWidth: 30,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowSetup: {
    fontFamily: serif(),
    fontSize: ms(13),
    lineHeight: ms(13) * 1.45,
    color: palette.horror.ink,
  },
  rowTurn: {
    fontFamily: serif(),
    fontSize: ms(13),
    lineHeight: ms(13) * 1.45,
    color: palette.horror.inkSoft,
  },
  rowStar: {
    fontSize: ms(13),
    lineHeight: ms(13) * 1.45,
  },
});

const tileStyles = StyleSheet.create({
  // `height:86px; radius 14; padding:11px; justify-content:space-between`
  tile: {
    flex: 1,
    height: GRID_TILE_PX,
    borderRadius: 14,
    backgroundColor: palette.horror.card,
    borderWidth: 1,
    borderColor: palette.horror.cardBorder,
    justifyContent: 'space-between',
    padding: 11,
    overflow: 'hidden',
  },
  slot: {
    fontSize: ms(11),
    color: palette.horror.inkGhost,
  },
  title: {
    fontSize: ms(13),
    lineHeight: ms(13) * 1.25,
    color: palette.horror.ink,
  },
});
