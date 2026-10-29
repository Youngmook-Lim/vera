import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../../core/store';
import { PrefRow } from '../../shell/PrefRow';
import { type PermissionState, permissionState } from './notify';
import { useAffirmationsStore } from './store';
import { T } from './strings';

// This room's one preference, shown on SYSTEM in the shell's chrome. What it
// says and what it does belong to the room.
export function AffirmationsSettings() {
  const lang = useFacilityStore((s) => s.lang);
  const daily = useAffirmationsStore((s) => s.daily);
  const setDaily = useAffirmationsStore((s) => s.setDaily);
  const t = T[lang];

  // Read at render, the advice row's reason: a permission revoked in the OS
  // would otherwise leave this reading ON over a phone that shows nothing.
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
  const value = blocked ? t.blocked : permission === 'ask' ? t.off : daily ? t.on : t.off;

  return (
    <PrefRow
      testID="pref-affirmations"
      label={t.daily}
      value={value}
      onPress={blocked ? undefined : () => void setDaily(!daily, lang)}
    />
  );
}
