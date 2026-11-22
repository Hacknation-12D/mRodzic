import { describe, expect, it } from 'vitest';

import { isValidPesel, peselBirthDate, peselMatches, peselSex } from './pesel';

describe('PESEL', () => {
  it('sprawdza sumę kontrolną', () => {
    expect(isValidPesel('44051401458')).toBe(true);
    expect(isValidPesel('44051401459')).toBe(false);
    expect(isValidPesel('4405140145')).toBe(false);
  });

  it('odczytuje datę urodzenia (także po 2000 r.) i płeć', () => {
    expect(peselBirthDate('44051401458')).toBe('1944-05-14');
    expect(peselBirthDate('03253010620')).toBe('2003-05-30');
    expect(peselSex('44051401458')).toBe('male');
    expect(peselSex('03253010620')).toBe('female');
  });

  it('wymaga zgodności z datą urodzenia i płcią', () => {
    expect(peselMatches('03253010620', '2003-05-30', 'female')).toBe(true);
    expect(peselMatches('03253010620', '2003-05-31', 'female')).toBe(false);
    expect(peselMatches('03253010620', '2003-05-30', 'male')).toBe(false);
  });
});
