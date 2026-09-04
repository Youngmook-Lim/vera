import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { font, ms, palette } from '../core/theme';

// One preferences row, in one place, because modules contribute rows here too
// and a room reproducing the shell's geometry from memory is how two of them
// end up looking almost the same. The row is a SHELL surface: it wears the
// shell's amber, not the module's ink. The doorway rule governs what is behind
// a doorway, and this is in front of one.
export function PrefRow({
  label,
  value,
  onPress,
  valueColor,
  testID,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  valueColor?: string;
  testID?: string;
}) {
  const lang = useFacilityStore((s) => s.lang);
  const body = (
    <>
      <Text style={[styles.rowLabel, { fontFamily: font('mono', 500, lang) }]}>{label}</Text>
      <Text
        testID={testID}
        style={[
          styles.rowValue,
          { fontFamily: font('mono', 500, lang) },
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </>
  );

  return onPress ? (
    <Pressable style={styles.row} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.borderSoft,
  },
  rowLabel: {
    fontSize: ms(11),
    letterSpacing: ms(11) * 0.06,
    color: palette.text,
  },
  rowValue: {
    fontSize: ms(9),
    letterSpacing: ms(9) * 0.16,
    color: palette.amber,
  },
});
