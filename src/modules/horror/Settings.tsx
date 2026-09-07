import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../../core/store';
import { PrefRow } from '../../shell/PrefRow';
import { type PermissionState, permissionState } from './notify';
import { useHorrorStore } from './store';
import { T } from './strings';

// This room's one preference, shown on the SYSTEM screen beside the advice
// room's. The row is a shell surface and wears the shell's chrome (PrefRow);
// what it says and what it does belong to the room.
export function HorrorSettings() {
  const lang = useFacilityStore((s) => s.lang);
  const nightly = useHorrorStore((s) => s.nightly);
  const setNightly = useHorrorStore((s) => s.setNightly);
  const t = T[lang];

  // Read at render, for the same reason the advice row does: the store would
  // still say `nightly` after a permission revoked in the OS settings, and
  // only asking catches that nothing is arriving.
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await permissionState();
      if (!cancelled) setPermission(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [nightly]);

  const blocked = permission === 'blocked';
  const value = blocked ? t.blocked : permission === 'ask' ? t.off : nightly ? t.on : t.off;

  return (
    <PrefRow
      testID="pref-nightly"
      label={t.nightly}
      value={value}
      onPress={blocked ? undefined : () => void setNightly(!nightly, lang)}
    />
  );
}
