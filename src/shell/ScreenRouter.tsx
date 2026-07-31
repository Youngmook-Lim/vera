import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { useFacilityStore } from '../core/store';
import { palette } from '../core/theme';
import { Stage } from './Stage';

// Conditional rendering on `view` IS the router (spec §3): instant swaps, no
// navigation library. Every v2 surface is dark, so the status bar never flips.
export function ScreenRouter() {
  const view = useFacilityStore((s) => s.view);

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
      {view === 'stage' ? (
        <Stage />
      ) : (
        // Tasks 12–17 replace this with the log, system, files and the two rooms.
        <View testID={`view-${view}`} style={{ flex: 1, backgroundColor: palette.bg }} />
      )}
    </>
  );
}
