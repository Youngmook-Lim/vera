import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// The mock's fscan sweep: a 60px amber gradient bar drifting down the screen.
export function Scanline({ duration = 6000 }: { duration?: number }) {
  const { height } = useWindowDimensions();
  const y = useSharedValue(-60);
  useEffect(() => {
    y.value = -60;
    y.value = withRepeat(withTiming(height, { duration, easing: Easing.linear }), -1, false);
  }, [y, height, duration]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 60, zIndex: 1 }, style]}>
      <LinearGradient colors={['#ffffff00', '#f4b43a0f', '#ffffff00']} style={{ flex: 1 }} />
    </Animated.View>
  );
}
