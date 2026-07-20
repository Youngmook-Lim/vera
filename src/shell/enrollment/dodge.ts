export interface Dodge {
  tx: number;
  ty: number;
}

// The decline button rests flush-right in the bottom track (inset from the
// screen edge) and only ever dodges left/up, clamped, so the whole 100px
// button stays visible on any phone without measuring the layout. A rightward
// offset would clip the right edge, so it's pinned to 0 (rest); leftward travel
// and vertical are capped short of the screen edges.
export function clampDodge(spot: readonly [number, number]): Dodge {
  const tx = Math.min(Math.max(spot[0], -170), 0);
  const ty = Math.min(Math.max(spot[1], -40), 8);
  return { tx, ty };
}
