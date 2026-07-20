import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useFacilityStore, type Step } from '../core/store';
import { isLocked, registry } from '../modules/registry';
import type { ModuleDef } from '../modules/types';
import { DailyScreen } from './daily/DailyScreen';
import { MissedScreen } from './daily/MissedScreen';
import { AssignedScreen } from './enrollment/AssignedScreen';
import { BaselineScreen } from './enrollment/BaselineScreen';
import { ConsentScreen } from './enrollment/ConsentScreen';
import { IntakeScreen } from './enrollment/IntakeScreen';
import { PermissionScreen } from './enrollment/PermissionScreen';
import { FacilityScreen } from './FacilityScreen';
import { PlaceholderScreen } from './PlaceholderScreen';

const ENROLLMENT_STEPS: readonly Step[] = ['intake', 'baseline', 'consent', 'assigned', 'permission'];
const LIGHT_STEPS: readonly Step[] = ['facility', 'baseline', 'consent', 'daily', 'missed'];

const SHELL_SCREENS: Partial<Record<Step, React.ComponentType>> = {
  intake: IntakeScreen,
  baseline: BaselineScreen,
  consent: ConsentScreen,
  assigned: AssignedScreen,
  permission: PermissionScreen,
  facility: FacilityScreen,
  daily: DailyScreen,
  missed: MissedScreen,
};

// Conditional rendering IS the router (docs/architecture.md): instant swaps
// on a single step value, no navigation library.
export function ScreenRouter() {
  const step = useFacilityStore((s) => s.step);

  // Android system back: within enrollment, step to the previous screen (and
  // let the OS close the app from the first step); facility falls through to
  // the default (leave the app); everything else mirrors the ◂ arrow to facility.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const state = useFacilityStore.getState();
      if (state.step === 'facility') return false;
      const enrollIndex = ENROLLMENT_STEPS.indexOf(state.step);
      if (enrollIndex !== -1) {
        if (enrollIndex === 0) return false; // from intake, let the OS exit
        state.setStep(ENROLLMENT_STEPS[enrollIndex - 1]);
        return true;
      }
      state.setStep('facility');
      return true;
    });
    return () => sub.remove();
  }, []);

  // Light-enamel screens get dark status icons; V.E.R.A.'s dark screens, light.
  const bar = <StatusBar style={LIGHT_STEPS.includes(step) ? 'dark' : 'light'} />;

  const Shell = SHELL_SCREENS[step];
  if (Shell) {
    return (
      <>
        {bar}
        <Shell />
      </>
    );
  }

  const mod = registry.find((e): e is ModuleDef => !isLocked(e) && e.id === step);
  return (
    <>
      {bar}
      {/* settings and notiflog arrive in phase 5 */}
      {mod ? <mod.Screen /> : <PlaceholderScreen title={step.toUpperCase()} />}
    </>
  );
}
