import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';
import { MODES, MODE_ORDER } from '../vera/modes/registry';

// Her register, on the stage, because it is the one setting the subject is
// likely to change mid-conversation and SYSTEM is three taps away.
//
// The open flag lives in the store beside cabinetOpen and keyPanelOpen so that
// hardware back closes it first, but the bubble renders HERE rather than in
// ScreenRouter: it is anchored to the pill in the stage's own layout, unlike
// the two full-screen overlays, and ScreenRouter knows nothing about where the
// pill sits.
//
// Choosing is the whole interaction. setMode writes, closes this, and hands her
// a line out of the new mode's bank, so the change is heard at the moment it is
// made rather than on the next message.
export function ModePicker() {
  const lang = useFacilityStore((s) => s.lang);
  const mode = useFacilityStore((s) => s.mode);
  const open = useFacilityStore((s) => s.modePickerOpen);
  const setMode = useFacilityStore((s) => s.setMode);
  const setOpen = (modePickerOpen: boolean) => useFacilityStore.setState({ modePickerOpen });

  return (
    <View>
      <Pressable testID="mode-pill" style={styles.pill} onPress={() => setOpen(!open)}>
        <Text style={[styles.pillText, { fontFamily: font('mono', 500, lang) }]}>
          {MODES[mode].label[lang]}
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
                style={styles.choice}
                onPress={() => void setMode(id)}
              >
                <Text
                  style={[
                    styles.choiceText,
                    { fontFamily: font('mono', 500, lang) },
                    id === mode ? styles.choiceOn : null,
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

// The pill matches the conversation pill beside it exactly — same radius, same
// ground, same border — because they are the same kind of object.
const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.borderPill,
  },
  pillText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.2,
    color: palette.textPill,
  },
  // Reaches well past the stage in every direction: the pill sits near the top,
  // so a backdrop bounded by its own parent would leave most of the screen
  // dismissing nothing.
  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
  },
  bubble: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    alignSelf: 'center',
    minWidth: 180,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.border,
  },
  // The point at the top, which is what makes it something she is saying rather
  // than a menu.
  tail: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    backgroundColor: palette.panelAlt,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  choice: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  choiceText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.2,
    color: palette.textDim,
  },
  choiceOn: {
    color: palette.amber,
  },
});
