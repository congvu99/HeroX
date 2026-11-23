import { describe, expect, it } from 'vitest';
import { BASE_SKILL_TIERS, findEncounter, FIELD_ENCOUNTER_ID, TUTORIAL_ENCOUNTER_ID, TUTORIAL_WORD_IDS, type Encounter } from '@herox/shared';
import { HttpError } from '../http/http-error.js';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import { prepareBattle, type BattlePreparationInput } from './battle-preparation.js';

const field = findEncounter(FIELD_ENCOUNTER_ID) as Encounter;

function deckWord(id: string, pos = 'verb'): DeckWord {
  return { id, word: id, pos, meaning: `nghĩa ${id}`, emoji: '⭐', ipa: '' };
}

const TUTORIAL_DECK = TUTORIAL_WORD_IDS.map((id) => deckWord(id));
const EXTRA_DECK = Array.from({ length: 20 }, (_, index) => deckWord(`word${index}`, index % 2 === 0 ? 'noun' : 'adjective'));
const DECK = [...TUTORIAL_DECK, ...EXTRA_DECK];

function learned(words: readonly DeckWord[], overrides: Partial<Omit<LearnedWordProgress, 'word'>> = {}): LearnedWordProgress[] {
  return words.map((word) => ({ word, mastered: false, lapses: 0, ...overrides }));
}

function input(overrides: Partial<BattlePreparationInput> = {}): BattlePreparationInput {
  return {
    encounter: field,
    learnedWords: learned(EXTRA_DECK),
    deckWords: DECK,
    wordMisses: new Map(),
    citadel: { loadout: [], skillTiers: BASE_SKILL_TIERS, inventory: [] },
    seed: 77,
    ...overrides,
  };
}

describe('prepareBattle', () => {
  it('builds the requested encounter from learned words, scaled to the hero level', () => {
    const { setup, tutorial } = prepareBattle(input());
    expect(tutorial).toBe(false);
    expect(setup.encounterId).toBe(FIELD_ENCOUNTER_ID);
    // 20 từ đã học → cấp 3: máu 120, sức 14; quái nhân theo cấp 3.
    expect(setup.hero).toEqual({ maxHp: 120, power: 14 });
    expect(setup.enemies[0]).toEqual({ kind: 'imp', maxHp: 52, attack: 14, rewardGold: 8 });
    expect(setup.words.map((word) => word.id).sort()).toEqual(EXTRA_DECK.map((word) => word.id).sort());
    expect(setup.words.find((word) => word.id === 'word0')?.pos).toBe('noun');
    expect(setup.allowElite).toBe(true);
    expect(setup.promptTimeMs).toBe(field.promptTimeMs);
  });

  it('marks words forgotten in LingoBrain or missed in HeroX as weak and keeps mastery', () => {
    const learnedWords = learned(EXTRA_DECK).map((entry) =>
      entry.word.id === 'word1' ? { ...entry, lapses: 2 } : entry.word.id === 'word2' ? { ...entry, mastered: true } : entry,
    );
    const { setup } = prepareBattle(input({ learnedWords, wordMisses: new Map([['word3', 1]]) }));
    const weak = setup.words.filter((word) => word.weak).map((word) => word.id).sort();
    expect(weak).toEqual(['word1', 'word3']);
    expect(setup.words.find((word) => word.id === 'word2')?.mastered).toBe(true);
  });

  it('keeps only loadout words that made it into the pool', () => {
    const { setup } = prepareBattle(input({ citadel: { loadout: ['word4', 'not-learned', 'word5'], skillTiers: BASE_SKILL_TIERS, inventory: [] } }));
    expect(setup.loadout).toEqual(['word4', 'word5']);
  });

  it('is deterministic for the same seed and varies with the seed', () => {
    const many = Array.from({ length: 80 }, (_, index) => deckWord(`many${index}`));
    const base = input({ learnedWords: learned(many), deckWords: many });
    expect(prepareBattle(base)).toEqual(prepareBattle(base));
    expect(prepareBattle({ ...base, seed: 78 }).setup.words).not.toEqual(prepareBattle(base).setup.words);
    expect(prepareBattle(base).setup.words).toHaveLength(40);
  });

  it('falls back to the tutorial with the fixed chapter 1 words below 8 learned words', () => {
    const { setup, tutorial } = prepareBattle(input({ learnedWords: learned(EXTRA_DECK.slice(0, 7)) }));
    expect(tutorial).toBe(true);
    expect(setup.encounterId).toBe(TUTORIAL_ENCOUNTER_ID);
    expect(setup.allowElite).toBe(false);
    expect(setup.words.map((word) => word.id).sort()).toEqual([...TUTORIAL_WORD_IDS].sort());
  });

  it('answers 503 when the deck lost every tutorial word', () => {
    expect(() => prepareBattle(input({ learnedWords: [], deckWords: EXTRA_DECK }))).toThrow(HttpError);
  });

  it('draws only mastered words for a masteredOnly encounter, falling back to all learned when none are mastered', () => {
    const masteredEncounter: Encounter = { ...field, id: 'test-final', masteredOnly: true };
    const learnedWords = learned(EXTRA_DECK).map((entry) =>
      ['word0', 'word1', 'word2'].includes(entry.word.id) ? { ...entry, mastered: true } : entry,
    );
    const { setup } = prepareBattle(input({ encounter: masteredEncounter, learnedWords }));
    expect(setup.words.every((word) => ['word0', 'word1', 'word2'].includes(word.id))).toBe(true);
    expect(setup.words.every((word) => word.mastered)).toBe(true);

    // Chưa thuộc từ nào: vẫn dựng được trận từ toàn bộ từ đã học (gate mastered thường đã chặn trước).
    const fallback = prepareBattle(input({ encounter: masteredEncounter, learnedWords: learned(EXTRA_DECK) }));
    expect(fallback.setup.words.length).toBeGreaterThan(0);
  });
});
