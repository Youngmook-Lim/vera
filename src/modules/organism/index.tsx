import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'SUPPORT ORGANISM', sub: 'specimen-03', tag: 'HUNGRY' },
  ko: { title: '지원 유기체', sub: '표본-03', tag: '공복' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 15 }}>🐼</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const organism: ModuleDef = {
  id: 'organism',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'orange' }),
  Screen,
};
