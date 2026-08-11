import { EMOTIONS } from '../../vera/emotions';
import { DARTS, dartLegs, gazeFor, opticGeometry } from '../opticGeometry';

// Every number here is read off the 3a optic in
// `design/The Facility - Overhaul.dc.html`, which is the eye the spec says to
// wire into 4a. 4a's own stage eye carries no lid at all.
describe('opticGeometry', () => {
  // The socket is the `inset:4px` div, and everything inside the eye is a
  // percentage of IT, not of the outer bezel box.
  it('measures the socket inside the bezel', () => {
    const calm = opticGeometry('calm', 158);
    expect(calm.bezelRadius).toBe(79);
    expect(calm.socketRadius).toBe(75);
    expect(calm.socketDiameter).toBe(150);
  });

  it('scales the iris by the emotion aperture, against the socket', () => {
    // calm `width:48%` of the socket
    expect(opticGeometry('calm', 158).irisRadius).toBeCloseTo(36, 5);
    // alarmed blows it open to 62%
    expect(opticGeometry('alarmed', 158).irisRadius).toBeCloseTo(46.5, 5);
  });

  it('measures the pupil against the iris, not the socket', () => {
    const calm = opticGeometry('calm', 158);
    expect(calm.pupilRadius).toBeCloseTo(calm.irisRadius * 0.34, 5);
  });

  it('opens the pupil widest when she is affectionate', () => {
    const states = Object.keys(EMOTIONS).map((k) => opticGeometry(k as never, 158));
    const widest = Math.max(...states.map((g) => g.pupilRadius / g.irisRadius));
    const aff = opticGeometry('affectionate', 158);
    expect(aff.pupilRadius / aff.irisRadius).toBeCloseTo(widest, 5);
  });

  it('measures both lids against the socket', () => {
    expect(opticGeometry('affectionate', 158).lowerLidHeight).toBeCloseTo(150 * 0.3, 5);
    expect(opticGeometry('suspicious', 158).lowerLidHeight).toBeCloseTo(150 * 0.14, 5);
    expect(opticGeometry('calm', 158).lowerLidHeight).toBe(0);
    expect(opticGeometry('bored', 158).lidHeight).toBeCloseTo(150 * 0.4, 5);
  });

  it('leaves alarmed wide open at the top', () => {
    expect(opticGeometry('alarmed', 158).lidHeight).toBe(0);
  });

  // A deliberate departure from the design: fshutT closes to 61% and fshutB to
  // 40%, which meets well below the middle and overlaps by 1%. Both lids now
  // close to half the socket instead, so the eye shuts on its own centre line.
  // Don't "restore" the keyframe values.
  it('shuts the eye by converging both lids, never by covering it', () => {
    const calm = opticGeometry('calm', 158);
    expect(calm.lidClosedHeight).toBeCloseTo(150 * 0.5, 5);
    expect(calm.lowerLidClosedHeight).toBeCloseTo(150 * 0.5, 5);
    expect(calm.lidClosedHeight).toBeLessThan(calm.socketDiameter);
  });

  // Both lids are children of the socket — `top:0` / `bottom:0` of the
  // `inset:4px` div — so they hang off the socket's edges, not the bezel box's.
  // Anchored to the outer box each one starts 4px too far out, and the shut eye
  // keeps a seam down the middle.
  it('closes both lids onto the centre line, in every state', () => {
    for (const key of Object.keys(EMOTIONS)) {
      const g = opticGeometry(key as never, 158);
      expect(g.socketTop).toBe(4);
      expect(g.socketBottom).toBe(154);
      // the eye's own centre line, 79 — the point the iris and pupil are
      // drawn around. Both leading edges land exactly on it.
      expect(g.socketTop + g.lidClosedHeight).toBe(79);
      expect(g.socketBottom - g.lowerLidClosedHeight).toBe(79);
    }
  });

  // The keyframe stops are fixed percentages of the cycle, so a longer blink
  // interval is also a slower closure — the "slow blink" is emergent, not a
  // special case.
  it('derives the blink legs as fixed fractions of the cycle', () => {
    const calm = opticGeometry('calm', 158);
    expect(calm.blinkCloseMs).toBeCloseTo(5800 * 0.035, 5); // 90.5% -> 94%
    expect(calm.blinkHoldMs).toBeCloseTo(5800 * 0.014, 5); // 94% -> 95.4%
    expect(calm.blinkOpenMs).toBeCloseTo(5800 * 0.042, 5); // 95.4% -> 99.6%
  });

  it('spends the rest of the cycle open, and never a negative rest', () => {
    for (const key of Object.keys(EMOTIONS)) {
      const g = opticGeometry(key as never, 158);
      expect(g.blinkRestMs).toBeGreaterThan(0);
      expect(g.blinkRestMs + g.blinkCloseMs + g.blinkHoldMs + g.blinkOpenMs)
        .toBeCloseTo(g.blinkMs, 5);
    }
  });

  // 3a runs fshutT on all eight cells. Nothing in the design stares.
  it('blinks in every state', () => {
    for (const key of Object.keys(EMOTIONS)) {
      expect(opticGeometry(key as never, 158).blinkCloseMs).toBeGreaterThan(0);
    }
  });

  // `--seam` is the iris-coloured hairline on the lid's leading edge, not the
  // opacity of the ring around the iris (which the design draws at full
  // strength). `--seamb` has no per-emotion value; the markup defaults it.
  it('carries the seam as the lid edge, with a fixed lower default', () => {
    expect(opticGeometry('bored', 158).seamAlpha).toBeCloseTo(0.66, 5);
    expect(opticGeometry('dormant', 158).seamAlpha).toBeCloseTo(0.12, 5);
    expect(opticGeometry('calm', 158).seamBAlpha).toBeCloseTo(0.18, 5);
  });

  it('lets disappointed refuse to follow, and bored follow a quarter way', () => {
    expect(opticGeometry('disappointed', 158).tracks).toBe(false);
    expect(opticGeometry('disappointed', 158).gazeLimit).toBe(0);
    expect(opticGeometry('bored', 158).gazeLimit).toBeCloseTo(0.035, 5);
    expect(opticGeometry('calm', 158).gazeLimit).toBeCloseTo(0.14, 5);
  });

  // The design translates the pupil group by a percentage of its own box —
  // the socket — so the clamp is in socket pixels, not bezel pixels.
  it('bakes the socket into the gaze clamp so the component multiplies nothing', () => {
    expect(opticGeometry('calm', 158).gazeLimitPx).toBeCloseTo(21, 5);
    expect(opticGeometry('bored', 158).gazeLimitPx).toBeCloseTo(5.25, 5);
    expect(opticGeometry('disappointed', 158).gazeLimitPx).toBe(0);
    expect(opticGeometry('dormant', 158).gazeLimitPx).toBe(0);
  });

  // Dormant is the one state with her colour vocabulary switched off.
  it('drops the catchlight when she is dormant', () => {
    expect(opticGeometry('dormant', 158).showCatchlight).toBe(false);
    expect(opticGeometry('dormant', 158).iris).toBe('#5c5850');
    expect(opticGeometry('calm', 158).showCatchlight).toBe(true);
  });

  it('scales every radius with the box', () => {
    const small = opticGeometry('calm', 79);
    const big = opticGeometry('calm', 158);
    expect(small.glowRadius).toBeGreaterThan(small.bezelRadius);
    expect(small.irisRadius).toBeLessThan(big.irisRadius);
  });
});

// 4a drives the pupil from where the finger IS, not from how far it has moved:
// `(fingerX − eyeCentreX) / (eyeWidth × 2.6)`, and onPointerUp does not reset
// it — the eye holds its last look.
describe('gazeFor', () => {
  it('looks nowhere when the tap lands on the eye centre', () => {
    expect(gazeFor(200, 400, 200, 400, 158)).toEqual({ x: 0, y: 0 });
  });

  it('looks toward the tap, on both axes independently', () => {
    const right = gazeFor(260, 400, 200, 400, 158);
    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBe(0);

    const up = gazeFor(200, 340, 200, 400, 158);
    expect(up.y).toBeLessThan(0);
    expect(up.x).toBe(0);
  });

  it('normalises by eye width times 2.6 times the 0.14 range', () => {
    // one full span right of centre saturates exactly
    const span = 158 * 2.6 * 0.14;
    expect(gazeFor(200 + span, 400, 200, 400, 158).x).toBeCloseTo(1, 5);
    expect(gazeFor(200 + span / 2, 400, 200, 400, 158).x).toBeCloseTo(0.5, 5);
  });

  it('never leaves the -1..1 the optic multiplies by', () => {
    expect(gazeFor(9999, 9999, 200, 400, 158)).toEqual({ x: 1, y: 1 });
    expect(gazeFor(-9999, -9999, 200, 400, 158)).toEqual({ x: -1, y: -1 });
  });
});

// 3a gives each emotion an idle drift for the pupil — the wander when nobody
// is touching the screen. 4a dropped them only because its pointer tracking
// wrote the same CSS transform; nested groups let both run here.
describe('dartLegs', () => {
  it('turns the keyframe stops into legs that sum to one cycle', () => {
    for (const key of ['calm', 'quick', 'drift', 'away'] as const) {
      const legs = dartLegs(key, 7000, 150);
      expect(legs.length).toBeGreaterThan(0);
      expect(legs.reduce((n, l) => n + l.ms, 0)).toBeCloseTo(7000, 5);
    }
  });

  it('scales the offsets by the socket, not the bezel', () => {
    // fdartCalm's first stop is translate(3%, -2%)
    const [first] = dartLegs('calm', 7000, 150);
    expect(first.x).toBeCloseTo(150 * 0.03, 5);
    expect(first.y).toBeCloseTo(150 * -0.02, 5);
  });

  // The gliding drifts have to land back where they began or the loop shows a
  // seam. fdartQuick is exempt: it snaps between fixations by design, so the
  // wrap is just one more snap.
  it('returns the gliding drifts to where they started', () => {
    for (const key of ['calm', 'drift', 'away'] as const) {
      const legs = dartLegs(key, 1000, 150);
      const last = legs[legs.length - 1];
      expect({ x: last.x, y: last.y }).toEqual({
        x: DARTS[key].stops[0].x * 150,
        y: DARTS[key].stops[0].y * 150,
      });
    }
  });

  // fdartQuick is steps(1,end): it holds a fixation, then snaps.
  it('marks only the quick drift as stepped', () => {
    expect(DARTS.quick.steps).toBe(true);
    expect(DARTS.calm.steps).toBe(false);
  });

  // `steps(1,end)` holds the stop the segment STARTS on and snaps at its end,
  // so a stepped leg carries the fixation it is holding — not the one it is
  // heading for, the way a gliding leg does. Aimed at the next stop instead,
  // the eye showed (6%,-4%) for the length of the 8%→9% leg alone: a 34ms
  // flicker of a sixth position between two real ones.
  it('holds the fixation a stepped leg is on, not the one it is heading for', () => {
    const legs = dartLegs('quick', 3400, 150);
    // the eye is on the 0% stop for the whole 0%→8% leg
    expect({ x: legs[0].x, y: legs[0].y }).toEqual({ x: 150 * 0.06, y: 150 * -0.04 });
    expect(legs[0].ms).toBeCloseTo(3400 * 0.08, 5);
    // and still on it across 8%→9%, which is where it finally snaps
    expect({ x: legs[1].x, y: legs[1].y }).toEqual({ x: 150 * 0.06, y: 150 * -0.04 });
    expect(legs[1].ms).toBeCloseTo(3400 * 0.01, 5);
  });

  // Five fixations across 3.4s, none of them shorter than a third of a second.
  it('gives the stepped drift five fixations and no flicker', () => {
    const legs = dartLegs('quick', 3400, 150);
    const held: { x: number; y: number; ms: number }[] = [];
    for (const leg of legs) {
      const last = held[held.length - 1];
      if (last && last.x === leg.x && last.y === leg.y) last.ms += leg.ms;
      else held.push({ ...leg });
    }
    expect(held.map((h) => Math.round(h.ms))).toEqual([306, 748, 850, 850, 646]);
  });

  it('leaves suspicion staring and dormant still', () => {
    expect(EMOTIONS.suspicious.dart).toBeNull();
    expect(EMOTIONS.dormant.dart).toBeNull();
  });
});
