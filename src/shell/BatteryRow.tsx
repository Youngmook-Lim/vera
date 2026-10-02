import React, { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { askBatteryUnrestricted, isBatteryUnrestricted } from '../core/power';
import { useFacilityStore } from '../core/store';
import { usePalette } from '../core/useTheme';
import { PrefRow } from './PrefRow';
import { T } from './strings';

// The one setting in this app that lives entirely outside it. Samsung's
// Freecess holds a frozen app's alarms past their hour — a ten o'clock story
// arrived at 03:00 and a nine o'clock card at 11:17 — and nothing in here can
// override it. Battery → Unrestricted is the whole fix, confirmed on the
// device, so the row's job is to say plainly whether it has been done.
//
// It reads the real state rather than remembering what was asked for, the way
// the notification rows call getPermissionsAsync() at render: the subject can
// undo this in the OS at any time, and a row repeating its own last request
// would go on claiming the cards are safe long after they had stopped coming.
export function BatteryRow() {
  // No sheet in this file at all — one inline colour, so the hook alone.
  const p = usePalette();
  const lang = useFacilityStore((s) => s.lang);
  const t = T[lang];

  const [free, setFree] = useState<boolean | null>(() => isBatteryUnrestricted());

  // Granting this means leaving the app for a system dialog, so a read at
  // mount alone would show the old answer for as long as the screen stayed
  // open. Coming back is exactly when it is worth asking again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setFree(isBatteryUnrestricted());
    });
    return () => sub.remove();
  }, []);

  const onPress = useCallback(() => {
    askBatteryUnrestricted();
  }, []);

  // `null` is "we could not ask", not a third answer about the setting, so it
  // shows the faint dash rather than the red warning — an old build without
  // the native module must not accuse the subject of something they may well
  // have already done. The press is still offered there: the dialog may work
  // even when the read does not.
  const value = free === true ? t.batteryFree : free === false ? t.batteryHeld : t.batteryUnknown;
  const valueColor =
    free === true ? undefined : free === false ? p.danger : p.textFaint;

  return (
    <PrefRow
      testID="pref-battery"
      label={t.battery}
      value={value}
      valueColor={valueColor}
      onPress={free === true ? undefined : onPress}
    />
  );
}
