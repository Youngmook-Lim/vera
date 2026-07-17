import * as Notifications from 'expo-notifications';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { font, ms, palette } from '../../core/theme';
import { getTransmission } from '../../vera';
import { AmberButton } from '../components/AmberButton';
import { EnrollHeader } from '../components/EnrollHeader';
import { OpticEye } from '../components/OpticEye';
import { Scanline } from '../components/Scanline';
import { VeraPanel } from '../components/VeraPanel';
import { enrollStrings } from './strings';

export function PermissionScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const permDenied = useFacilityStore((s) => s.permDenied);
  const { denyPermission, setNotif, finishEnroll } = useFacilityStore.getState();
  const insets = useSafeAreaInsets();
  const t = enrollStrings[lang];

  const onAllow = async () => {
    setNotif(true);
    try {
      // Real OS permission, best-effort. In Expo Go the prompt belongs to the
      // Expo Go app itself; a dev build makes it The Facility's own.
      await Notifications.requestPermissionsAsync();
    } catch {
      // never block enrollment on the OS
    }
    await finishEnroll();
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.bg, paddingTop: insets.top }}>
      <Scanline />
      <EnrollHeader mood="dark" right={t.permStep} lang={lang} />
      <View style={{ alignItems: 'center', paddingTop: 44, paddingHorizontal: 26, zIndex: 2 }}>
        <Text style={{ fontFamily: font('mono', 600, lang), fontSize: ms(9.5), letterSpacing: ms(9.5) * 0.24, color: '#8a8168' }}>
          {t.permKicker}
        </Text>
        <View style={{ marginTop: 26 }}>
          <OpticEye size={104} inner={false} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, marginTop: 30, zIndex: 2 }}>
        <View style={{ width: 14, height: 14, backgroundColor: palette.dark.bgAlt, transform: [{ rotate: '45deg' }], alignSelf: 'center', marginBottom: -7 }} />
        <VeraPanel line={getTransmission({ screen: 'permission', denied: permDenied, lang })} lang={lang} rec="REC 00:01:58" />
      </View>

      {!permDenied ? (
        // In-fiction OS dialog (system font on purpose — it should look native)
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            bottom: insets.bottom + 32,
            width: 314,
            backgroundColor: palette.light.card,
            borderRadius: 28,
            paddingTop: 26,
            paddingHorizontal: 22,
            paddingBottom: 10,
            elevation: 16,
            zIndex: 5,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 15, backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.accent.amber }} />
              <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent.amber }} />
            </View>
          </View>
          <Text style={{ marginTop: 16, textAlign: 'center', fontSize: ms(16), lineHeight: ms(16) * 1.35, color: '#1b1b1a' }}>
            {t.permDialogTitle}
          </Text>
          <View style={{ marginTop: 20 }}>
            <Pressable onPress={() => void onAllow()} style={{ alignItems: 'center', padding: 13, borderRadius: 12 }}>
              <Text style={{ fontSize: ms(14), fontWeight: '600', color: palette.accent.blue }}>{t.permAllow}</Text>
            </Pressable>
            <Pressable onPress={denyPermission} style={{ alignItems: 'center', padding: 13, borderRadius: 12 }}>
              <Text style={{ fontSize: ms(14), fontWeight: '600', color: palette.accent.blue }}>{t.permDeny}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 24, zIndex: 5 }}>
          <AmberButton label={t.permEnterAnyway} onPress={() => void finishEnroll()} lang={lang} />
        </View>
      )}
    </View>
  );
}
