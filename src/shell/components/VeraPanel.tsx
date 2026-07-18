import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { shellStrings } from '../strings';

// Dark transmission card from the mock: amber pulsing LIVE dot (1.4s),
// REC stamp, 3px orange left border on the line.
export function VeraPanel({ line, lang, rec = 'REC 00:00:09', cursor = false, accent = palette.accent.orange }: { line: string; lang: Lang; rec?: string; cursor?: boolean; accent?: string }) {
  const pulse = useSharedValue(1);
  const blink = useSharedValue(1);
  useEffect(() => {
    // 700ms there + reverse = the mock's 1.4s fpulse cycle
    pulse.value = withRepeat(withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
    blink.value = withRepeat(
      withSequence(withTiming(1, { duration: 20 }), withDelay(480, withTiming(0, { duration: 20 })), withDelay(480, withTiming(0, { duration: 0 }))),
      -1,
      false,
    );
  }, [pulse, blink]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const cursorStyle = useAnimatedStyle(() => ({ opacity: blink.value }));
  const t = shellStrings[lang];

  return (
    <View style={{ backgroundColor: palette.dark.bgAlt, borderRadius: 14, overflow: 'hidden', elevation: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 9,
          paddingHorizontal: 13,
          backgroundColor: palette.dark.cardHeader,
          borderBottomWidth: 1,
          borderBottomColor: '#000',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Animated.View
            style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }, dotStyle]}
          />
          <Text
            style={{
              fontFamily: font('mono', 600, lang),
              fontSize: ms(8.5),
              letterSpacing: ms(8.5) * 0.1,
              color: palette.accent.amber,
            }}
          >
            {t.live}
          </Text>
        </View>
        <Text style={{ fontFamily: font('mono', 500), fontSize: ms(8.5), color: palette.dark.textFaint }}>{rec}</Text>
      </View>
      <View
        style={{
          paddingTop: 14,
          paddingHorizontal: 15,
          paddingBottom: 15,
          borderLeftWidth: 3,
          borderLeftColor: accent,
        }}
      >
        <Text
          style={{
            fontFamily: font('display', 500, lang),
            fontSize: ms(13),
            lineHeight: ms(13) * 1.6,
            color: palette.dark.text,
          }}
        >
          {line}
          {cursor ? <Animated.Text style={[{ color: palette.accent.amber }, cursorStyle]}>▍</Animated.Text> : null}
        </Text>
      </View>
    </View>
  );
}
