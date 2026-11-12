import { describe, expect, it } from 'vitest';
import { battleWord, TEST_CHAIN, TEST_WORDS } from '../../test/battle-fixtures.js';
import { EMPTY_COMBO, extendCombo } from './combo-chain.js';
import { SeededRandom } from './seeded-random.js';
import { availableChains, pickPromptWord, RECENT_PROMPT_MEMORY, selectBattleWords, type PromptContext } from './word-pool.js';

const context = (overrides: Partial<PromptContext> = {}): PromptContext => ({
  words: TEST_WORDS,
  recentWordIds: [],
  retryWordIds: [],
  combo: EMPTY_COMBO,
  chains: [],
  ...overrides,
});

describe('availableChains', () => {
  it('keeps only chains whose words are all in the pool', () => {
    const partial = { id: 'go-out', words: ['go', 'out'] };
    expect(availableChains(TEST_WORDS, [TEST_CHAIN, partial])).toEqual([TEST_CHAIN]);
  });
});

describe('selectBattleWords', () => {
  const many = Array.from({ length: 100 }, (_, index) => battleWord(`word${index}`, 'noun', { weak: index >= 90 }));

  it('returns at most the limit, without duplicates', () => {
    const selected = selectBattleWords(many, [], [], new SeededRandom(1), 40);
    expect(selected).toHaveLength(40);
    expect(new Set(selected.map((word) => word.id)).size).toBe(40);
  });

  it('puts loadout words first, then weak words', () => {
    const selected = selectBattleWords(many, ['w-word5', 'w-unknown', 'w-word7'], [], new SeededRandom(1), 20);
    expect(selected.slice(0, 2).map((word) => word.id)).toEqual(['w-word5', 'w-word7']);
    expect(selected.slice(2, 12).every((word) => word.weak)).toBe(true);
  });

  it('includes every word of a learned chain so combos are reachable', () => {
    const candidates = [...many, ...TEST_WORDS];
    const selected = selectBattleWords(candidates, [], [TEST_CHAIN], new SeededRandom(3), 15);
    const words = selected.map((word) => word.word);
    expect(words).toEqual(expect.arrayContaining(['run', 'away', 'quickly']));
  });

  it('skips a chain that no longer fits', () => {
    const selected = selectBattleWords([...many, ...TEST_WORDS], [], [TEST_CHAIN], new SeededRandom(3), 11);
    expect(selected).toHaveLength(11);
    expect(selected.map((word) => word.word)).not.toContain('quickly');
  });

  it('returns everything when there are fewer candidates than the limit', () => {
    expect(selectBattleWords(TEST_WORDS, [], [], new SeededRandom(1))).toHaveLength(TEST_WORDS.length);
  });

  it('is deterministic for the same seed', () => {
    const first = selectBattleWords(many, [], [], new SeededRandom(5), 30).map((word) => word.id);
    const second = selectBattleWords(many, [], [], new SeededRandom(5), 30).map((word) => word.id);
    expect(first).toEqual(second);
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
