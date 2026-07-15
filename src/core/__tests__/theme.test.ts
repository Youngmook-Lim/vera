import { font, ms, palette, tagSchemes } from '../theme';

test('ms scales mock px by 1.1 at half-dp precision', () => {
  expect(ms(10)).toBe(11);
  expect(ms(9)).toBe(10);
  expect(ms(8.5)).toBe(9.5);
  expect(ms(13)).toBe(14.5);
});

test('font maps role/weight to loaded families, Korean to Pretendard', () => {
  expect(font('display', 700)).toBe('SpaceGrotesk_700Bold');
  expect(font('display', 500, 'en')).toBe('SpaceGrotesk_500Medium');
  expect(font('mono', 500)).toBe('IBMPlexMono_500Medium');
  expect(font('mono', 700)).toBe('IBMPlexMono_600SemiBold'); // Plex Mono capped at 600
  expect(font('display', 700, 'ko')).toBe('Pretendard-Bold');
  expect(font('mono', 600, 'ko')).toBe('Pretendard-SemiBold');
});

test('token spot checks match design/README.md', () => {
  expect(palette.dark.bg).toBe('#14130f');
  expect(palette.light.bg).toBe('#ecebe4');
  expect(palette.accent.amber).toBe('#f4b43a');
  expect(tagSchemes.green.text).toBe('#2c9a63');
});
