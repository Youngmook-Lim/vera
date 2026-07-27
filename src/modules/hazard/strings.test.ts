import { hazardStrings } from './strings';

test('en and ko expose the same keys', () => {
  expect(Object.keys(hazardStrings.ko).sort()).toEqual(Object.keys(hazardStrings.en).sort());
});

test('en and ko census lists align (length + scheme per row)', () => {
  expect(hazardStrings.ko.entities).toHaveLength(hazardStrings.en.entities.length);
  hazardStrings.en.entities.forEach((e, i) => {
    expect(hazardStrings.ko.entities[i].scheme).toBe(e.scheme);
  });
});

test('copy ported verbatim from the prototype', () => {
  expect(hazardStrings.en.unauthorized).toBe('4 UNAUTHORIZED');
  expect(hazardStrings.en.entities[0].desc).toBe('Claims to be the refrigerator. Unverified.');
  expect(hazardStrings.en.entities[2].desc).toBe('Reading over your shoulder. Currently.');
  expect(hazardStrings.en.vera).toBe('Four entities. One is reading over your shoulder. Do not turn around — it complicates the paperwork.');
  expect(hazardStrings.ko.entities[3].tag).toBe('기지 개체');
});
