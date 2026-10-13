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
import { syncLaunchTheme, syncLauncherIcon } from './src/core/launcher';
import { useFacilityStore } from './src/core/store';
import { stopVoice } from './src/core/voice';
import { registry } from './src/modules/registry';
import { isModule } from './src/modules/types';
import { ScreenRouter } from './src/shell/ScreenRouter';
import { SPLASH_HOLD_MS, Splash } from './src/shell/Splash';

// The native splash is a bare ground and nothing else (2026-09-10 — Splash.tsx
// carries the reasoning), in the colour of the theme stored on the previous
// launch (2026-10-08 — `syncLaunchTheme`), held until the JS splash can paint the
// day's face on the same colour. Holding it is what makes the handover
// invisible: without this the native splash ends the instant the root view
// mounts, and the app flashes whatever is behind it while the fonts load.
//
// It rejects if the splash is already gone (a fast reload); there is nothing to
// do about that and nothing lost by it.
void SplashScreen.preventAutoHideAsync().catch(() => {});

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

  const apiKey = useFacilityStore((s) => s.apiKey);
  const theme = useFacilityStore((s) => s.theme);
  const hydrated = useFacilityStore((s) => s.hydrated);
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

      // Hers. Not a room, so it is not on the registry and this file names
      // it — the same reason SystemScreen carries her row directly. Behind
      // dueForSync, so it does nothing on the second launch of a day.
      await useFacilityStore.getState().syncTransmissionsIfDue();

      await useFacilityStore.getState().greetOnce();
      // Anything left on the queue by a killed session (continuity §4.2).
      void useFacilityStore.getState().extractNow();
    })();

    // The natural session boundary, and the trigger that catches most cases.
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'background') return;
      // She does not go on talking from a pocket.
      stopVoice();
      void useFacilityStore.getState().extractNow();
      // The launcher face rides the same boundary, and only this one: the
      // swap disables the alias the app is running under, which Android is
      // unreliable about in the foreground. Nothing is lost by waiting —
      // the home screen is not visible from inside the app.
      //
      // The theme rides it too (2026-10-08): it picks which DRAWING of today's
      // face the launcher wears, and the colour of the next launch's first
      // frame. A switch made inside the app reaches both on the way out.
      const { apiKey: key, theme: ground } = useFacilityStore.getState();
      syncLauncherIcon(Boolean(key), ground);
      syncLaunchTheme(ground);
    });

    return () => {
      disposed = true;
      sub.remove();
      for (const off of offs) off();
    };
  }, []);

  // Hydration is also what settles whether she has a key, so the splash cannot
  // know her face before this — which is exactly why the native ground is held
  // until it lands. While `ready` is false this splash is drawn but sits behind
  // the native one, unseen; `apiKey` and `hydrated` are written together in
  // hydrate(), so the frame it becomes visible on is already the right face.
  //
  // The native splash is a bare colour now (see Splash.tsx): there is no PNG
  // under this to flip away from, so the first eye the subject sees is the
  // day's, drawn by Skia rather than upscaled from a 432px icon asset.
  const ready = fontsLoaded && hydrated;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!ready) return;
    void SplashScreen.hideAsync().catch(() => {});
    const id = setTimeout(() => setHeld(true), SPLASH_HOLD_MS);
    return () => clearTimeout(id);
  }, [ready]);

  if (!ready || !held) return <Splash hasKey={Boolean(apiKey)} theme={theme} />;

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
