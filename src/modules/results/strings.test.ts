import { resultsStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(resultsStrings.ko).sort()).toEqual(Object.keys(resultsStrings.en).sort());
});

test('copy is ported verbatim from the prototype', () => {
  expect(resultsStrings.en.rPosition).toBe('YOUR POSITION IN QUEUE');
  expect(resultsStrings.en.rWait).toBe('EST. WAIT · 4,331 YEARS');
  expect(resultsStrings.en.rVeraUp).toBe(
    'Your position worsened just now. Someone was prioritized. It was not you.',
  );
  expect(resultsStrings.ko.rSince).toBe('어제 이후');
});
