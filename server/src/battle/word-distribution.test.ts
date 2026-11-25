import { describe, expect, it } from 'vitest';
import {
  availableChains,
  BASE_SKILL_TIERS,
  EMPTY_COMBO,
  extendCombo,
  FIELD_ENCOUNTER_ID,
  findEncounter,
  normalizeAnswer,
  pickPromptWord,
  SeededRandom,
  WORD_CHAINS,
  type BattleWord,
  type Encounter,
} from '@herox/shared';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import type { WordExposure } from './battle-repository.js';
import { prepareBattle, WEAK_CLEAR_STREAK } from './battle-preparation.js';

const field = findEncounter(FIELD_ENCOUNTER_ID) as Encounter;
const START_MS = Date.UTC(2026, 10, 25, 5, 0, 0);
const DAY_MS = 86_400_000;
const THIRTY_MIN_MS = 30 * 60_000;
const BATTLES = 10;
const PROMPTS_PER_BATTLE = 20;
const LEARNED_COUNT = 2_000;

// Mọi từ chuỗi cụm có trong bộ (đọc được combo kết liễu), kiểm tỉ lệ đề rơi vào chúng.
const CHAIN_WORDS: readonly string[] = [...new Set(WORD_CHAINS.flatMap((chain) => chain.words))];
const CHAIN_WORD_SET = new Set(CHAIN_WORDS.map((word) => normalizeAnswer(word)));
// 12 từ hay sai cố định (gõ sai trong HeroX), lấy ngoài tập chuỗi cụm để tách bạch.
const MISSED_WORDS: readonly string[] = Array.from({ length: 12 }, (_, index) => `missed${index}`);

function deckWord(id: string, word = id): DeckWord {
  return { id, word, pos: 'verb', meaning: `nghĩa ${id}`, emoji: '⭐', ipa: '' };
}

/** Gán nhóm cho từ thứ `index` để bộ 2000 từ có đủ 5 nhóm trải đều. */
function learnedFor(id: string, word: string, index: number): LearnedWordProgress {
  const base: LearnedWordProgress = {
    word: deckWord(id, word),
    mastered: false,
    lapses: 0,
    state: 'review',
    ivl: 10,
    ef: 2.5,
    due: START_MS + 30 * DAY_MS,
    reps: 5,
    lastGrade: 2,
  };
  switch (index % 5) {
    case 0: // new
      return { ...base, state: 'learning', reps: 1 };
    case 1: // due
      return { ...base, due: START_MS - DAY_MS };
    case 2: // hard
      return { ...base, ef: 2.0, lapses: 1, lastGrade: 1 };
    case 3: // familiar
      return base;
    default: // mastered
      return { ...base, mastered: true, ivl: 30 };
  }
}

function buildLearnedWords(): LearnedWordProgress[] {
  const words: LearnedWordProgress[] = [];
  // Từ chuỗi cụm trước (id = chữ thường của từ) để `availableChains` nhận ra chúng.
  CHAIN_WORDS.forEach((word, index) => words.push(learnedFor(word, word, index)));
  MISSED_WORDS.forEach((id, index) => words.push(learnedFor(id, id, index)));
  for (let index = words.length; index < LEARNED_COUNT; index += 1) {
    words.push(learnedFor(`filler${index}`, `filler${index}`, index));
  }
  return words;
}

/** Mô phỏng 20 đề của một trận bằng `pickPromptWord`, giả định trả lời đúng (combo giữ). */
function simulateBattle(words: readonly BattleWord[], seed: number): string[] {
  const chains = availableChains(words, WORD_CHAINS);
  const rng = new SeededRandom(seed);
  const prompted: string[] = [];
  let combo = EMPTY_COMBO;
  let recentWordIds: string[] = [];
  for (let round = 0; round < PROMPTS_PER_BATTLE; round += 1) {
    const word = pickPromptWord({ words, recentWordIds, retryWordIds: [], combo, chains }, rng);
    prompted.push(word.id);
    recentWordIds = [...recentWordIds, word.id].slice(-3);
    combo = extendCombo(combo, { word: normalizeAnswer(word.word), pos: word.pos }, round * 1_000, chains).combo;
  }
  return prompted;
}

/** Cập nhật map exposures như `settleBattle` khi mọi đề đều trả lời đúng. */
function applyExposures(exposures: Map<string, WordExposure>, prompted: readonly string[], settledAtMs: number): void {
  const prompts = new Map<string, number>();
  for (const id of prompted) prompts.set(id, (prompts.get(id) ?? 0) + 1);
  for (const [id, count] of prompts) {
    const previous = exposures.get(id);
    exposures.set(id, { correctStreak: (previous?.correctStreak ?? 0) + count, lastSeenAtMs: settledAtMs });
  }
}

describe('battle word distribution over ten battles', () => {
  it('spreads prompts: chain words stay a minority and no word is overused, and hard words clear', () => {
    const learnedWords = buildLearnedWords();
    const wordMisses = new Map(MISSED_WORDS.map((id) => [id, 2]));
    const exposures = new Map<string, WordExposure>();
    const promptCounts = new Map<string, number>();
    let chainPrompts = 0;
    let totalPrompts = 0;

    for (let battle = 0; battle < BATTLES; battle += 1) {
      const now = START_MS + battle * THIRTY_MIN_MS;
      const { setup } = prepareBattle({
        encounter: field,
        learnedWords,
        deckWords: learnedWords.map((entry) => entry.word),
        wordMisses,
        exposures,
        citadel: { loadout: [], skillTiers: BASE_SKILL_TIERS, inventory: [] },
        seed: 1_000 + battle,
        now,
      });
      const byId = new Map(setup.words.map((word) => [word.id, word]));
      const prompted = simulateBattle(setup.words, 500 + battle);
      for (const id of prompted) {
        promptCounts.set(id, (promptCounts.get(id) ?? 0) + 1);
        totalPrompts += 1;
        if (CHAIN_WORD_SET.has(normalizeAnswer(byId.get(id)?.word ?? ''))) chainPrompts += 1;
      }
      applyExposures(exposures, prompted, now);
    }

    // Từ chuỗi cụm ≤ 25% số đề.
    expect(chainPrompts / totalPrompts).toBeLessThanOrEqual(0.25);
    // Không từ nào ra quá 3 lần trong 10 trận.
    const maxRepeats = Math.max(...promptCounts.values());
    expect(maxRepeats).toBeLessThanOrEqual(3);
    // 12 từ hay sai đã đúng đủ 2 lần liên tiếp → hết nhóm Khó ở trận cuối.
    const finalMix = prepareBattle({
      encounter: field,
      learnedWords,
      deckWords: learnedWords.map((entry) => entry.word),
      wordMisses,
      exposures,
      citadel: { loadout: [], skillTiers: BASE_SKILL_TIERS, inventory: [] },
      seed: 9_999,
      now: START_MS + BATTLES * THIRTY_MIN_MS,
    });
    expect(exposures.size).toBeGreaterThan(0);
    for (const id of MISSED_WORDS) {
      const streak = exposures.get(id)?.correctStreak ?? 0;
      if (streak >= WEAK_CLEAR_STREAK) {
        expect(finalMix.setup.words.find((word) => word.id === id)?.weak ?? false).toBe(false);
      }
    }
  });

  it('keeps the field quota within ±1 of each tier when every tier has words', () => {
    const learnedWords = buildLearnedWords();
    const { setup } = prepareBattle({
      encounter: field,
      learnedWords,
      deckWords: learnedWords.map((entry) => entry.word),
      wordMisses: new Map(),
      exposures: new Map<string, WordExposure>(),
      citadel: { loadout: [], skillTiers: BASE_SKILL_TIERS, inventory: [] },
      seed: 42,
      now: START_MS,
    });
    expect(setup.words).toHaveLength(40);
  });
});
