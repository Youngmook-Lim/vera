import { tmpl } from '../i18n';

test('tmpl substitutes named vars and leaves unknown ones visible', () => {
  expect(tmpl('Detected: {device}.', { device: 'English' })).toBe('Detected: English.');
  expect(tmpl('You walked {pct}% less.', { pct: 12 })).toBe('You walked 12% less.');
  expect(tmpl('{missing}', {})).toBe('{missing}');
});
