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
  getLocales.mockReturnValue([{ languageCode: 'en' }]);
  useFacilityStore.setState({
    step: 'intake', lang: 'en', hydrated: false,
    adequacy: 64, motive: 1, decline: 0, poked: false, permDenied: false, notif: true,
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
