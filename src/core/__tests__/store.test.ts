import { STEPS, useFacilityStore } from '../store';

beforeEach(() => {
  useFacilityStore.setState({ step: 'facility', lang: 'en' });
});

test('boots to facility (phase 2 adds the enrollment gate)', () => {
  expect(useFacilityStore.getState().step).toBe('facility');
  expect(useFacilityStore.getState().lang).toBe('en');
});

test('setStep reaches every known step', () => {
  for (const step of STEPS) {
    useFacilityStore.getState().setStep(step);
    expect(useFacilityStore.getState().step).toBe(step);
  }
});

test('setLang switches language', () => {
  useFacilityStore.getState().setLang('ko');
  expect(useFacilityStore.getState().lang).toBe('ko');
});
