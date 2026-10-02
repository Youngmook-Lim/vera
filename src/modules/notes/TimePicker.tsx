import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PALETTES, font, ms, themed } from '../../core/theme';
import { MINUTE_STEP } from './schedule';

// Two columns of numbers, built rather than imported. Android's own clock
// dialog would be stock Material in the middle of a screen where every hex
// comes from `palette`, and it is a NATIVE dependency, so nothing about this
// room could be seen without a rebuild. `@react-native-community/slider` was
// dropped in the v2 cut for the same reason.
//
// Both columns wrap rather than clamp: an hour picker that stops at 23 makes
// getting to midnight a twenty-three-tap journey.
//
// onChange carries the whole pair, so the editor holds one piece of state
// rather than two that can disagree.
const pad = (v: number) => String(v).padStart(2, '0');

function Column({
  name,
  value,
  onStep,
  accent,
}: {
  name: string;
  value: number;
  onStep: (direction: 1 | -1) => void;
  accent: string;
}) {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  return (
    <View style={styles.column}>
      <Pressable testID={`${name}-up`} onPress={() => onStep(1)} hitSlop={10}>
        <Text style={[styles.caret, { color: accent }]}>▲</Text>
      </Pressable>
      <Text
        testID={`picked-${name}`}
        style={[styles.value, { fontFamily: font('mono', 600), color: p.notes.ink }]}
      >
        {pad(value)}
      </Text>
      <Pressable testID={`${name}-down`} onPress={() => onStep(-1)} hitSlop={10}>
        <Text style={[styles.caret, { color: accent }]}>▼</Text>
      </Pressable>
    </View>
  );
}

export function TimePicker({
  hour,
  minute,
  onChange,
  accent,
}: {
  hour: number;
  minute: number;
  onChange: (t: { hour: number; minute: number }) => void;
  accent?: string;
}) {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  const lit = accent ?? p.notes.ink;

  return (
    <View style={styles.row}>
      <Column
        name="hour"
        value={hour}
        accent={lit}
        onStep={(d) => onChange({ hour: (hour + 24 + d) % 24, minute })}
      />
      <Text style={[styles.colon, { fontFamily: font('mono', 600) }]}>:</Text>
      <Column
        name="minute"
        value={minute}
        accent={lit}
        onStep={(d) => onChange({ hour, minute: (minute + 60 + d * MINUTE_STEP) % 60 })}
      />
    </View>
  );
}

const S = themed((p) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  column: { alignItems: 'center', gap: 6 },
  caret: { fontSize: ms(9) },
  value: { fontSize: ms(26), letterSpacing: ms(26) * 0.04 },
  colon: { fontSize: ms(22), color: p.notes.inkDim },
}));
