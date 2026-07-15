import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'THE INCINERATOR', sub: 'disposal services', tag: 'READY' },
  ko: { title: '소각로', sub: '폐기 처리', tag: '준비됨' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🔥</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const incinerator: ModuleDef = {
  id: 'incinerator',
  layout: 'wide',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'green' }),
  Screen,
};
