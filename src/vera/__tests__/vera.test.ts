import { getTransmission } from '..';

test('returns the authored facility line per language', () => {
  expect(getTransmission({ screen: 'facility', lang: 'en' })).toBe(
    'You made it. I never doubted you. That is a lie, but a supportive one.',
  );
  expect(getTransmission({ screen: 'facility', lang: 'ko' })).toBe(
    '해내셨군요. 저는 한 번도 의심하지 않았습니다. 거짓말입니다만, 응원이 담긴 거짓말입니다.',
  );
});
