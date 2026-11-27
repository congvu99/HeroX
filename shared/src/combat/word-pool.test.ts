import { describe, expect, it } from 'vitest';
import { battleWord, TEST_CHAIN, TEST_WORDS } from '../../test/battle-fixtures.js';
import type { BattleWord } from './battle-types.js';
import { EMPTY_COMBO, extendCombo } from './combo-chain.js';
import { SeededRandom } from './seeded-random.js';
import {
  availableChains,
  FRESH_POOL_SHARE_PERCENT,
  pickPromptWord,
  RECENT_PROMPT_MEMORY,
  recentPromptMemory,
  selectBattleWords,
  WORD_MIX_QUOTAS,
  type PromptContext,
} from './word-pool.js';
import { WORD_TIERS, type WordTier } from './word-tier.js';

const context = (overrides: Partial<PromptContext> = {}): PromptContext => ({
  words: TEST_WORDS,
  recentWordIds: [],
  retryWordIds: [],
  combo: EMPTY_COMBO,
  chains: [],
  ...overrides,
});

function emptyBuckets(): Record<WordTier, BattleWord[]> {
  const buckets = {} as Record<WordTier, BattleWord[]>;
  for (const tier of WORD_TIERS) buckets[tier] = [];
  return buckets;
}

/** Bộ nhóm với `count` từ mỗi nhóm, id có tiền tố nhóm để nhận ra nguồn. */
function bucketsOf(count: Record<WordTier, number>): Record<WordTier, BattleWord[]> {
  const buckets = emptyBuckets();
  for (const tier of WORD_TIERS) {
    buckets[tier] = Array.from({ length: count[tier] ?? 0 }, (_, index) => battleWord(`${tier}${index}`, 'noun'));
  }
  return buckets;
}

function tierCounts(words: readonly BattleWord[]): Record<WordTier, number> {
  const counts = {} as Record<WordTier, number>;
  for (const tier of WORD_TIERS) counts[tier] = words.filter((word) => word.id.startsWith(`w-${tier}`)).length;
  return counts;
}

describe('availableChains', () => {
  it('keeps only chains whose words are all in the pool', () => {
    const partial = { id: 'go-out', words: ['go', 'out'] };
    expect(availableChains(TEST_WORDS, [TEST_CHAIN, partial])).toEqual([TEST_CHAIN]);
  });
});

describe('selectBattleWords', () => {
  // Thừa từ mọi nhóm để hạn ngạch luôn lấy đủ.
  const plentiful = bucketsOf({ new: 30, due: 30, hard: 30, familiar: 30, mastered: 30 });

  it('returns at most the limit, without duplicates', () => {
    const selected = selectBattleWords(plentiful, 'field', [], 40);
    expect(selected).toHaveLength(40);
    expect(new Set(selected.map((word) => word.id)).size).toBe(40);
  });

  it('matches the field quota within ±1 when every tier has enough words', () => {
    const selected = selectBattleWords(plentiful, 'field', [], 40);
    const counts = tierCounts(selected);
    for (const tier of WORD_TIERS) {
      const expected = Math.round((40 * WORD_MIX_QUOTAS.field[tier]) / 100);
      expect(Math.abs(counts[tier] - expected)).toBeLessThanOrEqual(1);
    }
  });

  it('weights the boss quota toward hard words', () => {
    const selected = selectBattleWords(plentiful, 'boss', [], 40);
    const counts = tierCounts(selected);
    expect(counts.hard).toBeGreaterThan(counts.new);
    expect(counts.hard).toBeGreaterThan(counts.mastered);
  });

  it('puts loadout words first even when outside the quota', () => {
    const selected = selectBattleWords(plentiful, 'field', ['w-mastered0', 'w-unknown', 'w-mastered1'], 40);
    expect(selected.slice(0, 2).map((word) => word.id)).toEqual(['w-mastered0', 'w-mastered1']);
  });

  it('spills unfilled slots to other tiers, keeping the pool full', () => {
    // Chỉ có từ nhóm "new"; mọi slot của nhóm khác dồn hết sang new.
    const onlyNew = bucketsOf({ new: 40, due: 0, hard: 0, familiar: 0, mastered: 0 });
    const selected = selectBattleWords(onlyNew, 'field', [], 40);
    expect(selected).toHaveLength(40);
    expect(selected.every((word) => word.id.startsWith('w-new'))).toBe(true);
  });

  it('puts freshly studied words in first, capped so review tiers keep their share', () => {
    // 30 từ vừa học nằm ở nhóm "quen" (hạn ngạch chỉ 15%); được chiếm đúng tối đa nửa bộ, không hơn.
    const buckets = bucketsOf({ new: 30, due: 30, hard: 30, familiar: 0, mastered: 30 });
    buckets.familiar = Array.from({ length: 30 }, (_, index) => battleWord(`fresh${index}`, 'noun', { fresh: true }));
    const selected = selectBattleWords(buckets, 'field', [], 40);
    const fromFreshPass = (40 * FRESH_POOL_SHARE_PERCENT) / 100;
    // Nửa bộ từ vòng ưu tiên, cộng phần hạn ngạch "quen" của nửa còn lại (15% của 20 = 3).
    expect(selected.filter((word) => word.fresh === true)).toHaveLength(fromFreshPass + 3);
    expect(selected.slice(0, fromFreshPass).every((word) => word.fresh === true)).toBe(true);
    expect(selected).toHaveLength(40);
  });

  it('returns everything when there are fewer words than the limit', () => {
    const few = bucketsOf({ new: 3, due: 2, hard: 2, familiar: 1, mastered: 1 });
    expect(selectBattleWords(few, 'field', [], 40)).toHaveLength(9);
  });
});

describe('recentPromptMemory', () => {
  it('scales with the battle pool and never drops below the minimum', () => {
    expect(recentPromptMemory(0)).toBe(RECENT_PROMPT_MEMORY);
    expect(recentPromptMemory(4)).toBe(RECENT_PROMPT_MEMORY);
    expect(recentPromptMemory(20)).toBe(12);
    expect(recentPromptMemory(40)).toBe(24);
  });

  it('keeps every word of a 20-word pool from returning within 12 prompts', () => {
    const pool = Array.from({ length: 20 }, (_, index) => battleWord(`word${index}`, 'noun', { weak: index < 4, fresh: index === 5 }));
    const memory = recentPromptMemory(pool.length);
    const rng = new SeededRandom(7);
    const recent: string[] = [];
    for (let round = 0; round < 300; round += 1) {
      const word = pickPromptWord(context({ words: pool, recentWordIds: recent }), rng);
      expect(recent).not.toContain(word.id);
      recent.push(word.id);
      if (recent.length > memory) recent.shift();
    }
  });
});

describe('pickPromptWord', () => {
  it('never repeats one of the last prompts', () => {
    const rng = new SeededRandom(11);
    const recent: string[] = [];
    for (let round = 0; round < 200; round += 1) {
      const word = pickPromptWord(context({ recentWordIds: recent }), rng);
      expect(recent).not.toContain(word.id);
      recent.push(word.id);
      if (recent.length > RECENT_PROMPT_MEMORY) recent.shift();
    }
  });

  it('only avoids the very last prompt when the pool is tiny', () => {
    const tiny = TEST_WORDS.slice(0, 2);
    const word = pickPromptWord(context({ words: tiny, recentWordIds: tiny.map((entry) => entry.id) }), new SeededRandom(1));
    expect(word.id).toBe(tiny[0]?.id);
    const single = TEST_WORDS.slice(0, 1);
    expect(pickPromptWord(context({ words: single, recentWordIds: [single[0]?.id ?? ''] }), new SeededRandom(1))).toBe(single[0]);
  });

  it('fails loudly on an empty pool', () => {
    expect(() => pickPromptWord(context({ words: [] }), new SeededRandom(1))).toThrow();
  });

  it('continues a started chain', () => {
    const combo = extendCombo(EMPTY_COMBO, { word: 'run', pos: 'verb' }, 0, [TEST_CHAIN]).combo;
    for (let seed = 0; seed < 20; seed += 1) {
      expect(pickPromptWord(context({ combo, chains: [TEST_CHAIN] }), new SeededRandom(seed)).word).toBe('away');
    }
  });

  it('shows weak and retried words more often', () => {
    const words = [battleWord('alpha', 'noun', { weak: true }), battleWord('beta', 'noun'), battleWord('gamma', 'noun')];
    const counts = new Map<string, number>();
    const rng = new SeededRandom(21);
    for (let round = 0; round < 3_000; round += 1) {
      const word = pickPromptWord(context({ words, retryWordIds: ['w-gamma'] }), rng);
      counts.set(word.word, (counts.get(word.word) ?? 0) + 1);
    }
    // Trọng số 3 : 1 : 3 → beta khoảng 1/7 số lần.
    expect(counts.get('beta') ?? 0).toBeLessThan(600);
    expect(counts.get('alpha') ?? 0).toBeGreaterThan(1_100);
    expect(counts.get('gamma') ?? 0).toBeGreaterThan(1_100);
  });

  it('shows freshly studied and long-unseen words more often', () => {
    const words = [battleWord('alpha', 'noun', { fresh: true }), battleWord('beta', 'noun'), battleWord('gamma', 'noun', { stale: true })];
    const counts = new Map<string, number>();
    const rng = new SeededRandom(5);
    for (let round = 0; round < 3_000; round += 1) {
      const word = pickPromptWord(context({ words }), rng);
      counts.set(word.word, (counts.get(word.word) ?? 0) + 1);
    }
    // Trọng số 3 : 1 : 2 → alpha ≈ 1500, beta ≈ 500, gamma ≈ 1000.
    expect(counts.get('alpha') ?? 0).toBeGreaterThan(1_300);
    expect(counts.get('beta') ?? 0).toBeLessThan(650);
    expect(counts.get('gamma') ?? 0).toBeGreaterThan(850);
    expect(counts.get('gamma') ?? 0).toBeLessThan(counts.get('alpha') ?? 0);
  });

  it('sometimes starts a chain or follows the last part of speech', () => {
    const rng = new SeededRandom(8);
    const combo = extendCombo(EMPTY_COMBO, { word: 'castle', pos: 'noun' }, 0, []).combo;
    let chainHeads = 0;
    let nouns = 0;
    for (let round = 0; round < 1_000; round += 1) {
      const word = pickPromptWord(context({ combo, chains: [TEST_CHAIN] }), rng);
      if (word.word === 'run') chainHeads += 1;
      if (word.pos === 'noun') nouns += 1;
    }
    // Không ưu tiên thì "run" chỉ ~1/12 và danh từ ~2/12.
    expect(chainHeads).toBeGreaterThan(200);
    expect(nouns).toBeGreaterThan(300);
  });
});
