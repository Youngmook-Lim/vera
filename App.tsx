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
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from './src/core/theme';
import { syncLauncherIcon } from './src/core/launcher';
import { useFacilityStore } from './src/core/store';
import { ScreenRouter } from './src/shell/ScreenRouter';

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
  // Hydration decides whether she has a key at all, so the greeting can only
  // be asked for once it has settled. greetOnce holds the once-per-session
  // guard itself (store.ts) — this effect may run again on a remount and must
  // not be the thing that decides.
  useEffect(() => {
    void (async () => {
      await useFacilityStore.getState().hydrate();
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
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

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
