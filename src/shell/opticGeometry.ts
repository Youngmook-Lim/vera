import { EMOTIONS, type DartKey, type EmotionKey } from '../vera/emotions';

// Every number the eye is drawn from. It lives here, not in Optic.tsx, because
// Skia is mocked to no-ops in jest and anything inside the canvas is invisible
// to tests.
//
// The source is the 3a optic in `design/The Facility - Overhaul.dc.html` — the
// eye the spec says to wire into 4a, since 4a's own stage eye carries no lid.
export interface OpticGeometry {
  bezelRadius: number;
  socketRadius: number;
  socketDiameter: number;
  socketTop: number;
  socketBottom: number;
  glowRadius: number;
  irisRadius: number;
  pupilRadius: number;
  lidHeight: number;
  lowerLidHeight: number;
  lidClosedHeight: number;
  lowerLidClosedHeight: number;
  iris: string;
  glowAlpha: number;
  seamAlpha: number;
  seamBAlpha: number;
  blinkMs: number;
  blinkRestMs: number;
  blinkCloseMs: number;
  blinkHoldMs: number;
  blinkOpenMs: number;
  tracks: boolean;
  gazeLimit: number;
  gazeLimitPx: number;
  showCatchlight: boolean;
}

const BEZEL_INSET = 4; // the socket's `inset:4px`
const GLOW_SPREAD = 30; // the glow's `inset:-30px`
const GAZE_RANGE = 0.14;

// fshutT / fshutB, with one deliberate departure from the design. The
// keyframes bring the top lid down to 61% of the socket and the bottom up to
// 40%: they meet 11% below the middle and overlap by 1%. Both close to half
// the socket here instead, so the eye shuts on its own centre line — the same
// line the iris and pupil are drawn around — in every state. Neither ever
// covers the eye on its own. Don't restore the keyframe values.
const LID_CLOSED = 0.5;
const LOWER_LID_CLOSED = 0.5;

// The keyframe stops, as fractions of one cycle: open until 90.5%, shut by
// 94%, held to 95.4%, open again by 99.6%. Because they are percentages, a
// longer blink interval is also a slower closure — the fond squint's held
// blink falls out of the arithmetic rather than being a special case.
const BLINK_CLOSE = 0.94 - 0.905;
const BLINK_HOLD = 0.954 - 0.94;
const BLINK_OPEN = 0.996 - 0.954;

// `--seamb` is never set per emotion; the lower lid's markup defaults it.
const SEAM_B = 0.18;

// The four idle drifts, verbatim from 3a's @keyframes. Percentages are of the
// pupil's own box — the socket — and `steps` marks fdartQuick, which uses
// `steps(1,end)` so the eye snaps between fixations instead of gliding.
export interface DartStop {
  at: number; // fraction of the cycle
  x: number; // fraction of the socket
  y: number;
}

const pct = (at: number, x: number, y: number): DartStop => ({ at, x: x / 100, y: y / 100 });

export const DARTS: Record<DartKey, { steps: boolean; stops: readonly DartStop[] }> = {
  calm: {
    steps: false,
    stops: [pct(0, 0, 0), pct(0.22, 3, -2), pct(0.48, -2, 2), pct(0.74, 1, 3), pct(1, 0, 0)],
  },
  quick: {
    steps: true,
    stops: [
      pct(0, 6, -4), pct(0.08, 6, -4),
      pct(0.09, -5, -5), pct(0.3, -5, -5),
      pct(0.31, 4, 4), pct(0.55, 4, 4),
      pct(0.56, -6, 1), pct(0.8, -6, 1),
      pct(0.81, 2, -3), pct(1, 2, -3),
    ],
  },
  drift: {
    steps: false,
    stops: [pct(0, -8, 5), pct(0.5, 9, -4), pct(1, -8, 5)],
  },
  away: {
    steps: false,
    stops: [pct(0, -9, 7), pct(0.5, -6, 9), pct(1, -9, 7)],
  },
};

// The stops as (target, duration) legs the animation can just run through.
//
// The two families read their stops differently, on the same clock. A gliding
// drift travels toward the NEXT stop across the whole leg. A stepped one runs
// under `steps(1,end)`, which holds the stop the segment begins on and snaps
// only at its end — so its legs carry the fixation they are holding. Aimed at
// the next stop instead, fdartQuick's 1% legs turn into single-frame flickers
// of a position that should have been held for a third of a second.
export const dartLegs = (
  key: DartKey,
  cycleMs: number,
  socketDiameter: number,
): { x: number; y: number; ms: number }[] => {
  const { steps, stops } = DARTS[key];
  return stops.slice(1).map((stop, i) => {
    const held = steps ? stops[i] : stop;
    return {
      x: held.x * socketDiameter,
      y: held.y * socketDiameter,
      ms: (stop.at - stops[i].at) * cycleMs,
    };
  });
};

// `(fingerX − eyeCentreX) / (eyeWidth × 2.6)`, from 4a's onMove. The design
// clamps that raw fraction at ±0.14×track and uses it directly as a percentage
// translate; here the ×0.14×track lives in gazeLimitPx, so this returns the
// normalised −1..1 the optic multiplies by. Saturation lands in the same place
// either way.
const GAZE_DIVISOR = 2.6;

export const gazeFor = (
  tapX: number,
  tapY: number,
  centreX: number,
  centreY: number,
  size: number,
): { x: number; y: number } => {
  const span = size * GAZE_DIVISOR * GAZE_RANGE;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: clamp((tapX - centreX) / span), y: clamp((tapY - centreY) / span) };
};

export const opticGeometry = (emotion: EmotionKey, size: number): OpticGeometry => {
  const e = EMOTIONS[emotion];
  const bezelRadius = size / 2;
  const socketRadius = bezelRadius - BEZEL_INSET;
  const socketDiameter = socketRadius * 2;

  // Everything inside the eye is a percentage of the socket, not of the outer
  // box: the iris is `width:48%` of the `inset:4px` div, and the lids are a
  // percentage of that same div's height.
  const irisRadius = socketRadius * e.aperture;
  const gazeLimit = GAZE_RANGE * e.track;

  const blinkCloseMs = e.blinkMs * BLINK_CLOSE;
  const blinkHoldMs = e.blinkMs * BLINK_HOLD;
  const blinkOpenMs = e.blinkMs * BLINK_OPEN;

  return {
    bezelRadius,
    socketRadius,
    socketDiameter,
    // The lids sit at `top:0` / `bottom:0` of the socket, not of the outer box.
    socketTop: bezelRadius - socketRadius,
    socketBottom: bezelRadius + socketRadius,
    glowRadius: bezelRadius + GLOW_SPREAD,
    irisRadius,
    pupilRadius: irisRadius * e.pupil,
    lidHeight: socketDiameter * e.lid,
    lowerLidHeight: socketDiameter * e.lidB,
    lidClosedHeight: socketDiameter * LID_CLOSED,
    lowerLidClosedHeight: socketDiameter * LOWER_LID_CLOSED,
    iris: e.iris,
    glowAlpha: e.glow,
    // `--seam` is the iris-coloured hairline on the lid's leading edge. The
    // ring around the iris is drawn at full strength in the design and takes
    // no part in this.
    seamAlpha: e.seam,
    seamBAlpha: SEAM_B,
    blinkMs: e.blinkMs,
    // The remainder, so the four legs always sum to exactly one cycle.
    blinkRestMs: e.blinkMs - blinkCloseMs - blinkHoldMs - blinkOpenMs,
    blinkCloseMs,
    blinkHoldMs,
    blinkOpenMs,
    tracks: e.track > 0,
    gazeLimit,
    // The design translates the pupil group by a percentage of its own box —
    // the socket — so the clamp is in socket pixels, not bezel pixels.
    gazeLimitPx: gazeLimit * socketDiameter,
    showCatchlight: !e.dead,
  };
};
