import { STEPS, useFacilityStore } from '../store';
import { KEYS, storage } from '../storage';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
const { getLocales } = jest.requireMock('expo-localization');

beforeEach(async () => {
  await storage.remove(KEYS.enrolled);
  await storage.remove(KEYS.lang);
  await storage.remove(KEYS.notif);
  await storage.remove(KEYS.streak);
  await storage.remove(KEYS.standing);
  await storage.remove(KEYS.lastComply);
  await storage.remove(KEYS.enrolledAt);
  await storage.remove(KEYS.missedPending);
  await storage.remove(KEYS.forfeited);
  getLocales.mockReturnValue([{ languageCode: 'en' }]);
  useFacilityStore.setState({
    step: 'intake', lang: 'en', hydrated: false,
    adequacy: 64, motive: 1, decline: 0, poked: false, permDenied: false, notif: true,
    streak: 0, standing: 'good', lastComply: null, enrolledAt: null, missedPending: false, forfeited: 0,
  });
});

test('setStep reaches every known step', () => {
  for (const step of STEPS) {
    useFacilityStore.getState().setStep(step);
    expect(useFacilityStore.getState().step).toBe(step);
  }
});

test('hydrate boots fresh installs to intake, enrolled installs to facility', async () => {
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().step).toBe('intake');
  expect(useFacilityStore.getState().hydrated).toBe(true);

  await storage.set(KEYS.enrolled, '1');
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().step).toBe('facility');
});

test('hydrate defaults lang from device locale, stored lang wins', async () => {
  getLocales.mockReturnValue([{ languageCode: 'ko' }]);
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().lang).toBe('ko');

  await storage.set(KEYS.lang, 'en');
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().lang).toBe('en');
});

test('setLang persists', async () => {
  useFacilityStore.getState().setLang('ko');
  expect(useFacilityStore.getState().lang).toBe('ko');
  expect(await storage.get(KEYS.lang)).toBe('ko');
});

test('enrollment field actions', () => {
  const s = useFacilityStore.getState();
  s.setAdequacy(80);
  s.setMotive(2);
  s.nudgeDecline();
  s.nudgeDecline();
  s.poke();
  s.denyPermission();
  const after = useFacilityStore.getState();
  expect(after.adequacy).toBe(80);
  expect(after.motive).toBe(2);
  expect(after.decline).toBe(2);
  expect(after.poked).toBe(true);
  expect(after.permDenied).toBe(true);
  expect(after.notif).toBe(false);
});

test('finishEnroll persists the gate and enters the facility', async () => {
  useFacilityStore.getState().setNotif(true);
  await useFacilityStore.getState().finishEnroll();
  expect(useFacilityStore.getState().step).toBe('facility');
  expect(await storage.get(KEYS.enrolled)).toBe('1');
  expect(await storage.get(KEYS.notif)).toBe('1');
});

test('hydrate falls back to fresh-install defaults when storage reads fail', async () => {
  const spy = jest.spyOn(storage, 'get').mockRejectedValue(new Error('disk failure'));
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().hydrated).toBe(true);
  expect(useFacilityStore.getState().step).toBe('intake');
  spy.mockRestore();
});

const at = (s: string) => new Date(`${s}T12:00:00`);

test('completeComply starts a streak, then increments day over day', async () => {
  await useFacilityStore.getState().completeComply(at('2026-07-18'));
  expect(useFacilityStore.getState().streak).toBe(1);
  expect(await storage.get(KEYS.lastComply)).toBe('2026-07-18');

  await useFacilityStore.getState().completeComply(at('2026-07-19'));
  expect(useFacilityStore.getState().streak).toBe(2);
  expect(await storage.get(KEYS.streak)).toBe('2');
});

test('completeComply after a gap restarts at 1', async () => {
  useFacilityStore.setState({ streak: 12, lastComply: '2026-07-10' });
  await useFacilityStore.getState().completeComply(at('2026-07-18'));
  expect(useFacilityStore.getState().streak).toBe(1);
});

test('hydrate detects a missed day once: forfeits streak, standing under review', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.enrolledAt, '2026-07-01');
  await storage.set(KEYS.streak, '12');
  await storage.set(KEYS.lastComply, '2026-07-10');
  await useFacilityStore.getState().hydrate();
  const s = useFacilityStore.getState();
  expect(s.missedPending).toBe(true);
  expect(s.streak).toBe(0);
  expect(s.forfeited).toBe(12);
  expect(s.standing).toBe('review');
  expect(await storage.get(KEYS.streak)).toBe('0');
  expect(await storage.get(KEYS.missedPending)).toBe('1');
  expect(await storage.get(KEYS.forfeited)).toBe('12');

  // second hydrate must not double-forfeit
  await useFacilityStore.getState().hydrate();
  expect(useFacilityStore.getState().forfeited).toBe(12);
});

test('petitionReinstatement moves to probation and clears the pending flag', async () => {
  useFacilityStore.setState({ standing: 'review', missedPending: true });
  await useFacilityStore.getState().petitionReinstatement();
  expect(useFacilityStore.getState().standing).toBe('probation');
  expect(useFacilityStore.getState().missedPending).toBe(false);
  expect(await storage.get(KEYS.standing)).toBe('probation');
  expect(await storage.get(KEYS.missedPending)).toBeNull();
});

test('finishEnroll records the enrollment day', async () => {
  await useFacilityStore.getState().finishEnroll();
  expect(await storage.get(KEYS.enrolledAt)).toBeTruthy();
});

test('petition amnesties the miss: cold-restart hydrate does not re-forfeit', async () => {
  await storage.set(KEYS.enrolled, '1');
  await storage.set(KEYS.enrolledAt, '2026-07-01');
  await storage.set(KEYS.streak, '12');
  await storage.set(KEYS.lastComply, '2026-07-10');
  await useFacilityStore.getState().hydrate(); // detects the miss, forfeits
  expect(useFacilityStore.getState().missedPending).toBe(true);

  await useFacilityStore.getState().petitionReinstatement();
  await useFacilityStore.getState().hydrate(); // cold restart
  const s = useFacilityStore.getState();
  expect(s.standing).toBe('probation'); // must NOT regress to 'review'
  expect(s.missedPending).toBe(false);  // must NOT re-arm
  expect(s.forfeited).toBe(12);         // must NOT be overwritten
});
