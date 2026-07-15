import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore } from '../core/store';
import { isLocked, registry } from '../modules/registry';
import type { ModuleDef } from '../modules/types';
import { FacilityScreen } from './FacilityScreen';
import { PlaceholderScreen } from './PlaceholderScreen';

// Conditional rendering IS the router (docs/architecture.md): instant swaps
// on a single step value, no navigation library.
export function ScreenRouter() {
  const step = useFacilityStore((s) => s.step);

  // Android system back mirrors the ◂ arrow: any screen → facility.
  // From facility itself, fall through to the default (leave the app).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const state = useFacilityStore.getState();
      if (state.step === 'facility') return false;
      state.setStep('facility');
      return true;
    });
    return () => sub.remove();
  }, []);

  // Light-enamel screens get dark status icons; V.E.R.A.'s dark screens, light.
  const bar = <StatusBar style={step === 'facility' ? 'dark' : 'light'} />;

  if (step === 'facility') {
    return (
      <>
        {bar}
        <FacilityScreen />
      </>
    );
  }

  const mod = registry.find((e): e is ModuleDef => !isLocked(e) && e.id === step);
  return (
    <>
      {bar}
      {/* non-module steps (settings, daily, enrollment, …) arrive in phases 2–3 */}
      {mod ? <mod.Screen /> : <PlaceholderScreen title={step.toUpperCase()} />}
    </>
  );
}
