import React from 'react';
import { View } from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';

// TEMP: on-device proof that Skia renders in the dev build.
// Sub-project B (organism module) removes this as its first step.
export function SkiaProbe() {
  return (
    <View style={{ width: 64, height: 64, alignSelf: 'center', marginVertical: 20 }}>
      <Canvas style={{ flex: 1 }}>
        <Circle cx={32} cy={32} r={28} color="red" />
      </Canvas>
    </View>
  );
}
