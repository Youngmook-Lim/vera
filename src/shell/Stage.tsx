import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { longWarning } from '../core/conversation';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, serif, voice } from '../core/theme';
import { EMOTIONS, emotionLabel, type EmotionKey } from '../vera/emotions';
import { KeyGate } from './KeyGate';
import { ModePicker } from './ModePicker';
import { Optic } from './Optic';
import { gazeFor } from './opticGeometry';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useKeyboardInset, useKeyboardProgress } from './useKeyboardInset';
import { SYSTEM_TEXT } from './systemText';
import { T } from './strings';
import { ThinkingDots } from './ThinkingDots';

// Nothing on the stage but her: an eye, a label, one line of dialogue, one
// input, and a drawer handle. Everything below is in service of that.

const OPTIC_PX = 158;
const LOOK_MS = 420; // the design's own pupil transition
const HOLD_MS = 2600; // how long she keeps looking where you touched
const RELEASE_MS = 900; // and how unhurriedly she gives it up
const DRAWER_DRAG_PX = 22; // upward travel on the handle that counts as "open" (spec: >22px)

// How long SEND holds its lit state after your finger leaves. Long enough that
// a quick tap is visible, short enough that it never reads as "still working".
export const SEND_LATCH_MS = 120;

// One vocabulary for both of the stage's inputs, for a line leaving and for a
// poke landing. Module scope because it closes over nothing.
//
// HEAVY, not the light impact this started as: confirmed on the phone as too
// faint to notice. Android scales this against the system's own haptic
// strength setting, so the ceiling is not ours to raise past here — the only
// step beyond is a different texture (`Rigid`, sharper rather than stronger),
// not more force.
//
// Both call sites fire it on the OUTCOME, never on the touch — her eye takes a
// press whether or not she is in any state to answer it, and SEND's guards are
// reachable from the keyboard's return key even while the button is disabled.
// The rejection is swallowed: a device with no motor must not take the stage
// down over a missing buzz.
const buzz = (): void => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};
const HEADER_DOT_PX = 5;
const STRIP_DOT_PX = 4;
const WINDOW_MAX_PX = 300; // 3a: "the window keeps roughly 300px"

// How the leftover height between the pill row and the input box is shared: one
// part above the eye, one below it, and this many under her window. Measured
// against the device — at 1 (an even split) her window sat at 63% of the screen
// with the keys down, which read as floating low; at 3 it lands near half.
const SLACK_BELOW_WINDOW = 3;

// The gaps under her window and under the input box: 3a's own numbers at rest,
// each box's own side margin once the keys are up and the two are stacked
// surfaces whose spacing is read against the space beside them.
// Her window's own sides, and its bottom while the keyboard is up — where it is
// squared off against itself the way the input box is. 3a's own 18, which is
// two narrower than the input box's 20; that difference is the design's and is
// not ours to even out.
const WINDOW_MARGIN = 18;

const WINDOW_GAP_DOWN = 14;
const INPUT_GAP_DOWN = 14;
const INPUT_MARGIN_SIDE = 20;

// Everything the keyboard changes the SHAPE of, as one function of how far it
// has travelled. `progress` is 0 with the keys down and 1 with them fully up,
// and every value here moves continuously between the two — which is the whole
// point. These used to switch on a boolean from the JS thread, so they all
// changed in a single frame at the START of the keyboard's travel while the
// stage's padding was still sliding underneath them: layout jumped, then the
// screen slid, and the pair read as a jolt.
//
// Pure and exported, because the wiring above it is not testable. The animated
// styles run on the UI thread and jest's keyboard mock leaves progress at 0
// forever, so what the tests can hold is this: the two ends and the fact that
// it is a ramp between them rather than a step. Whether the ramp actually
// reaches the screen is a device question.
//
// A worklet so the animated styles can call it where they run — and every
// constant it reads is declared ABOVE it for that reason. The worklet plugin
// serialises a closure at the point of DEFINITION, so a `const` below this
// would be captured undefined and every value here would come out NaN. It did,
// once, and only a test caught it: on the device a NaN margin renders as zero
// and looks like a spacing choice somebody made.
export const keyboardShape = (progress: number) => {
  'worklet';

  return {
    windowGap: WINDOW_GAP_DOWN + (WINDOW_MARGIN - WINDOW_GAP_DOWN) * progress,
    inputGap: INPUT_GAP_DOWN + (INPUT_MARGIN_SIDE - INPUT_GAP_DOWN) * progress,
    belowWindowFlex: SLACK_BELOW_WINDOW * (1 - progress),
  };
};



// A single opacity breathe, reused for the header's pulsing dot and the
// thinking indicator — the only two things on the stage that animate outside
// the optic itself.
function usePulseOpacity(duration: number, from: number, to: number, delay = 0) {
  const v = useSharedValue(from);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(to, { duration }), withTiming(from, { duration })),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);
  return useAnimatedStyle(() => ({ opacity: v.value }));
}

// fdot, whose duration applyEmotion sets to the emotion's own blink interval —
// the dots keep her tempo, not a fixed one. Two of them now: the header's at
// 5px and the status strip's at 4px, one pulse at two sizes.
function PulseDot({
  color,
  duration,
  size = HEADER_DOT_PX,
}: {
  color: string;
  duration: number;
  size?: number;
}) {
  const style = usePulseOpacity(duration / 2, 1, 0.28);
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

// fcaret: a hard on/off, `steps(1)`, not a fade. It exists only while she is
// still typing, so the interval never runs on a stage at rest.
const CARET = '\u258c';
const CARET_MS = 500;

function useCaret(active: boolean) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!active) return;
    setOn(true);
    const id = setInterval(() => setOn((v) => !v), CARET_MS);
    return () => clearInterval(id);
  }, [active]);
  return on;
}

export function Stage() {
  const apiKey = useFacilityStore((s) => s.apiKey);
  const emotion = useFacilityStore((s) => s.emotion);
  const lang = useFacilityStore((s) => s.lang);
  const line = useFacilityStore((s) => s.line);
  const shown = useFacilityStore((s) => s.shown);
  const systemNotice = useFacilityStore((s) => s.systemNotice);
  const thinking = useFacilityStore((s) => s.thinking);
  const draft = useFacilityStore((s) => s.draft);
  const [latched, setLatched] = useState(false);
  const latchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The timer outlives the screen if the drawer is opened mid-latch, and a
  // setState on an unmounted Stage is a warning nobody would trace back here.
  useEffect(
    () => () => {
      if (latchTimer.current) clearTimeout(latchTimer.current);
    },
    [],
  );
  const waking = useFacilityStore((s) => s.waking);
  const log = useFacilityStore((s) => s.log);
  // null until the thread is long enough to be worth a word about.
  const long = longWarning(log);
  const cabinetOpen = useFacilityStore((s) => s.cabinetOpen);
  const setDraft = useFacilityStore((s) => s.setDraft);
  const setCabinet = useFacilityStore((s) => s.setCabinet);
  const setView = useFacilityStore((s) => s.setView);
  const speak = useFacilityStore((s) => s.speak);

  // Android is edge-to-edge from SDK 54 on, so the stage draws under the status
  // bar and the gesture strip. The 28/20 of the mock is padding below the
  // system chrome, not instead of it.
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  // The inset is a shared value on the UI thread: it can move the stage but it
  // cannot decide what to render. This is the same library's JS-side view of
  // the same keyboard, and it is what lets the handle come out of the tree.
  const keyboardUp = useKeyboardState((s) => s.isVisible);
  // Everything that changes SHAPE as the keys arrive rides this rather than the
  // boolean above, so it lands on the same frames the stage's padding does. The
  // boolean is still what decides whether the cabinet handle can be touched,
  // which is not a shape and cannot be half-true.
  const kb = useKeyboardProgress();
  const windowGap = useAnimatedStyle(() => ({ marginBottom: keyboardShape(kb.value).windowGap }));
  const inputGap = useAnimatedStyle(() => ({ marginBottom: keyboardShape(kb.value).inputGap }));
  const belowWindow = useAnimatedStyle(() => ({ flex: keyboardShape(kb.value).belowWindowFlex }));

  const awake = Boolean(apiKey);
  const t = T[lang];
  const iris = EMOTIONS[emotion].iris;
  // `track:0` is disappointed and dormant — they will not follow your finger.
  const follows = EMOTIONS[emotion].track > 0;
  // One size, whatever she says — see `voice` in theme.ts for why the ladder
  // went. It varies by reading language and by nothing else.
  const { fontSize, lineHeight } = voice(lang);

  // The typewriter has the finished line before it draws the first character,
  // so `shown` trailing `line` is exactly "still arriving" — the caret rides
  // that, and nothing else needs storing to know it.
  const typing = shown.length < line.length;
  const caretOn = useCaret(typing);
  // The strip's live word (3a). Her own transmission only: a notice is the app
  // speaking, and reporting her line COMPLETE beside it would claim, in her
  // colour, that she said the thing she never got to show. Blank before she has
  // ever spoken — a third word for "nothing yet" is copy the design lacks.
  //
  // It used to read TRANSMITTING while she was merely THINKING, for want of
  // that third word. The dots moved into this strip on 2026-09-04 and carry the
  // waiting themselves, so the word is free to mean what it says: nothing is
  // being transmitted until the typewriter is actually drawing.
  const status = systemNotice
    ? ''
    : typing
      ? t.transmitting
      : thinking
        ? ''
        : line
          ? t.complete
          : '';
  // With nothing to put in it the window is its strip and no more, so a dormant
  // stage keeps the centred eye it has today instead of holding open an empty
  // box above the gate.
  // `thinking` used to belong here, because the dots were the body's only
  // content while she waited. They live in the strip now, so counting it would
  // hold an empty box open for the length of the wait on the first message of
  // a session. A reply already on screen keeps the body open through `line`.
  const hasBody = Boolean(systemNotice || line);

  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the eye is hers to move or yours. She does one thing at a time:
  // the 3a drift is her resting motion, a touch takes the eye over, and the
  // drift only resumes once the look has been let go. Nothing in the design
  // arbitrates this — its live eye tracks and never drifts, and the drifting
  // grid cells cannot be touched — so the timeline is ours to own, and it
  // lives here because the hold and the release do.
  const [tracking, setTracking] = useState(false);
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Where the optic sits in window space, so a touch anywhere on the stage can
  // be turned into a direction to look. measureInWindow rather than onLayout's
  // parent-relative box: the touch gives us pageX/pageY, and this keeps both
  // in the same coordinate space with no chain of offsets to get wrong.
  const opticBox = useRef<View>(null);
  const opticCentre = useRef<{ x: number; y: number } | null>(null);
  const measureOptic = () => {
    opticBox.current?.measureInWindow((x, y, w, h) => {
      opticCentre.current = { x: x + w / 2, y: y + h / 2 };
    });
  };

  // She looks where you TAP, and holds it — 4a drives the pupil from the
  // finger's position, and its onPointerUp does not recentre. onTouchStart on
  // the stage sees touches on its children too, so tapping the input or a
  // control turns her head as well, which is the point.
  const aim = (pageX: number, pageY: number) => {
    // The touch takes the eye whether or not we can aim it: knowing where the
    // eye SITS is what needs the measurement, and until it lands she simply
    // holds dead ahead instead of wandering.
    setTracking(true);
    const centre = opticCentre.current;
    if (centre) {
      const look = gazeFor(pageX, pageY, centre.x, centre.y, OPTIC_PX);
      gazeX.value = withTiming(look.x, { duration: LOOK_MS });
      gazeY.value = withTiming(look.y, { duration: LOOK_MS });
    }

    // She holds the look, then loses interest and drifts back to centre,
    // where the idle wander takes over again. 4a never recentres, but 4a has
    // no idle drift to go back TO — left alone she would wander around
    // wherever you last touched, forever.
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      gazeX.value = withTiming(0, { duration: RELEASE_MS });
      gazeY.value = withTiming(0, { duration: RELEASE_MS });
    }, HOLD_MS);

    // The drift waits out the whole handover — the hold AND the return — so
    // the eye is never being moved by two things at once.
    if (restTimer.current) clearTimeout(restTimer.current);
    restTimer.current = setTimeout(() => setTracking(false), HOLD_MS + RELEASE_MS);
  };

  // She begins to answer, and whatever is left of the hold is over: her line
  // and her new emotion land in the same store write, so this runs on the
  // frame the eye starts becoming that state. The look comes home over the
  // same 420ms the aperture, the lids and the colour take to change, and the
  // drift has the eye the moment that settles — she doesn't stare past your
  // finger through the first seconds of a state you have never seen.
  useEffect(() => {
    if (!line) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (restTimer.current) clearTimeout(restTimer.current);
    gazeX.value = withTiming(0, { duration: LOOK_MS });
    gazeY.value = withTiming(0, { duration: LOOK_MS });
    restTimer.current = setTimeout(() => setTracking(false), LOOK_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (restTimer.current) clearTimeout(restTimer.current);
  }, []);

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

  // TEMPORARY — a bench for the optic, dev builds only. Typing an emotion's
  // exact name ('amused', 'suspicious', …) forces that state instead of
  // sending the line to her, so one state can be watched on its own for as
  // long as you like. No new copy: the line she shows is her own emotion
  // label. Delete this and its call in send() once the eye is signed off.
  const forceEmotion = (text: string) => {
    if (!__DEV__) return false;
    const key = text.toLowerCase();
    if (!(key in EMOTIONS)) return false;
    const label = emotionLabel(key as EmotionKey, lang);
    useFacilityStore.setState({ emotion: key as EmotionKey, line: label, shown: label });
    return true;
  };

  // The two states in which SEND would drop the press: nothing to say, and a
  // reply already in flight. Both used to be silent early returns inside
  // send(), so the button looked live, took the press and did nothing.
  const sendable = draft.trim().length > 0 && !thinking;

  // Returns whether the line actually left. The two guards are the same pair
  // `sendable` reads, so a disabled button already makes them unreachable from
  // the press — they stay because the keyboard's return key comes through here
  // too, and because the caller needs an answer it can trust either way.
  const send = (): boolean => {
    const text = draft.trim();
    if (!text || thinking) return false;
    setDraft('');
    if (forceEmotion(text)) return false; // TEMPORARY, see above
    void speak('subject_spoke', text);
    // The line has gone, so hand the screen back. The keys cost the stage most
    // of its height — the cabinet handle comes out of the tree entirely while
    // they are up — and what is worth looking at now is her answer, not the
    // empty box. Only on the path that actually sent: a refused send leaves the
    // keyboard where it is, because the subject is still mid-thought.
    Keyboard.dismiss();
    return true;
  };

  // A tap is 40-60ms of contact, which a held-only pressed style can lose
  // entirely — so the button holds its lit state past the release. Only the
  // button latches: the keyboard's own return key reaches send() directly and
  // has nothing on screen to light up.
  const onSendPress = () => {
    setLatched(true);
    if (latchTimer.current) clearTimeout(latchTimer.current);
    latchTimer.current = setTimeout(() => setLatched(false), SEND_LATCH_MS);

    if (send()) buzz();
  };

  // Poking her. Refused mid-reply for the same reason SEND is: speak() has its
  // own busy flag and would drop the call anyway, but the surface must not
  // pretend to accept input it is going to throw away.
  const poke = () => {
    if (!awake || thinking) return;
    void speak('subject_tapped_your_optic');
    buzz();
  };

  return (
    <Animated.View
      style={[styles.stage, { paddingTop: insets.top }, keyboardInset]}
      onTouchStart={(e) => aim(e.nativeEvent.pageX, e.nativeEvent.pageY)}
    >
      <View style={styles.header}>
        {/* The logo IS the register control (2026-09-15). Her name, spelled
            out under it, and the register she is in beside it — one tap
            target, opening the picker's bubble under the corner it sits in.
            Her pulse rides in the picker's own title row rather than beside
            the whole logo, or it would sit halfway down two lines of text and
            be level with neither. */}
        <ModePicker leading={<PulseDot color={iris} duration={EMOTIONS[emotion].blinkMs} />} />
        {awake ? (
          // Three drawn dots, not a "•••" glyph — the design sets them at 3px
          // with a 3px gap, which no bullet run reproduces.
          <Pressable onPress={() => setView('sys')} hitSlop={12} style={styles.headerDots}>
            <View style={styles.headerDot} />
            <View style={styles.headerDot} />
            <View style={styles.headerDot} />
          </Pressable>
        ) : null}
      </View>

      {/* Its own centred row between the header and the optic (4a). The design
          shows it "once a transcript exists", and it was gated on
          `log.length > 0` to match — which meant CLEAR took the only route to
          the LOG screen away with the transcript (2026-09-11). That screen has
          a designed empty state and its own input; hiding the door to it is
          the inconsistency, not showing a door to an empty room. A deliberate
          departure from 4a: the pill now stands whenever she is awake. */}
      {apiKey ? (
        <View style={styles.pillRow}>
          <Pressable style={styles.pill} onPress={() => setView('log')}>
            <View style={styles.hairlines}>
              <View style={[styles.hairline, styles.hairlineLong, styles.hairlineAmber]} />
              <View style={[styles.hairline, styles.hairlineShort]} />
              <View style={[styles.hairline, styles.hairlineMid]} />
            </View>
            <Text style={[styles.pillText, { fontFamily: font('mono', 500, lang) }]}>{t.conv}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* The eye and her window take their natural heights and the leftover is
          pooled in THREE places: equally above and below the eye, so it sits
          halfway between the conversation pill and her window, and then
          SLACK_BELOW_WINDOW times that much under her, so the air that has
          nowhere else to go collects at the bottom rather than pushing her down
          the screen.

          Four arrangements have been tried here and each failed in its own
          direction, which is worth knowing before reaching for a fifth:

          - eye and window centred as one BLOCK: the eye rose ~130px the moment
            she spoke, because her window grows from a collapsed strip to 300px
            and centring pushes a taller block up.
          - eye centred in the whole gap, window pinned under it: fixed the
            jump, put her window at ~65% of the screen.
          - two equal fields, window pinned to the top of the lower one: left
            ~100dp of dead space between her window and the input box.
          - the same, window centred in its field: measured on the device at 63%
            of the screen with the keys down, which is still too low.

          `centre` shrinks with the keyboard — useKeyboardInset pads the stage's
          bottom rather than translating it — so all three pools shrink in step
          and the arrangement holds without anything being said about the
          keyboard here. */}
      <View style={styles.centre}>
        <View testID="slack-above-eye" style={styles.slack} />

        <View style={styles.opticRow}>
          <View ref={opticBox} onLayout={measureOptic} collapsable={false}>
            <Optic
              emotion={emotion}
              size={OPTIC_PX}
              gazeX={gazeX}
              gazeY={gazeY}
              // A state that refuses to follow you never hands the eye over:
              // her gaze is clamped to nothing, so standing the drift down
              // would buy a still eye and nothing else. Read at render, not at
              // the touch, so turning away mid-look gives the drift straight
              // back.
              tracking={tracking && follows}
              onPress={poke}
              waking={waking}
            />
          </View>
        </View>

        <View testID="slack-below-eye" style={styles.slack} />

        {/* Her words get an instrument of their own (3a): a status strip
            carrying her state, and a body holding nothing but what she said.
            It hangs from the eye rather than sitting above the input row: the
            window is what her line grew into, so it belongs against her. */}
        <View testID="window-field" style={styles.windowField}>
        <Animated.View
          testID="her-window"
          style={[styles.window, hasBody ? styles.windowOpen : null, windowGap]}
        >
          <View testID="status-strip" style={styles.strip}>
            <PulseDot color={iris} duration={EMOTIONS[emotion].blinkMs} size={STRIP_DOT_PX} />
            <Text
              style={[styles.emotionLabel, { color: iris, fontFamily: font('mono', 500, lang) }]}
            >
              {emotionLabel(emotion, lang)}
            </Text>
            {/* How long the thread has got, once that is worth saying — the
                whole of the rule is in core/conversation.ts and this renders
                its answer. It joins the LEFT cluster on the strip's own 9px
                gap: the right-hand slot is spoken for by TRANSMITTING, COMPLETE
                and the thinking dots, and a fourth thing competing for it would
                be the same fight the ellipsis already settled. Below the
                threshold nothing is rendered at all. */}
            {long != null ? (
              <Text
                testID="long-warning"
                style={[styles.longCount, { fontFamily: font('mono', 500, lang) }]}
              >
                {long}
              </Text>
            ) : null}
            {/* One slot, and the two never coincide: the word is blank while
                she is only thinking, and the dots are gone the moment the
                typewriter starts. Both carry the same auto margin, which is
                what holds them at the right edge of a row whose other children
                cluster left on a 9px gap — and what keeps the ellipsis landing
                exactly where TRANSMITTING and COMPLETE do. */}
            {status ? (
              <Text
                testID="status"
                style={[styles.status, styles.statusSlot, { fontFamily: font('mono', 500, lang) }]}
              >
                {status}
              </Text>
            ) : thinking ? (
              <ThinkingDots style={styles.statusSlot} />
            ) : null}
          </View>

          {hasBody ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyInner}>
              {/* The one thing the app says in its own voice. Danger red and the
                  mono face, never her serif, so a refused credential cannot be
                  read as something she said. */}
              {systemNotice ? (
                <Text
                  testID="system-notice"
                  style={StyleSheet.flatten([
                    styles.notice,
                    { fontFamily: font('mono', 600, lang) },
                  ])}
                >
                  {SYSTEM_TEXT[systemNotice](t)}
                </Text>
              ) : (
                <Text
                  testID="her-line"
                  style={StyleSheet.flatten([
                    styles.line,
                    { fontSize, lineHeight, fontFamily: serif(lang) },
                  ])}
                >
                  {shown}
                  {typing ? (
                    // Nested, so it sits after the last character she has typed
                    // rather than at the end of the box. A nested Text takes
                    // colour but not opacity, so the blink is amber/transparent.
                    <Text
                      testID="caret"
                      style={{ color: caretOn ? palette.amber : 'transparent' }}
                    >
                      {CARET}
                    </Text>
                  ) : null}
                </Text>
              )}
            </ScrollView>
          ) : null}
        </Animated.View>
        </View>

        {/* The pool under her window, closing as the keys arrive. There is
            little enough slack there with them up that a share of it is a few
            pixels — and a few pixels ON TOP of her bottom margin is a gap that
            changes with the length of her reply and matches nothing. Closed,
            the gap under her window is her bottom margin and nothing else,
            which is a number, so it can be made to match her sides. */}
        <Animated.View testID="slack-below-window" style={belowWindow} />
      </View>

      {awake ? (
        <>
          {/* The same gap either way. It sat flush on the keys for one commit,
              on the reasoning that the 14 was the space under the handle — but
              the handle is out of the tree while the keyboard is up, so no gap
              here can expose it, and flush against the keys is tighter than
              anything else on this screen. */}
          <Animated.View testID="input-row" style={[styles.inputRow, inputGap]}>
            <Text style={[styles.chevron, { fontFamily: font('mono', 500, lang) }]}>›</Text>
            <TextInput
              style={[styles.input, { fontFamily: font('mono', 500, lang) }]}
              value={draft}
              onChangeText={setDraft}
              placeholder={t.ask}
              placeholderTextColor={palette.textFaint}
              onSubmitEditing={() => void send()}
            />
            {/* `lit` comes last so it wins over `inert`: a successful send
                empties the box and starts her thinking, which makes the button
                inert on the very frame it is confirming the press. The order
                gives you the tap, then the refusal, rather than neither. */}
            <Pressable
              testID="send"
              onPress={onSendPress}
              disabled={!sendable}
              hitSlop={8}
              style={({ pressed }) => [
                styles.sendButton,
                !sendable && styles.sendButtonInert,
                (pressed || latched) && styles.sendButtonLit,
              ]}
            >
              <Text
                style={[
                  styles.send,
                  !sendable && styles.sendInert,
                  { fontFamily: font('mono', 500, lang) },
                ]}
              >
                {t.send}
              </Text>
            </Pressable>
          </Animated.View>

          {/* With the keyboard up the stage has three things worth the height
              — the eye, her window, and the box being typed into — and the
              cabinet handle is not one of them. Nothing is lost: the handle is
              a swipe target, and it cannot be reached past the keys anyway. */}
          {keyboardUp ? null : (
            <View style={styles.drawer} {...handlePan.panHandlers}>
              <View style={styles.handleBar} />
              <Text style={[styles.handleLabel, { fontFamily: font('mono', 500, lang) }]}>
                {t.cabinet}
              </Text>
            </View>
          )}
        </>
      ) : (
        <KeyGate />
      )}
    </Animated.View>
  );
}

// Every number below is read off 4a in `design/The Facility - Overhaul.dc.html`.
// Layout is 1:1 with the mock; only type passes through ms().
const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  // `padding:16px 20px 0`
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    // The register bubble hangs out of this row and over the conversation pill
    // in the row below. Siblings paint in tree order, so without this the
    // bubble opens behind the pill however high its own zIndex is.
    zIndex: 30,
    elevation: 30,
  },
  headerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.textGhost,
  },
  // `padding:15px 0 0`, centred
  // 4a's 15, plus the tag pill's own vertical chrome and a little over. The
  // logo used to end at a line of text and now ends at a bordered badge, so 15
  // measured from the badge's edge is 6px less air than 15 from a baseline — and the badge is the same KIND of
  // object as the pill below it, which makes the shortfall read as crowding
  // rather than as a small gap. The header row itself did not move: it is ~3px
  // TALLER than before the badge, so this row sits slightly lower, not higher.
  pillRow: {
    alignItems: 'center',
    paddingTop: 26,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.borderPill,
  },
  hairlines: {
    gap: 2.5,
    alignItems: 'flex-start',
  },
  hairline: {
    height: 1.5,
    borderRadius: 1,
    backgroundColor: palette.hairlineDim,
  },
  hairlineLong: { width: 11 },
  hairlineShort: { width: 7 },
  hairlineMid: { width: 9 },
  hairlineAmber: {
    backgroundColor: palette.amber,
  },
  pillText: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.2,
    color: palette.textPill,
  },
  // The eye and her window as one block, centred in the space left over. The
  // stage centred the eye and her line together like this before the window
  // existed; the window is only what her line grew into, so the eye keeps the
  // place it had. Not `alignItems:'center'` — the window stretches to its own
  // margins.
  centre: {
    flex: 1,
    minHeight: 0,
  },
  // One above the eye and one below it, equal, so the eye sits halfway between
  // the conversation pill and her window whatever either of them is doing.
  slack: {
    flex: 1,
  },
  // Not a pool — just a wrapper, so the window keeps its natural height and its
  // own ScrollView does the shrinking rather than a flex share forcing it.
  windowField: {
    minHeight: 0,
    flexShrink: 1,
  },
  // `padding:22px 0 22px`, the eye centred in its own row
  opticRow: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  // `margin:0 18px 14px; background:#17161a; border:1px solid #2c2a22;
  // border-radius:14px`
  window: {
    marginHorizontal: WINDOW_MARGIN,
    backgroundColor: palette.panelAlt,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  // The design gives the window `flex:1`, which on a phone is every pixel
  // between the eye and the input — a nearly empty box the height of the
  // screen for one sentence, with the eye shoved up out of its place to make
  // room. It takes its height from what she actually said instead, capped at
  // 3a's own figure. At `voice`'s size a reply under thirty words sits well
  // inside that, so the cap is for freak lines only — which is what the
  // ScrollView behind it is for.
  windowOpen: {
    maxHeight: WINDOW_MAX_PX,
  },
  // `padding:11px 14px; border-bottom:1px solid #221f18; background:#1a1913`
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: palette.panel,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSoft,
  },
  // colour comes from the iris, not a fixed grey — applyEmotion sets it.
  emotionLabel: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.24,
  },
  // The design sets this at weight 400; the mono face is bundled at 500 and up,
  // so it takes 500 like every other mono label on the stage. The tracking is
  // the design's .18em, which is what separates it from the label beside it.
  // The right edge of the strip. Applied to the word AND the dots, or the two
  // would sit in the same slot but not the same place.
  statusSlot: {
    marginLeft: 'auto',
  },
  status: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.18,
    color: palette.textDim,
  },
  // The thread's length, in the app's error red — the same colour a notice
  // uses, because this is the app speaking about itself and not a state of
  // hers. Sized and tracked as the status word, so it reads as one more
  // reading on the same instrument rather than an alert stuck onto it.
  longCount: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.18,
    color: palette.danger,
  },
  // `padding:20px 18px; overflow-y:auto`. `flexShrink` rather than `flex`: a
  // ScrollView claiming a flex share inside an auto-height parent collapses to
  // nothing, and this one has to measure her line and then give way to the
  // window's ceiling.
  body: {
    flexShrink: 1,
  },
  // 4a says `padding:20px 18px`. The vertical half is 12 (2026-09-04): with the
  // keyboard up the window is the only thing that can give, and 40px of the
  // little height it has left was padding. The horizontal 18 is untouched —
  // narrowing her line costs more lines than it saves height.
  bodyInner: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 16,
  },
  line: {
    color: palette.text,
  },
  // Deliberately unlike her: the danger red, small, wide-tracked and mono.
  // Nothing on this screen looks like this except the system speaking.
  notice: {
    color: palette.danger,
    fontSize: ms(9.5),
    lineHeight: ms(9.5) * 1.7,
    letterSpacing: ms(9.5) * 0.12,
  },
  // A card, not a hairline rule: `margin:0 20px 14px; padding:13px 14px;
  // background:#1a1913; border:1px solid #2c2a22; border-radius:12px`
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: INPUT_MARGIN_SIDE,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
  },
  chevron: {
    fontSize: ms(11),
    color: palette.amber,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: ms(12.5),
    color: palette.text,
  },
  // a bordered button; amber because that is its hover state (see theme.ts)
  sendButton: {
    borderWidth: 1,
    borderColor: palette.amberEdgeSoft,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  // Held, and for SEND_LATCH_MS after the release.
  sendButtonLit: {
    backgroundColor: palette.amberWash,
    borderColor: palette.amberEdge,
  },
  // Nothing to send, or a reply already in flight.
  sendButtonInert: {
    borderColor: palette.border,
  },
  send: {
    fontSize: ms(8),
    letterSpacing: ms(8) * 0.18,
    color: palette.amber,
  },
  sendInert: {
    color: palette.textFaint,
  },
  // `padding:4px 0 14px; gap:8px`
  drawer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 14,
  },
  handleBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
  },
  handleLabel: {
    fontSize: ms(7),
    letterSpacing: ms(7) * 0.26,
    color: palette.textGhostest,
  },
});
