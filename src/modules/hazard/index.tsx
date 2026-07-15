import React from 'react';
import { View } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { palette } from '../../core/theme';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'HAZARD ASSESSMENT', sub: 'entity census', tag: '4 ⚠' },
  ko: { title: '위험 평가', sub: '개체 조사', tag: '4 ⚠' },
} as const;

// Mock: 13px red-bordered rounded square.
function Icon() {
  return <View style={{ width: 13, height: 13, borderWidth: 1.5, borderColor: palette.accent.red, borderRadius: 3 }} />;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const hazard: ModuleDef = {
  id: 'hazard',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'red' }),
  Screen,
};
