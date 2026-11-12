import { describe, expect, it } from 'vitest';
import type { WordChain } from '../data/word-chains.js';
import {
  CHAIN_COMBO_MULTIPLIER,
  COMBO_WINDOW_MS,
  comboExpiresAtMs,
  EMPTY_COMBO,
  extendCombo,
  nextChainWord,
  SAME_POS_COMBO_MULTIPLIER,
  type ComboLink,
  type ComboState,
} from './combo-chain.js';

const chains: readonly WordChain[] = [
  { id: 'run-away-quickly', words: ['run', 'away', 'quickly'] },
  { id: 'go-out', words: ['go', 'out'] },
];

function castAll(links: readonly ComboLink[]): ReturnType<typeof extendCombo>[] {
  let combo: ComboState = EMPTY_COMBO;
  return links.map((link, index) => {
    const result = extendCombo(combo, link, index * 1_000, chains);
    combo = result.combo;
    return result;
  });
}

describe('extendCombo', () => {
  it('counts consecutive casts without a bonus when nothing matches', () => {
    const results = castAll([
      { word: 'castle', pos: 'noun' },
      { word: 'strike', pos: 'verb' },
    ]);
    expect(results.map((result) => [result.count, result.bonus, result.multiplier])).toEqual([
      [1, 'none', 1],
      [2, 'none', 1],
    ]);
  });

  it('gives x1.3 from the third cast of the same part of speech', () => {
    const results = castAll([
      { word: 'strike', pos: 'verb' },
      { word: 'protect', pos: 'verb' },
      { word: 'fight', pos: 'verb' },
      { word: 'climb', pos: 'verb' },
    ]);
    expect(results.map((result) => result.multiplier)).toEqual([1, 1, SAME_POS_COMBO_MULTIPLIER, SAME_POS_COMBO_MULTIPLIER]);
    expect(results[2]?.bonus).toBe('same-pos');
  });

  it('gives x1.6 and a finisher for a valid phrase chain, then starts a fresh chain', () => {
    const results = castAll([
      { word: 'run', pos: 'verb' },
      { word: 'away', pos: 'adv' },
      { word: 'quickly', pos: 'adv' },
    ]);
    const finisher = results[2];
    expect(finisher).toMatchObject({ bonus: 'chain', multiplier: CHAIN_COMBO_MULTIPLIER, chainId: 'run-away-quickly', count: 3 });
    expect(finisher?.combo.links).toEqual([]);
  });

  it('prefers the chain over the same-POS bonus', () => {
    const results = castAll([
      { word: 'fight', pos: 'verb' },
      { word: 'go', pos: 'verb' },
      { word: 'out', pos: 'verb' },
    ]);
    expect(results[2]?.bonus).toBe('chain');
  });

  it('only remembers enough casts for the longest chain', () => {
    const links = Array.from({ length: 10 }, (_, index): ComboLink => ({ word: `w${index}`, pos: 'noun' }));
    const last = castAll(links).at(-1);
    expect(last?.count).toBe(10);
    expect(last?.combo.links).toHaveLength(3);
  });
});

describe('comboExpiresAtMs', () => {
  it('is null without a combo and 4 s after the last cast otherwise', () => {
    expect(comboExpiresAtMs(EMPTY_COMBO)).toBeNull();
    const { combo } = extendCombo(EMPTY_COMBO, { word: 'run', pos: 'verb' }, 500, chains);
    expect(comboExpiresAtMs(combo)).toBe(500 + COMBO_WINDOW_MS);
  });
});

describe('nextChainWord', () => {
  it('suggests the next word of a started chain, preferring the longest matched prefix', () => {
    const afterRun = castAll([{ word: 'run', pos: 'verb' }]).at(-1)?.combo ?? EMPTY_COMBO;
    expect(nextChainWord(afterRun, chains)).toBe('away');
    const afterAway = extendCombo(afterRun, { word: 'away', pos: 'adv' }, 1_000, chains).combo;
    expect(nextChainWord(afterAway, chains)).toBe('quickly');
  });

  it('returns null when no chain is in progress', () => {
    expect(nextChainWord(EMPTY_COMBO, chains)).toBeNull();
    const unrelated = extendCombo(EMPTY_COMBO, { word: 'castle', pos: 'noun' }, 0, chains).combo;
    expect(nextChainWord(unrelated, chains)).toBeNull();
  });
});
