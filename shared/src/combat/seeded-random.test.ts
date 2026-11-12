import { describe, expect, it } from 'vitest';
import { SeededRandom } from './seeded-random.js';

function sequence(seed: number, length: number): number[] {
  const rng = new SeededRandom(seed);
  return Array.from({ length }, () => rng.next());
}

describe('SeededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20));
    expect(sequence(42, 5)).not.toEqual(sequence(43, 5));
  });

  it('continues from a saved state', () => {
    const rng = new SeededRandom(7);
    rng.next();
    const resumed = new SeededRandom(rng.state);
    expect(resumed.next()).toBe(rng.next());
  });

  it('stays within [0, 1) and covers the range', () => {
    const values = sequence(1, 2_000);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(Math.min(...values)).toBeLessThan(0.05);
    expect(Math.max(...values)).toBeGreaterThan(0.95);
  });

  it('picks, shuffles and rolls chances deterministically', () => {
    const rng = new SeededRandom(99);
    expect(rng.pick([])).toBeUndefined();
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = rng.shuffle(items);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    expect(rng.nextInt(1)).toBe(0);
  });

  it('accepts seeds outside uint32 by wrapping them', () => {
    expect(new SeededRandom(-1).state).toBe(0xffffffff);
  });
});
