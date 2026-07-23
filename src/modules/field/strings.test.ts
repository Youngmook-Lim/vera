import { fieldStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(fieldStrings.ko).sort()).toEqual(Object.keys(fieldStrings.en).sort());
});

test('copy ported verbatim from the prototype', () => {
  expect(fieldStrings.en.task).toBe('Proceed to the place where pigeons hold court.');
  expect(fieldStrings.en.signalIdle).toBe('SIGNAL STRENGTH · HOLDING');
  expect(fieldStrings.en.veraArrived).toBe('You have arrived. Observe the court. Do not address the bench.');
  expect(fieldStrings.en.walkDone).toBe('TRIAL COMPLETE · RETURN TO FACILITY');
  expect(fieldStrings.ko.arrivedBig).toBe('목표 도달');
});
