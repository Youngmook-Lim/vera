import { EMOTIONS, type EmotionKey } from '../vera/emotions';

// Every number the eye is drawn from. It lives here, not in Optic.tsx, because
// Skia is mocked to no-ops in jest and anything inside the canvas is invisible
// to tests.
export interface OpticGeometry {
  bezelRadius: number;
  socketRadius: number;
  glowRadius: number;
  irisRadius: number;
  pupilRadius: number;
  lidHeight: number;
  lowerLidHeight: number;
  iris: string;
  glowAlpha: number;
  seamAlpha: number;
  blinkMs: number;
  blinkCloseMs: number;
  blinkHalfMs: number;
  blinkHoldMs: number;
  blinks: boolean;
  tracks: boolean;
  gazeLimit: number;
  gazeLimitPx: number;
  showCatchlight: boolean;
}

const BEZEL_INSET = 4;
const GLOW_SPREAD = 30;
const BLINK_CLOSE_MS = 90;
const SLOW_BLINK_CLOSE_MS = 420;
const STARE_MS = 9000; // at or above this she does not blink, she stares
const GAZE_RANGE = 0.14;

export const opticGeometry = (emotion: EmotionKey, size: number): OpticGeometry => {
  const e = EMOTIONS[emotion];
  const bezelRadius = size / 2;
  const irisRadius = (size * e.aperture) / 2;
  const blinkCloseMs = e.slowBlink ? SLOW_BLINK_CLOSE_MS : BLINK_CLOSE_MS;
  const gazeLimit = GAZE_RANGE * e.track;
  return {
    bezelRadius,
    socketRadius: bezelRadius - BEZEL_INSET,
    glowRadius: bezelRadius + GLOW_SPREAD,
    irisRadius,
    pupilRadius: irisRadius * e.pupil,
    lidHeight: size * e.lid,
    lowerLidHeight: size * e.lidB,
    iris: e.iris,
    glowAlpha: e.glow,
    seamAlpha: e.seam,
    blinkMs: e.blinkMs,
    blinkCloseMs,
    // Half the closure drives the down/up legs of the blink sequence; the
    // hold is the open interval between blinks. Both are Skia-timing
    // arithmetic derived from emotion fields, so they belong here — not in
    // Optic.tsx, where they'd be untestable under the Skia mock.
    blinkHalfMs: blinkCloseMs / 2,
    blinkHoldMs: Math.max(0, e.blinkMs - blinkCloseMs),
    blinks: e.blinkMs < STARE_MS,
    tracks: e.track > 0,
    gazeLimit,
    gazeLimitPx: gazeLimit * size,
    showCatchlight: !e.dead,
  };
};
