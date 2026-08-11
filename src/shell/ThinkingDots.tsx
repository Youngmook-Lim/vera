import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '../core/theme';

// fthink: three 3px amber dots on a 1.1s cycle, staggered by 180ms. She waits
// this way on both surfaces that can be waiting — the stage and the log — so
// it lives here rather than twice.
const THINK_MS = 1100;
const STAGGER_MS = 180;

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.2);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: THINK_MS / 2 }),
          withTiming(0.2, { duration: THINK_MS / 2 }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function ThinkingDots({ style }: { style?: object }) {
  return (
    <View style={[styles.row, style]} testID="thinking">
      <Dot delay={0} />
      <Dot delay={STAGGER_MS} />
      <Dot delay={STAGGER_MS * 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.amber,
  },
});
