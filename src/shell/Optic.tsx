import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Shadow,
  rect,
  rrect,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { dartLegs, opticGeometry } from './opticGeometry';
import { EMOTIONS, type EmotionKey } from '../vera/emotions';

// fdartQuick alone uses steps(1,end).
const DART_STEPPED = new Set(['quick']);

// A thin shell: every number the eye draws from comes out of opticGeometry.
// Nothing here computes anything *about an emotion* — only the arithmetic
// Skia itself needs to turn those numbers into a canvas (radii, transforms,
// path builders). See opticGeometry.ts for the tested math.
//
// Layer-for-layer against the 3a optic in
// `design/The Facility - Overhaul.dc.html`.

const TRANSITION_MS = 420;
const GLOW_BREATHE_MS = 2800;
const WAKE_MS = 1150;

// Static layout constants — none of these vary by emotion, so they live here
// rather than in opticGeometry's tested contract.
const RING_INSETS = [0.1, 0.2] as const; // the socket's `inset:10%` / `inset:20%`
const RING_ALPHAS = [0.16, 0.07] as const;
const FIBRE_COUNT = 100; // repeating-conic-gradient at 3.6° pitch
const FIBRE_OUTER = 1; // the striation fills the iris, `inset:0`
const FIBRE_SLANT_DEG = 0.6; // half of the design's 1.2° coloured arc
const FIBRE_ALPHA = 0.26;
const FIBRE_GROUP_OPACITY = 0.6;

// `left:25%;top:20%;width:22%;height:15%` — an ellipse, not a circle — filled
// with `radial-gradient(circle,#ffffffcc,transparent 74%)` and blurred 1.4px.
// It is a bloom that falls off to nothing, not a solid white lozenge: the
// gradient is a *circle* in a wider-than-tall box, so CSS sizes it
// farthest-corner and the ellipse crops what spills past its top and bottom.
const CATCHLIGHT_LEFT = 0.25;
const CATCHLIGHT_TOP = 0.2;
const CATCHLIGHT_W = 0.22;
const CATCHLIGHT_H = 0.15;
const CATCHLIGHT_CORE = '#ffffffcc';
// White at zero alpha, not `transparent`: black-at-zero would darken the ramp.
const CATCHLIGHT_EDGE = '#ffffff00';
const CATCHLIGHT_STOPS = [0, 0.74] as const;

// The socket's own radial-gradient: `circle at 50% 38%`, stops 0% and 74%.
const SOCKET_CENTRE_Y = 0.38;
const SOCKET_STOPS = [0, 0.74] as const;

// The iris: `radial-gradient(circle at 42% 36%, color-mix(iris 34%, #000) 0%,
// #0a0a08 88%)` — a deep, off-centre well, not a bright disc.
const IRIS_CENTRE = [0.42, 0.36] as const;
const IRIS_MIX = 0.34;
const IRIS_EDGE = '#0a0a08';
const IRIS_STOPS = [0, 0.88] as const;

// The lid's own body: a vertical gradient under a 1px vertical striation.
// Both ramps map to the lid's OWN box, which is what `height:var(--lid)` makes
// them — so the whole ramp compresses into a resting lid and stretches as it
// closes. Pinned to the closed extent instead, a resting lid only ever showed
// the first sixth of its gradient and never darkened at all.
const LID_TOP_COLOURS = ['#221f18', '#151309', '#0d0c08'] as const;
const LID_TOP_STOPS = [0, 0.64, 1] as const;
// `linear-gradient(0deg, …)` runs bottom-to-top, so the stops are reversed to
// read down the screen like every other gradient here.
const LID_BOTTOM_COLOURS = ['#0d0c08', '#131208', '#1e1c16'] as const;
const LID_BOTTOM_STOPS = [0, 0.3, 1] as const;
const LID_OVERHANG = 0.08; // `left:-8%;right:-8%`, then clipped by the socket

// `repeating-linear-gradient(90deg,#ffffff07 0 1px,transparent 1px 3px)` — a
// 1px hairline every 3px, the grain that keeps the lid from reading as flat
// paint. A repeating tile does the same job as the CSS keyword; the hard stop
// is the doubled position, and white-at-zero keeps black out of the ramp.
const LID_GRAIN_PITCH = 3;
const LID_TOP_GRAIN = '#ffffff07';
const LID_BOTTOM_GRAIN = '#ffffff05';
const LID_GRAIN_CLEAR = '#ffffff00';
const LID_GRAIN_STOPS = [0, 1 / LID_GRAIN_PITCH, 1 / LID_GRAIN_PITCH, 1] as const;

// `box-shadow:0 2px 7px #000000aa`, the top lid alone — the shadow it throws
// down the eye. Skia's blur is the Gaussian's sigma and CSS's is twice that,
// so the 7px radius is 3.5 here.
const LID_SHADOW_DY = 2;
const LID_SHADOW_BLUR = 3.5;
const LID_SHADOW_COLOUR = '#000000aa';

export interface OpticProps {
  emotion: EmotionKey;
  size: number;
  gazeX?: SharedValue<number>;
  gazeY?: SharedValue<number>;
  /** True while a touch owns the eye, which stands the idle drift down. */
  tracking?: boolean;
  onPress?: () => void;
  waking?: boolean;
}

export function Optic({ emotion, size, gazeX, gazeY, tracking, onPress, waking }: OpticProps) {
  const center = size / 2;
  const geometry = useMemo(() => opticGeometry(emotion, size), [emotion, size]);

  const irisRadius = useSharedValue(geometry.irisRadius);
  const pupilRadius = useSharedValue(geometry.pupilRadius);
  // One clock for the blink — 0 open, 1 shut — and one resting height per lid.
  // Two lids running two identical loops are still two loops: reanimated
  // decides each animation's timeline against THAT value's own previous
  // animation, so the pair can end up on different sides of the decision and
  // close 420ms apart. A single clock cannot disagree with itself.
  const blink = useSharedValue(0);
  const openTop = useSharedValue(geometry.lidHeight);
  const openBottom = useSharedValue(geometry.lowerLidHeight);
  const glowAlpha = useSharedValue(geometry.glowAlpha);
  const colorFrom = useSharedValue(geometry.iris);
  const colorTo = useSharedValue(geometry.iris);
  const colorProgress = useSharedValue(1);
  const breathe = useSharedValue(1);

  const dartX = useSharedValue(0);
  const dartY = useSharedValue(0);

  const defaultGazeX = useSharedValue(0);
  const defaultGazeY = useSharedValue(0);
  const lookX = gazeX ?? defaultGazeX;
  const lookY = gazeY ?? defaultGazeY;

  const wakeScale = useSharedValue(waking ? 0.86 : 1);
  const wakeOpacity = useSharedValue(waking ? 1 : 0);

  // Emotional transitions: ease every shared value to the new geometry, then
  // restart the blink loop on the new tempo. Every state blinks — 3a runs
  // fshutT on all eight cells, and nothing in the design stares.
  useEffect(() => {
    irisRadius.value = withTiming(geometry.irisRadius, { duration: TRANSITION_MS });
    pupilRadius.value = withTiming(geometry.pupilRadius, { duration: TRANSITION_MS });
    glowAlpha.value = withTiming(geometry.glowAlpha, { duration: TRANSITION_MS });

    colorFrom.value = colorTo.value;
    colorTo.value = geometry.iris;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: TRANSITION_MS });

    openTop.value = withTiming(geometry.lidHeight, { duration: TRANSITION_MS });
    openBottom.value = withTiming(geometry.lowerLidHeight, { duration: TRANSITION_MS });

    // The settle and the loop are one animation, not a JS timer handing off to
    // one. withTiming inherits the START TIME AND START VALUE of the animation
    // it replaces whenever that one is an unfinished timing with the same
    // toValue (reanimated's `onStart`, animation/timing.ts) — and a
    // setTimeout(420) always fires a frame before a 420ms UI animation has
    // finished, so the loop's first leg used to adopt the settle's clock:
    // still crawling toward the new resting height, but now over blinkRestMs
    // instead — 5.3s on calm, 10.9s on suspicious. Inside a sequence a leg
    // only starts once its predecessor has FINISHED, and a finished timing
    // zeroes its own startTime, so nothing here can inherit anything.
    blink.value = withSequence(
      withTiming(0, { duration: TRANSITION_MS }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: geometry.blinkRestMs }),
          withTiming(1, { duration: geometry.blinkCloseMs }),
          withTiming(1, { duration: geometry.blinkHoldMs }),
          withTiming(0, { duration: geometry.blinkOpenMs }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(blink);
      cancelAnimation(openTop);
      cancelAnimation(openBottom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

  // The idle drift (3a) — her resting motion, and the ground truth for what
  // each emotion does with an eye nobody is touching. It is the only thing
  // moving the pupil when it runs: 4a's live optic drives that same transform
  // from the finger and carries no drift at all, so a touch stands the drift
  // down (`tracking`) and gets the eye to itself until Stage gives it back.
  useEffect(() => {
    const key = EMOTIONS[emotion].dart;
    if (!key || tracking) {
      dartX.value = withTiming(0, { duration: TRANSITION_MS });
      dartY.value = withTiming(0, { duration: TRANSITION_MS });
      return;
    }
    const legs = dartLegs(key, EMOTIONS[emotion].dartMs, geometry.socketDiameter);
    const stepped = DART_STEPPED.has(key);
    const run = (axis: 'x' | 'y') =>
      withRepeat(
        withSequence(
          ...legs.map((leg) =>
            withTiming(leg[axis], {
              // Every leg runs for the length the keyframes give it, stepped or
              // not — the fixations ARE the long legs (fdartQuick holds 0–8%,
              // 9–30%, …), so collapsing them ran the whole 3.4s cycle in a
              // few frames.
              duration: leg.ms,
              // A stepped leg already carries the fixation it holds (see
              // dartLegs), so it takes its value at once and keeps it for the
              // whole leg: no travel, no in-between position.
              easing: stepped ? Easing.steps(1, true) : Easing.inOut(Easing.ease),
            }),
          ),
        ),
        -1,
      );
    dartX.value = run('x');
    dartY.value = run('y');
    return () => {
      cancelAnimation(dartX);
      cancelAnimation(dartY);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emotion, geometry.socketDiameter, tracking]);

  // The glow's own breathing loop is constant across every state — only its
  // strength (glowAlpha) is emotion-driven.
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: GLOW_BREATHE_MS / 2 }),
        withTiming(0.95, { duration: GLOW_BREATHE_MS / 2 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(breathe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A single wake bloom, once, whenever `waking` turns on.
  useEffect(() => {
    if (waking) {
      wakeScale.value = 0.86;
      wakeOpacity.value = 1;
      wakeScale.value = withTiming(1.06, { duration: WAKE_MS });
      wakeOpacity.value = withTiming(0, { duration: WAKE_MS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waking]);

  const irisColor = useDerivedValue(() =>
    interpolateColor(colorProgress.value, [0, 1], [colorFrom.value, colorTo.value]),
  );
  const glowOpacity = useDerivedValue(() => glowAlpha.value * breathe.value);
  const glowColors = useDerivedValue(() => [irisColor.value, 'transparent']);
  // color-mix(in srgb, var(--iris) 34%, #000) — the iris at a third strength
  // over black, which is what makes the well read as deep rather than lit.
  const irisGradientColors = useDerivedValue(() => [
    interpolateColor(IRIS_MIX, [0, 1], ['#000000', irisColor.value]),
    IRIS_EDGE,
  ]);
  const wakeColors = useDerivedValue(() => ['#ffffff', irisColor.value]);
  const wakeTransform = useDerivedValue(() => [{ scale: wakeScale.value }]);
  const dartTransform = useDerivedValue(() => [
    { translateX: dartX.value },
    { translateY: dartY.value },
  ]);
  // Both lids hang off the socket's edges, not the canvas's — anchored to the
  // outer box each starts BEZEL_INSET too far out and they stop meeting when
  // shut. Plain numbers off `geometry`, so both need an explicit deps array to
  // be re-read when the emotion changes (as gazeTransform does below).
  // Each lid is its resting height carried toward its closed height by the one
  // blink clock, which is what `height:var(--lid)` animating to a fixed shut
  // height is. Both are read off the same value, in the same frame.
  const topLid = useDerivedValue(
    () => openTop.value + (geometry.lidClosedHeight - openTop.value) * blink.value,
    [geometry.lidClosedHeight],
  );
  const lowerLid = useDerivedValue(
    () => openBottom.value + (geometry.lowerLidClosedHeight - openBottom.value) * blink.value,
    [geometry.lowerLidClosedHeight],
  );

  const lowerLidY = useDerivedValue(
    () => geometry.socketBottom - lowerLid.value,
    [geometry.socketBottom],
  );
  // The seam rides the lid's leading edge, one pixel above it.
  const seamY = useDerivedValue(
    () => geometry.socketTop + topLid.value - 1,
    [geometry.socketTop],
  );
  // Each ramp ends on its own lid's leading edge, so it spans the lid and
  // nothing more.
  const topLidEnd = useDerivedValue(
    () => vec(0, geometry.socketTop + topLid.value),
    [geometry.socketTop],
  );
  const lowerLidStart = useDerivedValue(
    () => vec(0, geometry.socketBottom - lowerLid.value),
    [geometry.socketBottom],
  );

  // Gaze is a plain prop-driven clamp (opticGeometry.gazeLimitPx, already in
  // pixels), not itself an emotion the canvas animates through — an
  // explicit deps array (as Blob.tsx does for its plain `hunger` prop)
  // rebuilds it on change.
  const gazeTransform = useDerivedValue(() => {
    const limit = geometry.gazeLimitPx;
    return [{ translateX: lookX.value * limit }, { translateY: lookY.value * limit }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry.gazeLimitPx]);

  // 100 spokes at 3.6° pitch, each slanted 0.6° so the fibre reads as
  // striation rather than a static sunburst. Reads irisRadius off its shared
  // value so the fibre grows and shrinks with the iris.
  const fibrePath = usePathValue((b) => {
    'worklet';
    const outer = irisRadius.value * FIBRE_OUTER;
    for (let i = 0; i < FIBRE_COUNT; i++) {
      const a = (i / FIBRE_COUNT) * Math.PI * 2;
      const a2 = a + (FIBRE_SLANT_DEG * Math.PI) / 180;
      b.moveTo(center, center);
      b.lineTo(center + outer * Math.cos(a2), center + outer * Math.sin(a2));
    }
  });

  // The lids are full-width bars with an 8% overhang; without this clip they
  // paint square slabs across the whole canvas and past the eye's silhouette.
  // In the design the same job is done by the socket's `overflow:hidden`.
  const socketClip = useMemo(
    () =>
      rrect(
        rect(
          center - geometry.socketRadius,
          center - geometry.socketRadius,
          geometry.socketDiameter,
          geometry.socketDiameter,
        ),
        geometry.socketRadius,
        geometry.socketRadius,
      ),
    [center, geometry.socketRadius, geometry.socketDiameter],
  );

  const lidLeft = -size * LID_OVERHANG;
  const lidWidth = size * (1 + LID_OVERHANG * 2);

  // farthest-corner: half the catchlight box's diagonal.
  const catchlightRadius = Math.hypot(size * CATCHLIGHT_W, size * CATCHLIGHT_H) / 2;


  return (
    <Pressable onPress={onPress} testID="optic">
      <Canvas style={{ width: size, height: size }}>
        {/* 1. glow */}
        <Circle cx={center} cy={center} r={geometry.glowRadius} opacity={glowOpacity}>
          <RadialGradient c={vec(center, center)} r={geometry.glowRadius} colors={glowColors} />
        </Circle>

        {/* 2. bezel */}
        <Circle cx={center} cy={center} r={geometry.bezelRadius} color="#191811">
          <Shadow dx={0} dy={1} blur={0} color="#ffffff14" inner />
        </Circle>

        {/* 3. socket — the gradient's centre sits high, at 50% 38% */}
        <Circle cx={center} cy={center} r={geometry.socketRadius}>
          <RadialGradient
            c={vec(center, size * SOCKET_CENTRE_Y)}
            r={geometry.socketRadius}
            colors={['#1c1b15', '#0a0a08']}
            positions={[...SOCKET_STOPS]}
          />
        </Circle>

        {/* 4. iris rings */}
        <Circle
          cx={center}
          cy={center}
          r={geometry.socketRadius * (1 - RING_INSETS[0])}
          style="stroke"
          strokeWidth={1}
          color={irisColor}
          opacity={RING_ALPHAS[0]}
        />
        <Circle
          cx={center}
          cy={center}
          r={geometry.socketRadius * (1 - RING_INSETS[1])}
          style="stroke"
          strokeWidth={1}
          color={irisColor}
          opacity={RING_ALPHAS[1]}
        />

        {/* 5. gaze group — iris, fibre, core */}
        <Group transform={gazeTransform} origin={vec(center, center)}>
         <Group transform={dartTransform} origin={vec(center, center)}>
          <Circle cx={center} cy={center} r={irisRadius}>
            <RadialGradient
              c={vec(
                center - geometry.irisRadius * (1 - IRIS_CENTRE[0] * 2),
                center - geometry.irisRadius * (1 - IRIS_CENTRE[1] * 2),
              )}
              r={irisRadius}
              colors={irisGradientColors}
              positions={[...IRIS_STOPS]}
            />
          </Circle>

          <Group opacity={FIBRE_GROUP_OPACITY}>
            <Path path={fibrePath} style="stroke" strokeWidth={1} color={irisColor} opacity={FIBRE_ALPHA} />
          </Group>

          {/* the ring around the iris — full strength in the design; `--seam`
              belongs to the lid edge, not here. */}
          <Circle
            cx={center}
            cy={center}
            r={irisRadius}
            style="stroke"
            strokeWidth={1.5}
            color={irisColor}
          />

          <Circle cx={center} cy={center} r={pupilRadius} color="#fff">
            <Shadow dx={0} dy={0} blur={5} color={irisColor} />
          </Circle>
         </Group>
        </Group>

        {/* 6. catchlight — an ellipse, hidden when dead (dormant) */}
        {geometry.showCatchlight ? (
          <Oval
            rect={rect(
              size * CATCHLIGHT_LEFT,
              size * CATCHLIGHT_TOP,
              size * CATCHLIGHT_W,
              size * CATCHLIGHT_H,
            )}
          >
            <RadialGradient
              c={vec(
                size * (CATCHLIGHT_LEFT + CATCHLIGHT_W / 2),
                size * (CATCHLIGHT_TOP + CATCHLIGHT_H / 2),
              )}
              r={catchlightRadius}
              colors={[CATCHLIGHT_CORE, CATCHLIGHT_EDGE]}
              positions={[...CATCHLIGHT_STOPS]}
            />
            <Blur blur={1.4} />
          </Oval>
        ) : null}

        {/* 7. lids — gradient bodies, an iris-coloured seam on the leading
            edge, and the grain over the top. Clipped to the socket. */}
        <Group clip={socketClip}>
          <Rect x={lidLeft} y={geometry.socketTop} width={lidWidth} height={topLid}>
            <LinearGradient
              start={vec(0, geometry.socketTop)}
              end={topLidEnd}
              colors={[...LID_TOP_COLOURS]}
              positions={[...LID_TOP_STOPS]}
            />
            <Shadow dx={0} dy={LID_SHADOW_DY} blur={LID_SHADOW_BLUR} color={LID_SHADOW_COLOUR} />
          </Rect>
          {/* the grain, over the body — the first background layer in CSS */}
          <Rect x={lidLeft} y={geometry.socketTop} width={lidWidth} height={topLid}>
            <LinearGradient
              start={vec(lidLeft, 0)}
              end={vec(lidLeft + LID_GRAIN_PITCH, 0)}
              colors={[LID_TOP_GRAIN, LID_TOP_GRAIN, LID_GRAIN_CLEAR, LID_GRAIN_CLEAR]}
              positions={[...LID_GRAIN_STOPS]}
              mode="repeat"
            />
          </Rect>

          {/* the seam: `border-bottom: 1px solid color-mix(iris, --seam)` */}
          <Rect
            x={lidLeft}
            y={seamY}
            width={lidWidth}
            height={1}
            color={irisColor}
            opacity={geometry.seamAlpha}
          />

          <Rect x={lidLeft} y={lowerLidY} width={lidWidth} height={lowerLid}>
            <LinearGradient
              start={lowerLidStart}
              end={vec(0, geometry.socketBottom)}
              colors={[...LID_BOTTOM_COLOURS]}
              positions={[...LID_BOTTOM_STOPS]}
            />
          </Rect>
          {/* the lower lid's own grain, a shade fainter than the upper's */}
          <Rect x={lidLeft} y={lowerLidY} width={lidWidth} height={lowerLid}>
            <LinearGradient
              start={vec(lidLeft, 0)}
              end={vec(lidLeft + LID_GRAIN_PITCH, 0)}
              colors={[LID_BOTTOM_GRAIN, LID_BOTTOM_GRAIN, LID_GRAIN_CLEAR, LID_GRAIN_CLEAR]}
              positions={[...LID_GRAIN_STOPS]}
              mode="repeat"
            />
          </Rect>
          {/* `border-top: 1px solid color-mix(iris, --seamb)` */}
          <Rect
            x={lidLeft}
            y={lowerLidY}
            width={lidWidth}
            height={1}
            color={irisColor}
            opacity={geometry.seamBAlpha}
          />
        </Group>

        {/* 8. wake bloom — a single scale+fade burst, not a loop */}
        {waking ? (
          <Group transform={wakeTransform} origin={vec(center, center)} opacity={wakeOpacity}>
            <Circle cx={center} cy={center} r={geometry.bezelRadius}>
              <RadialGradient c={vec(center, center)} r={geometry.bezelRadius} colors={wakeColors} />
            </Circle>
          </Group>
        ) : null}
      </Canvas>
    </Pressable>
  );
}
