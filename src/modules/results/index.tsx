import React from 'react';
import { Text } from 'react-native';
import { useFacilityStore } from '../../core/store';
import { PlaceholderScreen } from '../../shell/PlaceholderScreen';
import type { ModuleDef } from '../types';

const strings = {
  en: { title: 'RESULTS PENDING', sub: '#8,442,105', tag: 'QUEUED' },
  ko: { title: '결과 대기', sub: '#8,442,105', tag: '대기열' },
} as const;

function Icon() {
  return <Text style={{ fontSize: 14, color: '#b9b09a' }}>⌛</Text>;
}

function Screen() {
  const lang = useFacilityStore((s) => s.lang);
  return <PlaceholderScreen title={strings[lang].title} />;
}

export const results: ModuleDef = {
  id: 'results',
  layout: 'square',
  Icon,
  tile: (lang) => ({ ...strings[lang], tagScheme: 'blue' }),
  Screen,
};
