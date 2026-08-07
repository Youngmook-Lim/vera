import { fluid } from '../fluid';
import { ms } from '../theme';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

describe('fluid', () => {
  it('gives eight words or fewer the loudest latin step', () => {
    expect(fluid(words(8), 'en').fontSize).toBe(ms(30));
  });

  it('steps down at each latin boundary', () => {
    expect(fluid(words(9), 'en').fontSize).toBe(ms(26));
    expect(fluid(words(14), 'en').fontSize).toBe(ms(26));
    expect(fluid(words(15), 'en').fontSize).toBe(ms(21));
    expect(fluid(words(22), 'en').fontSize).toBe(ms(21));
    expect(fluid(words(23), 'en').fontSize).toBe(ms(18));
    expect(fluid(words(32), 'en').fontSize).toBe(ms(18));
    expect(fluid(words(33), 'en').fontSize).toBe(ms(15));
  });

  it('runs korean on its own smaller ladder', () => {
    expect(fluid(words(8), 'ko').fontSize).toBe(ms(26));
    expect(fluid(words(33), 'ko').fontSize).toBe(ms(14));
  });

  it('returns line height as absolute px, not a multiplier', () => {
    const step = fluid(words(8), 'en');
    expect(step.lineHeight).toBeCloseTo(ms(30) * 1.32, 5);
  });

  it('treats empty and whitespace-only lines as the loudest step', () => {
    expect(fluid('', 'en').fontSize).toBe(ms(30));
    expect(fluid('   ', 'en').fontSize).toBe(ms(30));
  });

  it('collapses runs of whitespace when counting', () => {
    expect(fluid('one   two\n\nthree', 'en').fontSize).toBe(ms(30));
  });
});
