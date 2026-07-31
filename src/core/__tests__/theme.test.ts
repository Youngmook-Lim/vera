import { font, ms, palette, serif, serifItalic } from '../theme';

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

test('serif is her voice only, and switches script with the language', () => {
  expect(serif()).toBe('InstrumentSerif_400Regular');
  expect(serif('en')).toBe('InstrumentSerif_400Regular');
  expect(serif('ko')).toBe('NanumMyeongjo_400Regular');
  expect(serifItalic).toBe('InstrumentSerif_400Regular_Italic');
});

test('token spot checks match the design doc 4a markup', () => {
  expect(palette.bg).toBe('#14130f');
  expect(palette.text).toBe('#f2e7d3');
  expect(palette.amber).toBe('#f4b43a');
  expect(palette.danger).toBe('#ff4a3d');
  expect(palette.organism.bg).toBe('#0c110e');
  expect(palette.organism.hungry).toBe('#ff8a4a');
  expect(palette.identity.paper).toBe('#efe7d7');
  expect(palette.identity.ink).toBe('#1c1a15');
});
