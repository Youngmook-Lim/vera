import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../core/i18n';
import { font, ms, palette } from '../../core/theme';
import { DISPLAY_ORDER } from './schedule';
import { T } from './strings';

// Seven toggles, Monday first. The ORDER comes from DISPLAY_ORDER and the
// NAMES are indexed by the day itself, so there is exactly one place that
// knows the row does not read in storage order.
export function DayPicker({
  days,
  onChange,
  lang,
  accent,
}: {
  days: readonly number[];
  onChange: (days: number[]) => void;
  lang: Lang;
  accent?: string;
}) {
  const lit = accent ?? palette.notes.ink;

  const toggle = (day: number) =>
    onChange(
      days.includes(day)
        ? days.filter((d) => d !== day)
        : [...days, day].sort((a, b) => a - b),
    );

  return (
    <View style={styles.row}>
      {DISPLAY_ORDER.map((day) => {
        const on = days.includes(day);
        return (
          <Pressable
            key={day}
            testID={`day-${day}`}
            accessibilityRole="checkbox"
            accessibilityState={{ selected: on }}
            onPress={() => toggle(day)}
            style={[
              styles.day,
              { borderColor: on ? lit : palette.notes.cardBorder },
            ]}
          >
            <Text
              style={[
                styles.dayText,
                { fontFamily: font('mono', 500, lang), color: on ? lit : palette.notes.inkDim },
              ]}
            >
              {T[lang].dayNames[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  dayText: { fontSize: ms(8.5) },
});
