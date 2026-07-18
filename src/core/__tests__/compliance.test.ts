import { assessCompliance, dayKey, prevDayKey, tenureDays } from '../compliance';

const d = (s: string) => new Date(`${s}T12:00:00`);

test('dayKey and prevDayKey are local calendar days', () => {
  expect(dayKey(d('2026-07-18'))).toBe('2026-07-18');
  expect(prevDayKey(d('2026-07-18'))).toBe('2026-07-17');
  expect(prevDayKey(d('2026-03-01'))).toBe('2026-02-28');
});

test('assessCompliance: today done, yesterday/never due, older missed', () => {
  const now = d('2026-07-18');
  expect(assessCompliance('2026-07-18', now)).toBe('done');
  expect(assessCompliance('2026-07-17', now)).toBe('due');
  expect(assessCompliance(null, now)).toBe('due');
  expect(assessCompliance('2026-07-16', now)).toBe('missed');
  expect(assessCompliance('2026-01-01', now)).toBe('missed');
});

test('tenureDays is 1-based from enrollment day', () => {
  expect(tenureDays('2026-07-18', d('2026-07-18'))).toBe(1);
  expect(tenureDays('2026-07-06', d('2026-07-18'))).toBe(13);
  expect(tenureDays(null, d('2026-07-18'))).toBe(1);
});
