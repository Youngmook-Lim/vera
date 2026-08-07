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
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from './src/core/theme';
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
    })();
  }, []);

  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

  return (
    <SafeAreaProvider>
      <ScreenRouter />
    </SafeAreaProvider>
  );
}
