import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
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
import { syncScheduledTransmissions } from './src/core/notifications';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  const hydrated = useFacilityStore((s) => s.hydrated);
  useEffect(() => {
    void useFacilityStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { notif, lang } = useFacilityStore.getState();
    void syncScheduledTransmissions(notif, lang);
  }, [hydrated]);

  if (!fontsLoaded || !hydrated) return <View style={{ flex: 1, backgroundColor: palette.dark.bg }} />;

  return (
    <SafeAreaProvider>
      <ScreenRouter />
    </SafeAreaProvider>
  );
}
