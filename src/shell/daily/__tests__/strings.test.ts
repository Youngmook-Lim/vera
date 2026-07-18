import { tmpl } from '../../../core/i18n';
import { dailyStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(dailyStrings.ko).sort()).toEqual(Object.keys(dailyStrings.en).sort());
});

test('copy matches the prototype verbatim, with {n} templates', () => {
  expect(dailyStrings.en.holdToComply).toBe('HOLD TO COMPLY');
  expect(dailyStrings.ko.directiveTitle).toBe('대체되지 않았음을 확인하십시오.');
  expect(tmpl(dailyStrings.en.streakText, { n: 12 })).toBe('DAY 12 · 12-DAY STREAK');
  expect(tmpl(dailyStrings.ko.streakForfeited, { n: 12 })).toBe('12일 연속 기록 몰수');
});
