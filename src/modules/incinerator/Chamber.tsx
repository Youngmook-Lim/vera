import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Lang } from '../../core/i18n';
import { font, ms } from '../../core/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const W = 250;
const H = 150;
const IDLE = 96;
const SURGE = 150;

// The mock's flame: a radial-gradient block anchored to the bottom that grows
// (96→150) and flickers (slow at idle, fast while burning). No Skia — SVG + a
// couple of Reanimated shared values reproduce it faithfully.
export function Chamber({ burning, label, lang }: { burning: boolean; label: string; lang: Lang }) {
  const h = useSharedValue(IDLE);
  const flick = useSharedValue(1);

  useEffect(() => {
    h.value = withTiming(burning ? SURGE : IDLE, { duration: 500, easing: Easing.out(Easing.ease) });
    cancelAnimation(flick);
    flick.value = 1;
    flick.value = withRepeat(
      withTiming(burning ? 0.8 : 0.9, { duration: burning ? 250 : 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [burning, h, flick]);

  useEffect(
    () => () => {
      cancelAnimation(h);
      cancelAnimation(flick);
    },
    [h, flick],
  );

  const flameProps = useAnimatedProps(() => ({ height: h.value, y: H - h.value, opacity: flick.value }));

  return (
    <View style={{ width: W, height: H, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#3a281e' }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="chamberBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#241612" />
            <Stop offset="1" stopColor="#160d0a" />
          </LinearGradient>
          <RadialGradient id="flame" cx="0.5" cy="1.2" rx="1.2" ry="0.9">
            <Stop offset="0" stopColor="#ffcf4a" />
            <Stop offset="0.4" stopColor="#ff6a1a" />
            <Stop offset="0.72" stopColor="#a02010" />
            <Stop offset="1" stopColor="#3a1206" />
          </RadialGradient>
          <LinearGradient id="chamberFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#160d0a" stopOpacity="1" />
            <Stop offset="1" stopColor="#160d0a" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#chamberBg)" />
        <AnimatedRect x="0" width={W} fill="url(#flame)" animatedProps={flameProps} />
        <Rect x="0" y={H - 20} width={W} height="20" fill="url(#chamberFade)" />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 14,
          textAlign: 'center',
          fontFamily: font('mono', 600, lang),
          fontSize: ms(9),
          letterSpacing: ms(9) * 0.2,
          color: '#ffcf9a',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
