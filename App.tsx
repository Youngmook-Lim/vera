import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { NanumMyeongjo_400Regular } from '@expo-google-fonts/nanum-myeongjo';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { syncLauncherIcon } from './src/core/launcher';
import { useFacilityStore } from './src/core/store';
import { registry } from './src/modules/registry';
import { isModule } from './src/modules/types';
import { ScreenRouter } from './src/shell/ScreenRouter';
import { Splash } from './src/shell/Splash';

// The native splash is a build-time PNG and cannot follow the icon's rotation,
// so it ships as the dormant face (app.json → icon-fg-dormant.png) and is held
// until the JS splash can paint the day's face over it. Holding it is what
// makes the handover invisible: without this the PNG vanishes the instant the
// root view mounts, and the app shows a bare colour while the fonts load.
//
// It rejects if the splash is already gone (a fast reload); there is nothing to
// do about that and nothing lost by it.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// How long the day's face stays up once there is nothing left to wait for. The
// eye is the whole point of the screen, and on a warm start fonts and hydration
// together can finish inside 200ms — long enough to hide the wait, far too
// short to read a face by.
const SPLASH_HOLD_MS = 900;

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    NanumMyeongjo_400Regular,
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  const hydrated = useFacilityStore((s) => s.hydrated);
  const apiKey = useFacilityStore((s) => s.apiKey);
  // Hydration decides whether she has a key at all, so the greeting can only
  // be asked for once it has settled. greetOnce holds the once-per-session
  // guard itself (store.ts) — this effect may run again on a remount and must
  // not be the thing that decides.
  useEffect(() => {
    // The rooms boot asynchronously, so their unsubscribes arrive after this
    // effect has returned its cleanup. `disposed` is what stops a listener
    // subscribed by a room that finished booting after an unmount.
    const offs: (() => void)[] = [];
    let disposed = false;

    void (async () => {
      await useFacilityStore.getState().hydrate();

      // Every room's own launch work — its daily horizon, which does nothing
      // on the second launch of a day, and any tap Android held while the app
      // was dead. Driven off the registry so this file names no module, the
      // same reason Cabinet and ScreenRouter read it.
      //
      // Kept ahead of greetOnce deliberately: if it ever rejects below, the
      // IIFE rejects with it, and no room must go unhydrated for the rest of
      // the session as a result. Rooms boot after the facility store has
      // hydrated so their notifications are scheduled in the settled language.
      for (const room of registry.filter(isModule)) {
        const off = await room.onBoot?.();
        if (!off) continue;
        if (disposed) off();
        else offs.push(off);
      }

      await useFacilityStore.getState().greetOnce();
      // Anything left on the queue by a killed session (continuity §4.2).
      void useFacilityStore.getState().extractNow();
    })();

    // The natural session boundary, and the trigger that catches most cases.
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'background') return;
      void useFacilityStore.getState().extractNow();
      // The launcher face rides the same boundary, and only this one: the
      // swap disables the alias the app is running under, which Android is
      // unreliable about in the foreground. Nothing is lost by waiting —
      // the home screen is not visible from inside the app.
      syncLauncherIcon(Boolean(useFacilityStore.getState().apiKey));
    });

    return () => {
      disposed = true;
      sub.remove();
      for (const off of offs) off();
    };
  }, []);

  // Hydration is also what settles whether she has a key, so the splash cannot
  // know her face before this — which is exactly why the native PNG is held
  // until it lands. While `ready` is false the JS splash is drawn but sits
  // behind the native one, unseen; `apiKey` and `hydrated` are written together
  // in hydrate(), so the frame it becomes visible on is already the right face.
  const ready = fontsLoaded && hydrated;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync().catch(() => {});
    const id = setTimeout(() => setHeld(true), SPLASH_HOLD_MS);
    return () => clearTimeout(id);
  }, [ready]);

  if (!ready || !held) return <Splash hasKey={Boolean(apiKey)} />;

  return (
    <SafeAreaProvider>
      {/* the IME height the stage and the log pad themselves by; Android has
          been edge-to-edge since SDK 54 and never resizes the window for it */}
      <KeyboardProvider>
        <ScreenRouter />
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
