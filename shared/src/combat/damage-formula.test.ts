import { describe, expect, it } from 'vitest';
import {
  computeCastDamage,
  computeEnemyHitDamage,
  computeShieldGain,
  maxShieldFor,
  type CastPower,
} from './damage-formula.js';
import { skillKindForPartOfSpeech } from './skill-kind.js';

const base: CastPower = { power: 100, accuracy: 'exact', mastered: false, skill: 'attack', tier: 1, comboMultiplier: 1 };

describe('computeCastDamage', () => {
  it.each<[string, Partial<CastPower>, number]>([
    ['typed exactly', {}, 100],
    ['typed with one typo (80%)', { accuracy: 'near' }, 80],
    ['picked on the ring (70%)', { accuracy: 'ring' }, 70],
    ['a mastered word (+25%)', { mastered: true }, 125],
    ['a utility skill (60%)', { skill: 'guard' }, 60],
    ['a same-POS combo (x1.3)', { comboMultiplier: 1.3 }, 130],
    ['a phrase chain (x1.6)', { comboMultiplier: 1.6 }, 160],
    ['everything stacked', { accuracy: 'ring', mastered: true, skill: 'evade', comboMultiplier: 1.6 }, 84],
    ['a tier-2 skill (+15%)', { tier: 2 }, 115],
    ['a tier-3 skill (+30%)', { tier: 3 }, 130],
  ])('deals the right damage for %s', (_case, overrides, expected) => {
    expect(computeCastDamage({ ...base, ...overrides })).toBe(expected);
  });

  it('never deals less than 1', () => {
    expect(computeCastDamage({ ...base, power: 0 })).toBe(1);
  });
});

describe('shield and enemy hits', () => {
  it('gives half the cast strength as shield, capped at half of max HP', () => {
    expect(computeShieldGain({ ...base, skill: 'guard' })).toBe(50);
    expect(computeShieldGain({ ...base, skill: 'guard', mastered: true, accuracy: 'ring' })).toBe(44);
    expect(maxShieldFor(101)).toBe(50);
  });

  it('halves a weakened enemy hit', () => {
    expect(computeEnemyHitDamage(12, false)).toBe(12);
    expect(computeEnemyHitDamage(13, true)).toBe(7);
  });
});

describe('skillKindForPartOfSpeech', () => {
  it.each([
    ['verb', 'attack'],
    ['noun', 'guard'],
    ['adj', 'empower'],
    ['adv', 'evade'],
    ['prep', 'evade'],
    ['other', 'attack'],
  ] as const)('maps %s to %s', (pos, kind) => {
    expect(skillKindForPartOfSpeech(pos)).toBe(kind);
  });
});
