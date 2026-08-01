import React, { useEffect, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { fluid } from '../core/fluid';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif } from '../core/theme';
import { EMOTIONS, emotionLabel } from '../vera/emotions';
import { KeyGate } from './KeyGate';
import { Optic } from './Optic';
import { T } from './strings';

// Nothing on the stage but her: an eye, a label, one line of dialogue, one
// input, and a drawer handle. Everything below is in service of that.

const GAZE_RANGE_PX = 120; // finger travel, in px, that reads as a full gaze deflection
const GAZE_CLAIM_PX = 8; // move threshold before the stage claims the gesture (lets taps through)
const DRAWER_DRAG_PX = 22; // upward travel on the handle that counts as "open" (spec: >22px)

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

// A single opacity breathe, reused for the header's pulsing dot and the
// thinking indicator — the only two things on the stage that animate outside
// the optic itself.
function usePulseOpacity(duration: number, from: number, to: number) {
  const v = useSharedValue(from);
  useEffect(() => {
    v.value = withRepeat(
      withSequence(withTiming(to, { duration }), withTiming(from, { duration })),
      -1,
      true,
    );
    return () => cancelAnimation(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return useAnimatedStyle(() => ({ opacity: v.value }));
}

function PulseDot({ color }: { color: string }) {
  const style = usePulseOpacity(900, 0.35, 1);
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

function ThinkingDots() {
  const style = usePulseOpacity(500, 0.3, 1);
  return <Animated.Text style={style}>...</Animated.Text>;
}

export function Stage() {
  const apiKey = useFacilityStore((s) => s.apiKey);
  const emotion = useFacilityStore((s) => s.emotion);
  const lang = useFacilityStore((s) => s.lang);
  const shown = useFacilityStore((s) => s.shown);
  const thinking = useFacilityStore((s) => s.thinking);
  const draft = useFacilityStore((s) => s.draft);
  const log = useFacilityStore((s) => s.log);
  const cabinetOpen = useFacilityStore((s) => s.cabinetOpen);
  const setDraft = useFacilityStore((s) => s.setDraft);
  const setCabinet = useFacilityStore((s) => s.setCabinet);
  const setView = useFacilityStore((s) => s.setView);

  const awake = Boolean(apiKey);
  const t = T[lang];
  const iris = EMOTIONS[emotion].iris;
  const { fontSize, lineHeight } = fluid(shown, lang);

  const gaze = useSharedValue({ x: 0, y: 0 });

  // A pan over the whole stage nudges her gaze; the optic itself clamps the
  // travel by how far this emotion is willing to track (opticGeometry.track).
  const stagePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > GAZE_CLAIM_PX || Math.abs(g.dy) > GAZE_CLAIM_PX,
      onPanResponderMove: (_evt, g) => {
        gaze.value = { x: clamp(g.dx / GAZE_RANGE_PX), y: clamp(g.dy / GAZE_RANGE_PX) };
      },
      onPanResponderRelease: () => {
        gaze.value = { x: 0, y: 0 };
      },
      onPanResponderTerminate: () => {
        gaze.value = { x: 0, y: 0 };
      },
    }),
  ).current;

  // The drawer handle answers to either a tap or an upward drag past 22px —
  // one responder covers both, since claiming it mid-drag would otherwise
  // fight a Pressable's own touch handling.
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_evt, g) => {
        if (cabinetOpen) return;
        const isTap = Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4;
        if (isTap || g.dy < -DRAWER_DRAG_PX) setCabinet(true);
      },
    }),
  ).current;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    // Task 12 wires this to the store's speak() action once it exists.
  };

  return (
    <View style={styles.stage} {...stagePan.panHandlers}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PulseDot color={iris} />
          <Text style={[styles.wordmark, { fontFamily: font('mono', 600, lang) }]}>V.E.R.A.</Text>
        </View>
        {awake ? (
          <Pressable onPress={() => setView('sys')} hitSlop={12}>
            <Text style={styles.headerDots}>•••</Text>
          </Pressable>
        ) : null}
      </View>

      {log.length > 0 && apiKey ? (
        <Pressable style={styles.pill} onPress={() => setView('log')}>
          <View style={styles.hairlines}>
            <View style={[styles.hairline, styles.hairlineAmber]} />
            <View style={styles.hairline} />
            <View style={styles.hairline} />
          </View>
          <Text style={[styles.pillText, { fontFamily: font('mono', 600, lang) }]}>{t.conv}</Text>
        </Pressable>
      ) : null}

      <View style={styles.centre}>
        <Optic emotion={emotion} size={158} gaze={gaze} />
        <View style={styles.labelRow}>
          <View style={[styles.emotionDot, { backgroundColor: iris }]} />
          <Text style={[styles.emotionLabel, { fontFamily: font('mono', 600, lang) }]}>
            {emotionLabel(emotion, lang)}
          </Text>
        </View>
        <Text
          testID="her-line"
          style={StyleSheet.flatten([
            styles.line,
            { fontSize, lineHeight, fontFamily: serif(lang) },
          ])}
        >
          {shown}
          {thinking ? <ThinkingDots /> : null}
        </Text>
      </View>

      {awake ? (
        <>
          <View style={styles.inputRow}>
            <Text style={styles.chevron}>›</Text>
            <TextInput
              style={[styles.input, { fontFamily: font('mono', 500, lang) }]}
              value={draft}
              onChangeText={setDraft}
              placeholder={t.ask}
              placeholderTextColor={palette.textFaint}
              onSubmitEditing={send}
            />
            <Pressable onPress={send} hitSlop={8}>
              <Text style={[styles.send, { fontFamily: font('mono', 600, lang) }]}>{t.send}</Text>
            </Pressable>
          </View>

          <View style={styles.drawer} {...handlePan.panHandlers}>
            <View style={styles.handleBar} />
            <Text style={[styles.handleLabel, { fontFamily: font('mono', 600, lang) }]}>
              {t.cabinet}
            </Text>
          </View>
        </>
      ) : (
        <KeyGate />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  wordmark: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.22,
    color: palette.amber,
  },
  headerDots: {
    fontSize: ms(11),
    color: palette.textDim,
  },
  pill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
  },
  hairlines: {
    gap: 2,
  },
  hairline: {
    width: 14,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#6c6656',
  },
  hairlineAmber: {
    backgroundColor: palette.amber,
  },
  pillText: {
    fontSize: ms(8.5),
    letterSpacing: ms(8.5) * 0.1,
    color: palette.textMuted,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emotionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emotionLabel: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.22,
    color: palette.textDim,
  },
  line: {
    marginTop: 18,
    maxWidth: '88%',
    textAlign: 'center',
    color: palette.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderColor: palette.hairline,
    paddingTop: 14,
    marginBottom: 14,
  },
  chevron: {
    fontSize: ms(16),
    color: palette.amber,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: ms(11),
    color: palette.text,
  },
  send: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.12,
    color: palette.amber,
  },
  drawer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  handleBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.hairline,
  },
  handleLabel: {
    fontSize: ms(7),
    letterSpacing: ms(7) * 0.26,
    color: palette.textFaint,
  },
});
