import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  Blur,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Rect,
  Shadow,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { opticGeometry } from './opticGeometry';
import type { EmotionKey } from '../vera/emotions';

// A thin shell: every number the eye draws from comes out of opticGeometry.
// Nothing here computes anything *about an emotion* — only the arithmetic
// Skia itself needs to turn those numbers into a canvas (radii, transforms,
// path builders). See opticGeometry.ts for the tested math.

const TRANSITION_MS = 420;
const GLOW_BREATHE_MS = 2800;
const WAKE_MS = 1150;

// Static layout constants — none of these vary by emotion, so they live here
// rather than in opticGeometry's tested contract.
const RING_INSETS = [0.1, 0.2] as const; // fraction inset from the socket edge
const RING_ALPHAS = [0.16, 0.07] as const;
const FIBRE_COUNT = 100;
const FIBRE_INNER = 0.34; // fraction of iris radius
const FIBRE_OUTER = 0.94;
const FIBRE_SLANT_DEG = 0.6; // half of the spec's 1.2° arc per spoke
const FIBRE_ALPHA = 0.26;
const FIBRE_GROUP_OPACITY = 0.6;
const CATCHLIGHT_X = 0.25;
const CATCHLIGHT_Y = 0.2;
const CATCHLIGHT_R = 0.05;

export interface OpticProps {
  emotion: EmotionKey;
  size: number;
  gaze?: SharedValue<{ x: number; y: number }>;
  onPress?: () => void;
  waking?: boolean;
}

export function Optic({ emotion, size, gaze, onPress, waking }: OpticProps) {
  const center = size / 2;
  const geometry = useMemo(() => opticGeometry(emotion, size), [emotion, size]);

  const irisRadius = useSharedValue(geometry.irisRadius);
  const pupilRadius = useSharedValue(geometry.pupilRadius);
  const topLid = useSharedValue(geometry.lidHeight);
  const lowerLid = useSharedValue(geometry.lowerLidHeight);
  const glowAlpha = useSharedValue(geometry.glowAlpha);
  const colorFrom = useSharedValue(geometry.iris);
  const colorTo = useSharedValue(geometry.iris);
  const colorProgress = useSharedValue(1);
  const breathe = useSharedValue(1);

  const defaultGaze = useSharedValue({ x: 0, y: 0 });
  const gazeValue = gaze ?? defaultGaze;

  const wakeScale = useSharedValue(waking ? 0.86 : 1);
  const wakeOpacity = useSharedValue(waking ? 1 : 0);

  // Emotional transitions: ease every shared value to the new geometry, then
  // (re)start or stop the blink loop for the new state.
  useEffect(() => {
    irisRadius.value = withTiming(geometry.irisRadius, { duration: TRANSITION_MS });
    pupilRadius.value = withTiming(geometry.pupilRadius, { duration: TRANSITION_MS });
    lowerLid.value = withTiming(geometry.lowerLidHeight, { duration: TRANSITION_MS });
    glowAlpha.value = withTiming(geometry.glowAlpha, { duration: TRANSITION_MS });

    colorFrom.value = colorTo.value;
    colorTo.value = geometry.iris;
    colorProgress.value = 0;
    colorProgress.value = withTiming(1, { duration: TRANSITION_MS });

    topLid.value = withTiming(geometry.lidHeight, { duration: TRANSITION_MS });

    // Suspicious and bored never blink — they stare (design doc, turn 3a).
    if (!geometry.blinks) {
      return () => cancelAnimation(topLid);
    }
    const startBlink = setTimeout(() => {
      topLid.value = withRepeat(
        withSequence(
          withTiming(size, { duration: geometry.blinkHalfMs }),
          withTiming(geometry.lidHeight, { duration: geometry.blinkHalfMs }),
          withTiming(geometry.lidHeight, { duration: geometry.blinkHoldMs }),
        ),
        -1,
      );
    }, TRANSITION_MS);
    return () => {
      clearTimeout(startBlink);
      cancelAnimation(topLid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry]);

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
  const irisGradientColors = useDerivedValue(() => ['#ffffff33', irisColor.value]);
  const wakeColors = useDerivedValue(() => ['#ffffff', irisColor.value]);
  const wakeTransform = useDerivedValue(() => [{ scale: wakeScale.value }]);
  const lowerLidY = useDerivedValue(() => size - lowerLid.value);

  // Gaze is a plain prop-driven clamp (opticGeometry.gazeLimitPx, already in
  // pixels), not itself an emotion the canvas animates through — an
  // explicit deps array (as Blob.tsx does for its plain `hunger` prop)
  // rebuilds it on change.
  const gazeTransform = useDerivedValue(() => {
    const limit = geometry.gazeLimitPx;
    return [{ translateX: gazeValue.value.x * limit }, { translateY: gazeValue.value.y * limit }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry.gazeLimitPx]);

  // 100 spokes at 3.6° pitch, each a short radial line slanted 0.6° so the
  // fibre reads as striation rather than a static sunburst. Reads irisRadius
  // off its shared value so the fibre grows and shrinks with the iris.
  const fibrePath = usePathValue((b) => {
    'worklet';
    const r = irisRadius.value;
    const inner = r * FIBRE_INNER;
    const outer = r * FIBRE_OUTER;
    for (let i = 0; i < FIBRE_COUNT; i++) {
      const a = (i / FIBRE_COUNT) * Math.PI * 2;
      const a2 = a + (FIBRE_SLANT_DEG * Math.PI) / 180;
      b.moveTo(center + inner * Math.cos(a), center + inner * Math.sin(a));
      b.lineTo(center + outer * Math.cos(a2), center + outer * Math.sin(a2));
    }
  });

  return (
    <Pressable onPress={onPress} testID="optic">
      <Canvas style={{ width: size, height: size }}>
        {/* 1. glow */}
        <Circle cx={center} cy={center} r={geometry.glowRadius} opacity={glowOpacity}>
          <RadialGradient c={vec(center, center)} r={geometry.glowRadius} colors={glowColors} />
        </Circle>

        {/* 2. bezel */}
        <Circle cx={center} cy={center} r={geometry.bezelRadius} color="#191811">
          <Shadow dx={0} dy={-1} blur={2} color="#ffffff1a" inner />
        </Circle>

        {/* 3. socket */}
        <Circle cx={center} cy={center} r={geometry.socketRadius}>
          <RadialGradient
            c={vec(center, center)}
            r={geometry.socketRadius}
            colors={['#1c1b15', '#0a0a08']}
            positions={[0.38, 0.74]}
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
          <Circle cx={center} cy={center} r={irisRadius} color={irisColor}>
            <RadialGradient c={vec(center, center)} r={irisRadius} colors={irisGradientColors} />
          </Circle>
          <Circle cx={center} cy={center} r={irisRadius} style="stroke" strokeWidth={1.5} color={irisColor} />

          <Group opacity={FIBRE_GROUP_OPACITY}>
            <Path path={fibrePath} style="stroke" strokeWidth={1} color={irisColor} opacity={FIBRE_ALPHA} />
          </Group>

          <Circle cx={center} cy={center} r={pupilRadius} color="#fff">
            <Shadow dx={0} dy={0} blur={6} color={irisColor} />
          </Circle>
        </Group>

        {/* 6. catchlight — hidden when dead (dormant) */}
        {geometry.showCatchlight ? (
          <Circle cx={size * CATCHLIGHT_X} cy={size * CATCHLIGHT_Y} r={size * CATCHLIGHT_R} color="#ffffffcc">
            <Blur blur={1.4} />
          </Circle>
        ) : null}

        {/* 7. lids */}
        <Rect x={0} y={0} width={size} height={topLid} color="#191811" />
        <Rect x={0} y={lowerLidY} width={size} height={lowerLid} color="#191811" />

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
