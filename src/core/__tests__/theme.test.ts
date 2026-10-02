import { DARK, font, ms, serif, serifItalic, voice } from '../theme';

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
  expect(serifItalic()).toBe('InstrumentSerif_400Regular_Italic');
  expect(serifItalic('en')).toBe('InstrumentSerif_400Regular_Italic');
  // Instrument Serif Italic has no hangul; Nanum Myeongjo has no true italic,
  // and its upright form is the right Korean answer rather than a fallback.
  expect(serifItalic('ko')).toBe('NanumMyeongjo_400Regular');
});

test('token spot checks match the design doc 4a markup', () => {
  expect(DARK.bg).toBe('#14130f');
  expect(DARK.text).toBe('#f2e7d3');
  expect(DARK.amber).toBe('#f4b43a');
  expect(DARK.danger).toBe('#ff4a3d');
  expect(DARK.organism.bg).toBe('#0c110e');
  expect(DARK.organism.hungry).toBe('#ff8a4a');
  expect(DARK.advice.bg).toBe('#0f0f11');
  expect(DARK.advice.ink).toBe('#e9e6df');
});

// One size per script, not a ladder. The ladder shrank a long reply to fit and
// fought the window that grew around her words in 3a, so it went; what is left
// is the pair of sizes the ladder bottomed out at, with latin raised one step
// because it read small inside the frame.
test('her voice is one size per script', () => {
  expect(voice('en').fontSize).toBe(ms(16));
  expect(voice('ko').fontSize).toBe(ms(14));
  expect(voice().fontSize).toBe(voice('en').fontSize);
});

// Nanum Myeongjo's hangul sits optically larger than Instrument Serif's latin
// at the same px, so Korean is set smaller and led looser to land the same
// weight on the page. Asserted as a RELATIONSHIP: the two numbers are taste and
// will move again, and it is the gap between them that carries the reason.
test('hangul is set smaller than latin, and led looser', () => {
  const en = voice('en');
  const ko = voice('ko');

  expect(ko.fontSize).toBeLessThan(en.fontSize);
  expect(1 - ko.fontSize / en.fontSize).toBeGreaterThan(0.1);
  expect(ko.lineHeight / ko.fontSize).toBeGreaterThan(en.lineHeight / en.fontSize);
});
