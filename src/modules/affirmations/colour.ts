import { DARK, type Field } from '../../core/theme';

// The field a card wears: its corpus index, round the six. Pure, and keyed by
// where the card LIVES rather than where the shuffle put it, so a card is the
// same colour every time you meet it. DARK is read only because the fields are
// the same object in both palettes.
export const fieldFor = (index: number): Field =>
  DARK.affirmations.fields[index % DARK.affirmations.fields.length];
