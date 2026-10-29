// Every decision a card's swipe makes, pure and out of the gesture, because
// a worklet and a PanResponder are both unreachable from jest (the stage's
// dock button taught that a mutation inside one survives the whole suite).
//
// Shared since 2026-10-29: the affirmations poster swipes both ways, and the
// advice and horror cards swipe right to go back. One set of thresholds, so
// the three rooms cannot come to disagree about what a swipe is.

export type Swipe = 'next' | 'prev' | 'stay';

// Past this share of the screen a release moves on however slowly it ended.
export const SWIPE_FRACTION = 0.25;
// Or a release this fast, in PanResponder's own unit (px per ms), in the
// direction of the drag.
export const SWIPE_VELOCITY = 0.5;
// Below this a drag is a touch that wobbled, not a swipe.
const CLAIM_PX = 10;

// Whether the poster takes the drag from whatever is under it — the
// ScrollView a long line sits in. Only clearly sideways drags.
export const claims = (dx: number, dy: number): boolean =>
  Math.abs(dx) > CLAIM_PX && Math.abs(dx) > Math.abs(dy);

export const settle = (dx: number, vx: number, width: number): Swipe => {
  if (dx === 0) return 'stay';
  const far = Math.abs(dx) >= width * SWIPE_FRACTION;
  const flung = Math.sign(vx) === Math.sign(dx) && Math.abs(vx) >= SWIPE_VELOCITY;
  if (!far && !flung) return 'stay';
  // Left is forward: the next card comes in from the right.
  return dx < 0 ? 'next' : 'prev';
};
