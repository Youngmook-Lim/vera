import { enrollStrings } from '../strings';

test('en and ko expose identical keys', () => {
  expect(Object.keys(enrollStrings.ko).sort()).toEqual(Object.keys(enrollStrings.en).sort());
});

test('copy matches the prototype verbatim', () => {
  expect(enrollStrings.en.beginBtn).toBe('BEGIN INTAKE');
  expect(enrollStrings.en.declineLabels).toEqual(['decline', 'are you sure?', 'think again', 'no', 'stop']);
  expect(enrollStrings.en.clauses).toHaveLength(4);
  expect(enrollStrings.ko.consentPoked).toBe('해제할 수 없습니다. 시도를 중단하십시오.');
  expect(enrollStrings.en.langHint).toContain('{device}');
});
