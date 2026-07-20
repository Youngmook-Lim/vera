import React from 'react';
import { View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'FIELD TRIAL', sub: 'proceed as directed', tag: 'ACTIVE' },
  ko: { title: '현장 시험', sub: '지시대로 이동', tag: '활성' },
} as const;

// Mock: 13px amber-ringed compass with a 2×6 tick at 12 o'clock.
function Icon() {
  return (
    <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: palette.accent.amber }}>
      <View style={{ position: 'absolute', left: 4, top: -5, width: 2, height: 6, backgroundColor: palette.accent.amber }} />
    </View>
  );
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const field: ModuleDef = {
  id: 'field',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'amber' }),
  Screen,
};
