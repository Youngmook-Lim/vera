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
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { font, ms, palette } from './src/core/theme';

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

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: palette.dark.bg }} />;

  // Temporary type specimen — Task 8 replaces this with ScreenRouter.
  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, justifyContent: 'center', padding: 24, gap: 12 }}>
      <StatusBar style="light" />
      <Text style={{ fontFamily: font('display', 700), fontSize: ms(16), color: palette.dark.text }}>
        PERSONAL ENRICHMENT PROGRAM
      </Text>
      <Text style={{ fontFamily: font('mono', 500), fontSize: ms(9), color: palette.accent.amber }}>
        REC 00:00:09 · LIVE TRANSMISSION
      </Text>
      <Text style={{ fontFamily: font('display', 500, 'ko'), fontSize: ms(13), color: palette.dark.text }}>
        역량 강화 센터 — 준수 상태를 유지하십시오
      </Text>
    </View>
  );
}
