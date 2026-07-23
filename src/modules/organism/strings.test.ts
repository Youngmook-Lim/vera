import { organismStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(organismStrings.ko).sort()).toEqual(Object.keys(organismStrings.en).sort());
});

test('copy ported verbatim from the prototype', () => {
  expect(organismStrings.en.statusHungry).toBe('● HUNGRY');
  expect(organismStrings.en.moodFed).toBe('MOOD · TEMPORARILY PACIFIED');
  expect(organismStrings.en.mut1).toBe('Developed a third eye. It is watching you specifically.');
  expect(organismStrings.en.veraHungry).toBe(
    'I requested a centrifuge. The budget purchased this instead. It is hungry. That is now your problem.',
  );
  expect(organismStrings.ko.day).toBe('보호 13일차');
});

test('tap-pivot lines are present (fed-vera reworded off "steps", new hints)', () => {
  expect(organismStrings.en.veraFed).toBe('It has accepted your offering. It did not thank you. Neither will I.');
  expect(organismStrings.en.tapHint).toBe('TAP TO FEED');
  expect(organismStrings.en.fedHint).toBe('SPECIMEN SATIATED · FOR NOW');
});
