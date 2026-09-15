import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { MODES, MODE_ORDER } from '../vera/modes/registry';
import { T } from './strings';

// The logo, and the register behind it. Her name is the app's identity and is
// the first thing on the screen, so it is also the most reachable control on
// it: the register is the one setting worth changing mid-conversation, and
// SYSTEM is three taps away.
//
// The whole cluster is one tap target — wordmark, expansion and tag together —
// because they read as one object and picking a smaller target out of them
// would be a worse thing to hit than the thing it sits in.
//
// The open flag lives in the store beside cabinetOpen and keyPanelOpen so that
// hardware back closes the bubble first, but the bubble renders HERE rather
// than in ScreenRouter: it is anchored under the logo in the stage's own
// layout, unlike the two full-screen overlays, and the router knows nothing
// about where the logo sits.
//
// Choosing is the whole interaction. setMode writes, closes this, and hands her
// a line out of the new mode's bank, so the change is heard at the moment it is
// made rather than on the next message.
// `leading` goes INSIDE the title row rather than beside the whole component:
// the logo is two lines, and anything centred against the block sits halfway
// down it, level with neither line. The stage passes her pulse dot, which
// belongs level with her name.
export function ModePicker({ leading }: { leading?: ReactNode }) {
  const lang = useFacilityStore((s) => s.lang);
  const mode = useFacilityStore((s) => s.mode);
  const open = useFacilityStore((s) => s.modePickerOpen);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const setMode = useFacilityStore((s) => s.setMode);
  const setOpen = (modePickerOpen: boolean) => useFacilityStore.setState({ modePickerOpen });

  // The logo is on screen before she has been woken; the register is not. She
  // has none until there is a key, so a dormant stage shows the name alone and
  // the logo is not a control.
  const awake = !!apiKey;

  return (
    <View>
      <Pressable
        testID="mode-trigger"
        disabled={!awake}
        onPress={() => setOpen(!open)}
        hitSlop={8}
      >
        <View testID="mode-title-row" style={styles.titleRow}>
          {leading}
          <Text style={[styles.wordmark, { fontFamily: font('mono', 600, lang) }]}>V.E.R.A.</Text>
          {awake ? (
            <View
              testID="mode-tag-pill"
              style={[
                styles.tagPill,
                {
                  backgroundColor: palette.mode[mode].wash,
                  borderColor: palette.mode[mode].edge,
                },
              ]}
            >
              <Text
                testID="mode-tag"
                style={[
                  styles.tag,
                  { fontFamily: font('mono', 600, lang), color: palette.mode[mode].ink },
                ]}
              >
                {MODES[mode].tag[lang]}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Her name, spelled out. Always English — see the note in strings.ts. */}
        <Text style={[styles.expansion, { fontFamily: font('mono', 500, lang) }]}>
          {T[lang].veraFull}
        </Text>
      </Pressable>

      {open ? (
        <>
          {/* Covers the stage so a tap anywhere else dismisses without
              choosing. Before the bubble in the tree, so the bubble's own
              presses land on the bubble. */}
          <Pressable
            testID="mode-backdrop"
            style={styles.backdrop}
            onPress={() => setOpen(false)}
          />
          <View testID="mode-bubble" style={styles.bubble}>
            <View style={styles.tail} />
            {MODE_ORDER.map((id) => (
              <Pressable
                key={id}
                testID={`mode-choice-${id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: id === mode }}
                style={[styles.choice, { borderLeftColor: palette.mode[id].ink }]}
                onPress={() => void setMode(id)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    { fontFamily: font('mono', 500, lang) },
                    id === mode ? { color: palette.mode[id].ink } : null,
                  ]}
                >
                  {MODES[id].label[lang]}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Verbatim from the header's own wordmark, which this replaces.
  wordmark: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.22,
    color: palette.textDim,
  },
  // A badge she is wearing, not a second word of her name: filled and edged in
  // the register's own colour, on the SEND button's wash-and-edge idiom.
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    borderWidth: 1,
  },
  tag: {
    fontSize: ms(6.5),
    letterSpacing: ms(6.5) * 0.18,
  },
  expansion: {
    marginTop: 3,
    fontSize: ms(6.5),
    letterSpacing: ms(6.5) * 0.14,
    color: palette.textGhost,
  },
  // Reaches well past the logo in every direction: it sits in the top-left
  // corner, so a backdrop bounded by its own parent would leave almost the
  // whole screen dismissing nothing.
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 29,
    elevation: 29,
  },
  // Left-aligned under the logo rather than centred, because the thing it
  // belongs to is in the corner.
  bubble: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 10,
    // It hangs out of the header and over the conversation pill below it.
    // Later siblings paint on top in React Native, so both of these are
    // load-bearing — zIndex for the JS-side order, elevation because Android
    // stacks by elevation regardless of it — and so is the header's own zIndex
    // in Stage, without which nothing inside the header can rise above a later
    // sibling at all.
    zIndex: 30,
    elevation: 30,
    minWidth: 190,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.border,
  },
  // The point at the top, near the left edge, aimed at the logo it came out
  // of. It is what makes this something she is saying rather than a menu.
  tail: {
    position: 'absolute',
    top: -5,
    left: 18,
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    backgroundColor: palette.panelAlt,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  // Each choice carries its own register's colour as a stripe down its left
  // edge, so the two are told apart before either is read.
  choice: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderLeftWidth: 2,
  },
  choiceText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.2,
    color: palette.textDim,
  },
});
