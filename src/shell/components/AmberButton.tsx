import React from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';

// Primary CTA from the mock: amber slab, radius 15, dark ink label.
export function AmberButton({
  label,
  onPress,
  lang,
  arrow = true,
  style,
}: {
  label: string;
  onPress: () => void;
  lang: Lang;
  arrow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        { backgroundColor: palette.accent.amber, borderRadius: 15, padding: 16, alignItems: 'center', elevation: 6 },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font('display', 700, lang),
          fontSize: ms(13),
          letterSpacing: ms(13) * 0.1,
          color: palette.light.ink,
        }}
      >
        {arrow ? `${label} ▸` : label}
      </Text>
    </Pressable>
  );
}
