import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { needleAngle } from './walk';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const SIZE = 220;
const C = SIZE / 2;
const NEEDLE_LEN = 84;

export function Compass({ dist, walking, arrived }: { dist: number; walking: boolean; arrived: boolean }) {
  // Needle rotation in degrees (0 = pointing straight up to the target tick).
  const rot = useSharedValue(needleAngle(dist));

  useEffect(() => {
    cancelAnimation(rot);
    if (arrived) {
      rot.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    } else if (walking) {
      rot.value = withTiming(needleAngle(dist), { duration: 300, easing: Easing.out(Easing.ease) });
    } else {
      // idle wander around the homing angle
      const base = needleAngle(dist);
      rot.value = base;
      rot.value = withRepeat(
        withTiming(base + 6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [dist, walking, arrived, rot]);

  useEffect(() => () => cancelAnimation(rot), [rot]);

  // Rotate the needle end-point around center via animated x2/y2.
  const needleProps = useAnimatedProps(() => {
    const a = ((rot.value - 90) * Math.PI) / 180; // -90 so 0° points up
    return { x2: C + NEEDLE_LEN * Math.cos(a), y2: C + NEEDLE_LEN * Math.sin(a) };
  });

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* dial rings */}
      <Circle cx={C} cy={C} r={104} stroke="#1a2226" strokeWidth={1} fill="#0e1416" />
      <Circle cx={C} cy={C} r={72} stroke="#16211f" strokeWidth={1} fill="none" />
      <Circle cx={C} cy={C} r={40} stroke="#16211f" strokeWidth={1} fill="none" />
      {/* top target tick */}
      <Line x1={C} y1={C - 104} x2={C} y2={C - 92} stroke="#38c8c8" strokeWidth={2} />
      {/* needle */}
      <AnimatedLine x1={C} y1={C} animatedProps={needleProps} stroke="#38f0e0" strokeWidth={4} strokeLinecap="round" />
      {/* hub */}
      <Circle cx={C} cy={C} r={7} fill="#0c1012" stroke="#38c8c8" strokeWidth={2} />
    </Svg>
  );
}
