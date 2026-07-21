import { incineratorStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(incineratorStrings.ko).sort()).toEqual(Object.keys(incineratorStrings.en).sort());
});

test('copy is ported verbatim from the prototype', () => {
  expect(incineratorStrings.en.iGrievance).toBe('STATE YOUR GRIEVANCE');
  expect(incineratorStrings.en.iChamber).toBe('CHAMBER · 1,400°C');
  expect(incineratorStrings.en.iVeraDone).toBe(
    'Disposed. Irrecoverable. The grievance is gone; its subject, regrettably, remains.',
  );
  expect(incineratorStrings.ko.iAsh).toBe('재는 기록용으로 보관됩니다');
});

test('templated strings carry the {n} placeholder', () => {
  expect(incineratorStrings.en.iBurned).toContain('{n}');
  expect(incineratorStrings.en.iWords).toContain('{n}');
  expect(incineratorStrings.ko.iBurned).toContain('{n}');
  expect(incineratorStrings.ko.iWords).toContain('{n}');
});
