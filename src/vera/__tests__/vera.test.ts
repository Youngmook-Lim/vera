import { getTransmission } from '..';

test('returns the authored facility line per language', () => {
  expect(getTransmission({ screen: 'facility', lang: 'en' })).toBe(
    'You made it. I never doubted you. That is a lie, but a supportive one.',
  );
  expect(getTransmission({ screen: 'facility', lang: 'ko' })).toBe(
    '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  );
});

test('enrollment lines', () => {
  expect(getTransmission({ screen: 'intake', lang: 'en' })).toContain('Enrollment is not optional');
  expect(getTransmission({ screen: 'baseline', lang: 'ko' })).toContain('결함으로 기록');
  expect(getTransmission({ screen: 'assigned', lang: 'en' })).toContain('Subject #50640');
  expect(getTransmission({ screen: 'permission', denied: false, lang: 'en' })).toContain('Kindly permit it');
  expect(getTransmission({ screen: 'permission', denied: true, lang: 'en' })).toContain('That prompt was a courtesy');
});
