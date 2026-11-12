import { describe, expect, it } from 'vitest';
import { TEST_WORDS } from '../../test/battle-fixtures.js';
import { buildRingOptions, RING_SIZE } from './ring-options.js';
import { SeededRandom } from './seeded-random.js';
import type { BattleWord } from './battle-types.js';

const byWord = (word: string): BattleWord => {
  const found = TEST_WORDS.find((entry) => entry.word === word);
  if (found === undefined) throw new Error(word);
  return found;
};

describe('buildRingOptions', () => {
  const loadout = ['w-castle', 'w-gate', 'w-strong', 'w-brave', 'w-over'];

  it('has 6 unique options: up to 4 loadout words, the answer and distractors', () => {
    const answer = byWord('strike');
    const options = buildRingOptions(answer, TEST_WORDS, loadout, new SeededRandom(1));
    expect(options).toHaveLength(RING_SIZE);
    expect(new Set(options).size).toBe(RING_SIZE);
    expect(options).toContain(answer.id);
    expect(options).toEqual(expect.arrayContaining(['w-castle', 'w-gate', 'w-strong', 'w-brave']));
    expect(options).not.toContain('w-over');
  });

  it('does not add the answer twice when it is already in the loadout', () => {
    const answer = byWord('gate');
    const options = buildRingOptions(answer, TEST_WORDS, loadout, new SeededRandom(2));
    expect(options.filter((id) => id === answer.id)).toHaveLength(1);
    expect(options).toHaveLength(RING_SIZE);
    expect(options).toContain('w-over');
  });

  it('picks distractors of the same part of speech first', () => {
    const answer = byWord('strike');
    const options = buildRingOptions(answer, TEST_WORDS, [], new SeededRandom(3));
    const verbs = options.filter((id) => TEST_WORDS.find((word) => word.id === id)?.pos === 'verb');
    // Bộ test có 4 động từ: cả 4 đều phải có mặt.
    expect(verbs).toHaveLength(4);
  });

  it('ignores loadout ids outside the battle pool and shrinks with a small pool', () => {
    const small = TEST_WORDS.slice(0, 3);
    const options = buildRingOptions(byWord('run'), small, ['w-castle'], new SeededRandom(4));
    expect([...options].sort()).toEqual(small.map((word) => word.id).sort());
  });
});
