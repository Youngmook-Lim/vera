import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../../core/store';
import { PrefRow } from '../../shell/PrefRow';
import { type PermissionState, permissionState } from './notify';
import { useAdviceStore } from './store';
import { T } from './strings';

// This room's one preference, shown on the SYSTEM screen. The row is a shell
// surface and wears the shell's chrome (PrefRow); what it says and what it does
// belong to the room.
export function AdviceSettings() {
  const lang = useFacilityStore((s) => s.lang);
  const daily = useAdviceStore((s) => s.daily);
  const setDaily = useAdviceStore((s) => s.setDaily);
  const t = T[lang];

  // Read at render, exactly as the LAUNCHER row reads the launcher's real
  // face rather than what was last asked for: the store would still say
  // `daily` after a permission revoked in the OS settings, and only asking
  // catches that nothing is arriving.
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
  }, [daily]);

  const blocked = permission === 'blocked';
  const value = blocked ? t.blocked : daily ? t.on : t.off;

  return (
    <PrefRow
      testID="pref-daily"
      label={t.daily}
      value={value}
      onPress={blocked ? undefined : () => void setDaily(!daily, lang)}
    />
  );
}
