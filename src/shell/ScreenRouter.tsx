import { StatusBar } from 'expo-status-bar';
import React, { useEffect, type ComponentType } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import type { View as ViewName } from '../core/store';
import { useFacilityStore } from '../core/store';
import { themed } from '../core/theme';
import { registry } from '../modules/registry';
import type { ModuleId } from '../modules/types';
import { isModule } from '../modules/types';
import { Cabinet } from './Cabinet';
import { FileScreen } from './FileScreen';
import { KeyPanel } from './KeyPanel';
import { LogScreen } from './LogScreen';
import { Stage } from './Stage';
import { SystemScreen } from './SystemScreen';

// The rooms come from the registry, never from a list kept here — a third
// module is one folder exporting a ModuleDef plus one line in registry.ts.
const MODULE_SCREENS: Partial<Record<ModuleId, ComponentType>> = Object.fromEntries(
  registry.filter(isModule).map((entry) => [entry.id, entry.Screen]),
);

function CurrentView({ view }: { view: ViewName }) {
  // Only the fallback surface below needs this, and only on an id with no
  // folder behind it — but a dark blank on a pale app would read as a crash.
  const styles = S[useFacilityStore((s) => s.theme)];
  switch (view) {
    case 'stage':
      return <Stage />;
    case 'log':
      return <LogScreen />;
    case 'sys':
      return <SystemScreen />;
    // One screen, two documents — FileScreen reads `view` itself to know
    // which of her files it is showing.
    case 'mem':
    case 'soul':
    case 'mode':
    case 'prompt':
      return <FileScreen />;
    default: {
      const Screen = MODULE_SCREENS[view];
      // A module id with no folder behind it: a dark surface, and back still
      // works. Unreachable while every ModuleId is in the registry.
      if (!Screen) return <View testID={`view-${view}`} style={styles.blank} />;
      return <Screen />;
    }
  }
}

// Conditional rendering on `view` IS the router (spec §3): instant swaps, no
// navigation library. Every v2 surface is dark, so the status bar never flips.
// The cabinet and the credential panel are overlays, not views — they sit on
// top of whatever room is showing, and stepBack closes them before it moves.
export function ScreenRouter() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const view = useFacilityStore((s) => s.view);
  const cabinetOpen = useFacilityStore((s) => s.cabinetOpen);
  const keyPanelOpen = useFacilityStore((s) => s.keyPanelOpen);

  // Android system back is one step out of wherever she is, and returns false
  // only on the stage — which is the signal to let the OS close the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      useFacilityStore.getState().stepBack(),
    );
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <CurrentView view={view} />
      {cabinetOpen ? <Cabinet /> : null}
      {keyPanelOpen ? <KeyPanel /> : null}
    </>
  );
}

const S = themed((p) => StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: p.bg,
  },
}));
