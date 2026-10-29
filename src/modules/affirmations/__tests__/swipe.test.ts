import { SWIPE_FRACTION, SWIPE_VELOCITY, claims, settle } from '../swipe';

const W = 400;

describe('claiming a drag', () => {
  it('takes a drag that is clearly sideways', () => {
    expect(claims(-30, 4)).toBe(true);
    expect(claims(30, -4)).toBe(true);
  });

  // Review Focus 2: scrolling a long line must not deal a card.
  it('leaves a mostly vertical drag to the scroller', () => {
    expect(claims(12, 40)).toBe(false);
  });

  it('ignores a twitch', () => {
    expect(claims(6, 0)).toBe(false);
  });
});

describe('settling a release', () => {
  it('moves on past a quarter of the screen', () => {
    expect(settle(-W * SWIPE_FRACTION, 0, W)).toBe('next');
    expect(settle(W * SWIPE_FRACTION, 0, W)).toBe('prev');
  });

  it('springs back from a short slow drag', () => {
    expect(settle(-40, -0.1, W)).toBe('stay');
  });

  it('moves on from a short drag that was flung', () => {
    expect(settle(-40, -SWIPE_VELOCITY, W)).toBe('next');
    expect(settle(40, SWIPE_VELOCITY, W)).toBe('prev');
  });

  // A drag left that ends on a twitch right was not a fling right.
  it('ignores a fling against the drag', () => {
    expect(settle(-40, SWIPE_VELOCITY * 2, W)).toBe('stay');
  });
});
