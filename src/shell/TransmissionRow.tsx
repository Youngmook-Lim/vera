import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../core/store';
import { type PermissionState, transmissionPermission } from '../vera/transmissionsNotify';
import { PrefRow } from './PrefRow';
import { T } from './strings';

// Her own notifications, and the shell's own row. Hardcoded in SystemScreen
// rather than contributed through `ModuleDef.Settings`: that hook exists so
// the shell never names a MODULE, and she is not one.
//
// It does NOT follow the logo's no-key rule. The tag beside the wordmark
// disappears without a key and the logo stops being a control, because she has
// no register until she is woken — but a switch that governs Android is not a
// register, and with no key the pool it draws from is DEFAULT's anyway.
export function TransmissionRow() {
  const lang = useFacilityStore((s) => s.lang);
  const transmissions = useFacilityStore((s) => s.transmissions);
  const setTransmissions = useFacilityStore((s) => s.setTransmissions);
  const t = T[lang];

  // Read at render, exactly as the rooms' rows do: the store would still say
  // ON after a permission revoked in the OS settings, and only asking catches
  // that nothing is arriving.
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await transmissionPermission();
      if (!cancelled) setPermission(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [transmissions]);

  const blocked = permission === 'blocked';
  // 'ask' means granted was revoked outside the app but Android will still
  // prompt again. `null` — the read has not landed yet — falls through to the
  // store's own answer, so the row does not flash OFF for one frame on open.
  const value = blocked
    ? t.blocked
    : permission === 'ask'
      ? t.off
      : transmissions
        ? t.on
        : t.off;

  return (
    <PrefRow
      testID="pref-transmissions"
      label={t.transmissions}
      value={value}
      onPress={blocked ? undefined : () => void setTransmissions(!transmissions)}
    />
  );
}
