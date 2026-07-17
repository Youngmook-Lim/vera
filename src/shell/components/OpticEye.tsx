import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { palette } from '../../core/theme';

// V.E.R.A.'s eye, approximated from the mock's radial gradients with flat
// layers (no Skia in phase 2): glow halos, dark face, faint inner ring,
// breathing amber iris, bright core.
export function OpticEye({ size, inner = true }: { size: number; inner?: boolean }) {
  const breathe = useSharedValue(1);
  const glow = useSharedValue(0.9);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1.09, { duration: 1700, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow.value = withRepeat(withTiming(0.55, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathe, glow]);
  const irisStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const circle = (d: number): ViewStyle => ({ position: 'absolute', width: d, height: d, borderRadius: d / 2 });
  const face = size * 0.88;
  const innerRing = size * 0.76;
  const iris = size * 0.44;
  const dot = Math.round(size * 0.095);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[circle(size * 1.31), { backgroundColor: '#f4b43a14' }, glowStyle]} />
      <Animated.View style={[circle(size * 1.05), { backgroundColor: '#f4b43a10' }, glowStyle]} />
      <View style={[circle(face), { backgroundColor: '#0d0d0b', borderWidth: 1, borderColor: '#ffffff12' }]} />
      {inner && <View style={[circle(innerRing), { borderWidth: 1, borderColor: '#f4b43a33' }]} />}
      <Animated.View style={[circle(iris), { borderWidth: 2, borderColor: palette.accent.amber }, irisStyle]} />
      <View style={[circle(dot), { backgroundColor: '#ffffff' }]} />
      <View style={[circle(dot + 4), { borderWidth: 2, borderColor: palette.accent.amber }]} />
    </View>
  );
}
