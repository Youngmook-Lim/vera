import { DARK } from '../../../core/theme';
import { fieldFor } from '../colour';
import { LINES } from '../lines';

describe('a card\'s field', () => {
  // A card you come back to must look as you remember it.
  it('is always the same one for the same card', () => {
    expect(fieldFor(41)).toBe(fieldFor(41));
  });

  it('runs through all six, so neighbours in the file never match', () => {
    const fields = DARK.affirmations.fields;
    for (let i = 0; i < 12; i++) expect(fieldFor(i)).toBe(fields[i % 6]);
    for (let i = 1; i < LINES.length; i++) expect(fieldFor(i)).not.toBe(fieldFor(i - 1));
  });
});
