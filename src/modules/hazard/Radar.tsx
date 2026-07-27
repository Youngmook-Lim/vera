import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 230;
const C = SIZE / 2; // 115 — radar center
const R = 112; // sweep working radius

// Detected-entity blips: base position (from the mock's dot offsets), color,
// and a phase constant so each drifts/pulses out of sync from one clock.
const BLIPS = [
  { bx: 59.5, by: 55.5, color: '#ff5a48', phase: 0 },
  { bx: 161.5, by: 81.5, color: '#ff5a48', phase: 1.7 },
  { bx: 141.5, by: 161.5, color: '#ff5a48', phase: 3.1 },
  { bx: 77.5, by: 153.5, color: '#4fd08a', phase: 4.6 },
];

// A quarter wedge (12 o'clock → 3 o'clock) filled with the sweep gradient.
const WEDGE = `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 0 1 ${C + R} ${C} Z`;

function Blip({ drift, bx, by, color, phase }: { drift: SharedValue<number>; bx: number; by: number; color: string; phase: number }) {
  const props = useAnimatedProps(() => {
    const t = drift.value + phase;
    return {
      cx: bx + 8 * Math.sin(t),
      cy: by + 8 * Math.cos(t * 0.8),
      opacity: 0.55 + 0.45 * Math.sin(t * 1.3),
    };
  });
  return (
    <>
      {/* static soft glow rim behind the blip */}
      <Circle cx={bx} cy={by} r={9} fill={color} opacity={0.14} />
      <AnimatedCircle animatedProps={props} r={3.5} fill={color} />
    </>
  );
}

export function Radar() {
  const rot = useSharedValue(0); // sweep rotation, degrees
  const drift = useSharedValue(0); // shared phase for blip drift/pulse, radians

  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 4400, easing: Easing.linear }), -1, false);
    drift.value = withRepeat(withTiming(Math.PI * 2, { duration: 6000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(rot);
      cancelAnimation(drift);
    };
  }, [rot, drift]);

  const sweepProps = useAnimatedProps(() => ({ rotation: rot.value }));

  return (
    <Svg width={SIZE} height={SIZE}>
      <Defs>
        <RadialGradient id="haz-bg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#1d1416" />
          <Stop offset="72%" stopColor="#131011" />
        </RadialGradient>
        <RadialGradient id="haz-you" cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="72%" stopColor="#f4b43a" />
        </RadialGradient>
        <LinearGradient id="haz-sweep" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#d63a2a" stopOpacity={0.24} />
          <Stop offset="100%" stopColor="#d63a2a" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* dish + rings */}
      <Circle cx={C} cy={C} r={114} fill="url(#haz-bg)" stroke="#2c2222" strokeWidth={1} />
      <Circle cx={C} cy={C} r={87} fill="none" stroke="#241a1c" strokeWidth={1} />
      <Circle cx={C} cy={C} r={59} fill="none" stroke="#241a1c" strokeWidth={1} strokeDasharray="3 4" />
      {/* crosshairs */}
      <Line x1={C} y1={1} x2={C} y2={SIZE - 1} stroke="#241a1c" strokeWidth={1} />
      <Line x1={1} y1={C} x2={SIZE - 1} y2={C} stroke="#241a1c" strokeWidth={1} />

      {/* rotating sweep */}
      <AnimatedG originX={C} originY={C} animatedProps={sweepProps}>
        <Path d={WEDGE} fill="url(#haz-sweep)" />
      </AnimatedG>

      {/* entity blips */}
      {BLIPS.map((b, i) => (
        <Blip key={i} drift={drift} bx={b.bx} by={b.by} color={b.color} phase={b.phase} />
      ))}

      {/* center: you (glow rim + core) */}
      <Circle cx={C} cy={C} r={11} fill="#f4b43a" opacity={0.18} />
      <Circle cx={C} cy={C} r={4.5} fill="url(#haz-you)" />
    </Svg>
  );
}
