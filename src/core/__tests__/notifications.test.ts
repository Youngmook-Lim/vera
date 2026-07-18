import { planTransmissions } from '../notifications';

test('plans 09:00/15:00/21:00 per day, future entries only', () => {
  const now = new Date('2026-07-18T12:00:00'); // today's 09:00 already past
  const plan = planTransmissions(now, 'en', 2); // today + tomorrow
  expect(plan).toHaveLength(5); // today: 15:00, 21:00 · tomorrow: all three
  expect(plan[0].date.getHours()).toBe(15);
  expect(plan.every((p) => p.date > now)).toBe(true);
  expect(plan[2].title).toBe('DAILY COMPLIANCE WINDOW: OPEN');
  expect(plan[2].body).toContain('The window closes at 23:59');
  expect(plan[4].title).toBe('FINAL COURTESY');
});

test('korean copy', () => {
  const now = new Date('2026-07-18T06:00:00');
  const plan = planTransmissions(now, 'ko', 1);
  expect(plan[0].title).toBe('일일 이행 창구: 열림');
  expect(plan[2].body).toContain('표본-03에게 통보되었습니다');
});
