import { clampDodge } from '../dodge';

test('a rightward offset is pinned to the flush-right rest (never clips right)', () => {
  expect(clampDodge([92, 16])).toEqual({ tx: 0, ty: 8 });
  expect(clampDodge([74, -4])).toEqual({ tx: 0, ty: -4 });
});

test('a leftward dodge passes through within the safe cap', () => {
  expect(clampDodge([-64, 8])).toEqual({ tx: -64, ty: 8 });
  expect(clampDodge([-92, -10])).toEqual({ tx: -92, ty: -10 });
});

test('an oversized leftward dodge is capped short of the left edge', () => {
  expect(clampDodge([-500, 0]).tx).toBe(-170);
});

test('the resting offset is zero', () => {
  expect(clampDodge([0, 0])).toEqual({ tx: 0, ty: 0 });
});

test('vertical is clamped so the button clears the top content and bottom margin', () => {
  expect(clampDodge([0, 40]).ty).toBe(8);
  expect(clampDodge([0, -80]).ty).toBe(-40);
});
