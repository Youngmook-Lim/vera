import React, { useEffect } from 'react';
import {
  Blur,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  useClock,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

export const BLOB_SIZE = 220;

const CX = BLOB_SIZE / 2;
const CY = BLOB_SIZE / 2;
const BASE_R = 54;
const POINTS = 8;

// Specimen-03: a Skia morphing blob. The body is a closed path drawn as
// quadratic curves through the midpoints of POINTS radial points whose radii
// wobble with offset sines (continuously gooey). Hungrier = twitchier + dimmer;
// a tap (tapNonce bump) triggers a squish + brighten "bite". Skia renders only
// on the dev build — constants here are tuned on-device (see the plan's Task 5).
export function Blob({ hunger, tapNonce }: { hunger: number; tapNonce: number }) {
  const clock = useClock();
  // 0 = fully fed/calm, 1 = starving/twitchy.
  const mood = useDerivedValue(() => Math.max(0, Math.min(1, hunger / 100)), [hunger]);
  // Tap reaction: bump to 1 then ease back to 0 (drives squish + brighten).
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (tapNonce > 0) {
      pulse.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 320 }));
    }
  }, [tapNonce, pulse]);
  useEffect(() => () => {
    pulse.value = 0;
  }, [pulse]);

  const squish = useDerivedValue(() => 1 - 0.12 * pulse.value);

  const path = usePathValue((b) => {
    'worklet';
    const t = clock.value / 1000;
    const amp = 5 + 8 * mood.value; // hungrier wobbles more
    const speed = 1 + 1.2 * mood.value; // and faster
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < POINTS; i++) {
      const a = (i / POINTS) * Math.PI * 2;
      const r =
        BASE_R + amp * Math.sin(t * speed + i * 1.7) + amp * 0.5 * Math.sin(t * speed * 0.6 + i * 2.3);
      pts.push({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
    }
    const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
    });
    const m0 = mid(pts[POINTS - 1], pts[0]);
    b.moveTo(m0.x, m0.y);
    for (let i = 0; i < POINTS; i++) {
      const cur = pts[i];
      const next = pts[(i + 1) % POINTS];
      const m = mid(cur, next);
      b.quadTo(cur.x, cur.y, m.x, m.y);
    }
    b.close();
  });

  // Brighten on tap; fed is brighter than hungry at rest.
  const bright = useDerivedValue(() => 0.5 + 0.3 * (1 - mood.value) + 0.2 * pulse.value);
  const transform = useDerivedValue(() => [{ scaleY: squish.value }]);
  const glowOpacity = useDerivedValue(() => 0.35 + 0.25 * pulse.value);

  return (
    <Canvas style={{ width: BLOB_SIZE, height: BLOB_SIZE }}>
      {/* glow halo */}
      <Group opacity={glowOpacity}>
        <Circle cx={CX} cy={CY} r={BASE_R + 10} color="#4fd08a">
          <Blur blur={18} />
        </Circle>
      </Group>
      {/* morphing body */}
      <Group origin={vec(CX, CY)} transform={transform} opacity={bright}>
        <Path path={path}>
          <RadialGradient
            c={vec(CX - 16, CY - 20)}
            r={BASE_R + 24}
            colors={['#a9ecc4', '#4fd08a', '#2c8a5c']}
            positions={[0, 0.52, 0.92]}
          />
        </Path>
        {/* eyes */}
        <Circle cx={CX - 16} cy={CY - 6} r={5} color="#10231a" />
        <Circle cx={CX + 16} cy={CY - 6} r={5} color="#10231a" />
        {/* mouth */}
        <Circle cx={CX} cy={CY + 14} r={3} color="#10231a" />
      </Group>
    </Canvas>
  );
}
