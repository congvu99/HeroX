import { describe, expect, it } from 'vitest';
import { comboTierFor, raiseComboTier } from './combo-tier.js';

describe('comboTierFor', () => {
  it('chia 5 bậc: 1, 2–3, 4–5, 6–9, 10+', () => {
    const cases: [number, number][] = [
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 2],
      [4, 3],
      [5, 3],
      [6, 4],
      [9, 4],
      [10, 5],
      [25, 5],
    ];
    for (const [count, tier] of cases) expect(comboTierFor(count)).toBe(tier);
  });

  it('nâng bậc không vượt bậc 5', () => {
    expect(raiseComboTier(1, 1)).toBe(2);
    expect(raiseComboTier(5, 1)).toBe(5);
  });
});
