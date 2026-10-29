# AFFIRMATIONS: module 04 — design

**Date:** 2026-10-29
**Status:** decided in conversation, awaiting written review

## Intent

A room for reading affirmations, one at a time, swiping between them. **It is
sincere and it is the subject's**: real affirmations they want to read, the way
the advice room is a real book. It is not played against her deadpan, and she is
told nothing about it.

It must look like no other room. Every room so far shares one set of bones: a
near-black or near-white ground, a bordered card, serif type and small mono
labels. This one is a **poster**.

**What was decided with the subject:**

| question | answer |
|---|---|
| purpose | sincere, for them |
| source | Louise Hay, gathered from her own published pages |
| movement | swipe |
| extras | favourites, a daily card, a list of all of them |
| daily card | **10:00** every day |
| look | D · Poster: huge heavy sans, flush left, on a full field of colour |
| colour | a new colour every card, from a fixed set; each affirmation always wears the same one |
| theme | the colours are the same in dark and light |
| list | a quiet neutral list, a small chip of each card's colour |

The mockups are in `.superpowers/brainstorm/` (git-ignored):
`visual-style.html`, `poster-colour.html`, `poster-theme.html`, `poster-list.html`.

## 1. The corpus

**Louise Hay's affirmations, from louisehay.com.** About 155 distinct lines,
verbatim, from two pages on her official site:

- `https://www.louisehay.com/affirmations/` (69 entries, the line in each
  image's alt text, one repeated);
- `https://www.louisehay.com/101-best-louise-hay-positive-affirmations/`
  (101 numbered, #94 repeats #60).

About a dozen lines appear on both. Her ailment list ("Heal Your Body") is left
out: it is not on her own site, and its lines name an illness each.

**Gathered by a script that is checked in**, the horror room's pattern:
`tools/build-affirmations.mjs` fetches both pages, extracts the lines, trims
them, removes exact duplicates, and writes `src/modules/affirmations/lines.ts`:
a `readonly string[]` plus a `SOURCE` naming the author and both URLs. **The
output is reviewed by hand before it is committed**, since the pages are a
website and not a book: a line that is a page caption rather than an
affirmation is removed in the script's own exclusion list, so a re-run stays
reproducible. The script makes network requests; no test runs it.

**Near-duplicates are kept** ("I am at home in my life." and "I am at home in my life. All is well."). They are her own two wordings, and a test can only decide
exact identity.

**The order is the file's order**: the 101-best page first, in its own
numbering, then the other page's new lines in page order. A card's numeral is its
position in this file, so the order is pinned by a test for the reason
`stories.test.ts` pins the horror room's: re-running the script must not
renumber a card.

**Copyright.** Her lines are still under copyright. **This is a personal build,
the same footing as the horror room**, and the corpus would have to be replaced
before the app was ever shipped. `CLAUDE.md` records this beside the horror
room's note.

**English whatever the interface is set to**, as the advice cards are: a
translated Louise Hay would be a different author. Only the room's chrome is
translated.

## 2. The card

One affirmation fills the screen.

- **The field** is the card's colour, edge to edge, behind the status bar.
- **The numeral** is the card's own position in the corpus, three digits
  (`042`), large and at about 35% opacity, top left under the exit. It is where
  the card LIVES, never how far through the shuffle you are: the 2026-09-22 rule
  every room follows.
- **The line** is Space Grotesk 700, already bundled, set large, tight-leaded
  and flush left. It is one size with a ScrollView behind it, the advice room's
  answer to a long line. The longest of her lines is short enough that this is a
  safety net.
- **The credit**, `Louise Hay`, small, under the line.
- **The progress bar**, a hairline near the bottom: how far through this pass
  you are. This is the one place the shuffle's position is shown, and it is not a
  number, so it cannot be confused with the numeral.
- **The star** at the bottom left keeps the card, as the advice room's does. It
  sits outside the line deliberately.
- **CARDS / LIST** at the bottom, the mode switch every room with a list has.

Type and chrome on a card are **white or near-black, whichever its field
carries** (§4).

**The exit** is the shell's: top-left, 44px. It is drawn in the card's type
colour, because on a full field of colour there is no fixed ink that reads on
all six. The doorway rule says the exit is in the module's own ink, and this
room's ink is the card's.

## 3. Swiping

Swipe left for the next card and right for the previous one. The cards follow the
finger and settle on release; a short or slow swipe springs back.

**`PanResponder` drives a reanimated shared value. No new dependency is
added.** `react-native-gesture-handler` is not installed, and it is native, so
adding it would mean a rebuild for a gesture React Native already provides. The
stage's old drawer handle used `PanResponder` for the same reason.

**The order is a shuffled pass**, `deck.ts`, exactly as in the advice room:
every card once before any card twice, a seam that never repeats, and the pass
held in the room's store so walking out and back in does not reshuffle. It
dies with the process.

**Going back is new to `deck.ts`**: `retreat(deck)` steps one place back within
the pass. At the first card of the pass it does nothing: the previous pass's
order is gone, and a pager that stopped at its first page is the honest shape.
It is pure and tested beside `advance`.

**A tap does nothing.** The advice room deals on a tap; here the swipe is the
whole gesture, and a tap that also dealt would fire on every imperfect swipe.

## 4. Colour

**Six fields, and each affirmation always wears the same one**: the card at
corpus index `i` wears field `i % 6`. A card you come back to looks as you
remember it, and two neighbours in the file never share one. In shuffled order
two adjacent cards can share a field. That is accepted, since a swipe still
moves the numeral and the line.

The six are chosen in the plan, from the mockup's cobalt, red, yellow, green,
pink and near-black. **Each field is paired with its type colour, white or
near-black, and every pair holds 4.5:1**, the AA bar `palettes.test.ts` already
applies to the app's derived type colours. The mockup's red, `#e8452c` with
white, is 3.9:1 and does not pass, so it is darkened. Every hex lives in
`theme.ts`.

**The fields are the same in dark and light.** They are the cards themselves.
Walking in from a dark stage at night is a bright room, and that was the
choice. In `theme.ts` the block is written once and referenced by both palettes,
the way `organism` is, with a comment saying this one is deliberate and
permanent, not deferred.

**The list follows the theme** (§5), so the room has a themed half: its own
`RoomInk` block, a neutral ladder tinted like the other rooms' blocks. The two
halves sit in one `affirmations` block in the palette.

**She does not light this room.** The advice and horror rooms take their accent
from her iris; this one has colours of its own. A sincere room should not turn
red because she was alarmed.

## 5. The list

LIST shows every affirmation, a `FlatList` on the room's themed ground:

- each row is a small chip in its card's field colour, the numeral, the line,
  and the star;
- tapping a row opens that card with `goTo`, within the current pass;
- the star on a row is a nested Pressable that keeps the card without opening
  it;
- **★ FIRST N** sorts kept cards to the top, offered only while the list is up,
  disabled with nothing kept, derived from `favoritesFirst && favorites.size > 0`
  rather than reset. Stable in both halves. All of it is the advice room's
  behaviour, unchanged.

Favourites are keyed by the line's own text, via the shared `favorites.ts`, so a
re-run of the script that moved a line would not move a favourite.

## 6. The daily card

One affirmation at **10:00** every day, built by the shared `makeDaily`:

- `room: 'affirmations'`, channel `affirmations.v1` (new, so no legacy
  channel), channel name `AFFIRMATIONS`;
- the title is the room's label; the body is the line, then `— Louise Hay`;
- `planDaily`'s default draw over ninety days, the advice room's horizon;
- off by default, switched on from a SYSTEM row the room contributes through
  `ModuleDef.Settings`, with the permission ceremony and the battery ask that
  `request()` already carries.

**Tapping it opens the room on that card.** `openAffirmation(index)` in
`core/store.ts` sets `view: 'mod04'` and `pendingAffirmation`, beside
`openQuote` and `openStory`, and the room deals it with `goTo` and clears it.
It is not persisted, for the reason `pendingQuote` is not. `onBoot` hydrates,
syncs if due, takes a held tap and subscribes to new ones, as both rooms' hooks
do.

Her voice already stays silent here: since 2026-10-29 she never starts inside a
room, and the tap opens this one before the greeting runs.

## 7. Where it lives

- `src/modules/affirmations/`: `index.tsx` (the `ModuleDef`, its tile, the
  screen), `lines.ts`, `store.ts`, `stored.ts`, `notify.ts`, `Settings.tsx`,
  `strings.ts`, and `colour.ts` (the pure `fieldFor(index)`), with
  `__tests__/` beside them.
- `registry.ts`: `affirmations` in slot 04.
- `core/storage.ts`: `KEYS.affirmations` = `facility.mod.affirmations`, holding
  `favorites`, `daily` and `syncedOn`. The deck is state, not `Stored`.
- `core/theme.ts`: the `affirmations` block.
- `core/store.ts`: `pendingAffirmation` and `openAffirmation`.
- `modules/deck.ts`: `retreat`.
- `tools/build-affirmations.mjs`.

**The tile** in the cabinet is the room's first field, its slot numeral, and
`AFFIRMATIONS`, at the same 86px geometry as every slot.

**Strings**: `label` `AFFIRMATIONS` / `확언`, `cards`, `list`, `first`, and the
SYSTEM row's label, `DAILY AFFIRMATION` / `오늘의 확언`. A native-speaker check
of the Korean joins the outstanding one.

## 8. Testing

**`npm test` covers:**

- the corpus: its count, trimmed, no exact duplicates, the source named, and
  the order pinned;
- `fieldFor`: stable per index, cycles through all six, and every field holds
  4.5:1 against its type colour;
- `retreat`: one step back within a pass, nothing at the first card, and it never
  crosses the seam;
- the store: favourites toggle and persist by text, the deck survives a remount,
  `daily` and `syncedOn` round-trip;
- notify: the room tags its cards, the hour is 10, and the body carries the line
  and the credit;
- the tap: `openAffirmation` lands on `mod04` and the room deals that card;
- the screen: the numeral is the corpus index, the star keeps the card on screen,
  the list opens a card and keeps one without opening it, and ★ FIRST is offered
  only in the list;
- the palette: the `affirmations` block's fields are identical in both
  palettes.

**The device covers what jest cannot:**

- the swipe's feel, follow and spring-back;
- the colours on a real screen;
- the 10:00 card arriving;
- a tap on it opening the right card with no voice.

The swipe is reanimated and gesture-driven. As on the stage, a worklet is
unreachable from jest, so the decision of whether a release moves the card is a
pure function, `settle(dx, vx)`, tested on its own.

## 9. Out of scope

- Her ailment list, and any other source.
- Categories or filters. Neither page tags its lines in a way worth carrying.
- Voicing the affirmations. Her voice is hers, and these are not her lines.
- A per-card colour the subject chooses.
- A time picker for the daily card. It is fixed at 10:00, like every other room's.
