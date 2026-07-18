import { dayLabel, shellStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(shellStrings.ko).sort()).toEqual(Object.keys(shellStrings.en).sort());
});

test('copy matches the prototype STR tables verbatim', () => {
  expect(shellStrings.en.center).toBe('ENRICHMENT CENTER');
  expect(shellStrings.en.complySub).toBe('daily · do not miss · infractions are permanent');
  expect(shellStrings.ko.center).toBe('역량 강화 센터');
  expect(shellStrings.ko.goodStanding).toBe('양호 상태');
});

test('dayLabel pads en, not ko', () => {
  expect(dayLabel(1, 'en')).toBe('DAY 01');
  expect(dayLabel(13, 'en')).toBe('DAY 13');
  expect(dayLabel(1, 'ko')).toBe('1일차');
});
