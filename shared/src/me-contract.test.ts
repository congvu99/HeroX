import { describe, expect, it } from 'vitest';
import { HERO_NAME_MAX_LENGTH, isHeroGender, normalizeHeroName } from './me-contract.js';

describe('normalizeHeroName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeHeroName('  Hiệp   sĩ  ')).toBe('Hiệp sĩ');
  });

  it('normalizes decomposed Vietnamese text to NFC', () => {
    const decomposed = 'Hiệp';
    expect(normalizeHeroName(decomposed)).toBe('Hiệp');
  });

  it('counts characters, not UTF-16 units', () => {
    expect(normalizeHeroName('ệ'.repeat(HERO_NAME_MAX_LENGTH))).toBe('ệ'.repeat(HERO_NAME_MAX_LENGTH));
    expect(normalizeHeroName('a'.repeat(HERO_NAME_MAX_LENGTH + 1))).toBeNull();
  });

  it.each([[''], ['   '], ['bad\u0000name'], ['zero\u200bwidth'], ['Th\uFFFDnh'], [42], [null]])('rejects %j', (raw) => {
    expect(normalizeHeroName(raw)).toBeNull();
  });
});

describe('isHeroGender', () => {
  it('accepts only the known genders', () => {
    expect(isHeroGender('male')).toBe(true);
    expect(isHeroGender('female')).toBe(true);
    expect(isHeroGender('other')).toBe(false);
    expect(isHeroGender(undefined)).toBe(false);
  });
});
