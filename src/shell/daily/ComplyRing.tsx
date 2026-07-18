import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { dailyStrings } from './strings';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 184;
const THICKNESS = 12;
const R = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const HOLD_MS = 2200; // the mock's 2.2s hold

export function ComplyRing({
  onComplete,
  onHoldChange,
  lang,
}: {
  onComplete: () => void;
  onHoldChange: (holding: boolean) => void;
  lang: Lang;
}) {
  const progress = useSharedValue(0);
  const t = dailyStrings[lang];

  // finger-lift, slide-off, and screen-exit must all cancel the hold
  // (design handoff risk list)
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const start = () => {
    onHoldChange(true);
    progress.value = 0;
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  };
  const cancel = () => {
    onHoldChange(false);
    cancelAnimation(progress);
    progress.value = 0;
  };

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel="hold to comply"
      style={{ width: SIZE, height: SIZE }}
    >
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#d3cfc4" strokeWidth={THICKNESS} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={palette.accent.amber}
          strokeWidth={THICKNESS}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={arcProps}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: THICKNESS,
          left: THICKNESS,
          right: THICKNESS,
          bottom: THICKNESS,
          borderRadius: (SIZE - 2 * THICKNESS) / 2,
          backgroundColor: '#141310',
          borderWidth: 1,
          borderColor: '#242320',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: palette.accent.amber, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ffffff' }} />
        </View>
        <Text style={{ marginTop: 11, fontFamily: font('display', 700, lang), fontSize: ms(11), letterSpacing: ms(11) * 0.1, color: '#f4efe2' }}>
          {t.holdToComply}
        </Text>
      </View>
    </Pressable>
  );
}
