import { describe, expect, it } from 'vitest';
import { BASE_SKILL_TIERS, findEncounter, FIELD_ENCOUNTER_ID, SCARECROW_BOSS_ENCOUNTER_ID, TUTORIAL_ENCOUNTER_ID, TUTORIAL_WORD_IDS, type Encounter } from '@herox/shared';
import { HttpError } from '../http/http-error.js';
import type { DeckWord, LearnedWordProgress } from '../learning/learning-stats.js';
import type { WordExposure } from './battle-repository.js';
import {
  EXPOSURE_COOLDOWN_MS,
  FRESH_STUDY_WINDOW_MS,
  prepareBattle,
  STALE_EXPOSURE_MS,
  WEAK_CLEAR_STREAK,
  type BattlePreparationInput,
} from './battle-preparation.js';

const field = findEncounter(FIELD_ENCOUNTER_ID) as Encounter;
const boss = findEncounter(SCARECROW_BOSS_ENCOUNTER_ID) as Encounter;
const NOW = Date.UTC(2026, 10, 25, 5, 0, 0);
const DAY_MS = 86_400_000;

function deckWord(id: string, pos = 'verb'): DeckWord {
  return { id, word: id, pos, meaning: `nghĩa ${id}`, emoji: '⭐', ipa: '' };
}

const TUTORIAL_DECK = TUTORIAL_WORD_IDS.map((id) => deckWord(id));
const EXTRA_DECK = Array.from({ length: 20 }, (_, index) => deckWord(`word${index}`, index % 2 === 0 ? 'noun' : 'adjective'));
const DECK = [...TUTORIAL_DECK, ...EXTRA_DECK];

// Từ "quen khoẻ" mặc định: xếp nhóm `familiar`, không bị cờ yếu.
function learned(words: readonly DeckWord[], overrides: Partial<Omit<LearnedWordProgress, 'word'>> = {}): LearnedWordProgress[] {
  return words.map((word) => ({
    word,
    mastered: false,
    lapses: 0,
    state: 'review',
    ivl: 10,
    ef: 2.5,
    due: NOW + 5 * DAY_MS,
    reps: 5,
    lastGrade: 2,
    firstStudiedAt: null,
    ...overrides,
  }));
}

function input(overrides: Partial<BattlePreparationInput> = {}): BattlePreparationInput {
  return {
    encounter: field,
    learnedWords: learned(EXTRA_DECK),
    deckWords: DECK,
    wordMisses: new Map(),
    exposures: new Map<string, WordExposure>(),
    citadel: { loadout: [], skillTiers: BASE_SKILL_TIERS, inventory: [] },
    seed: 77,
    now: NOW,
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
    // 20 từ ≤ 40 slot → cả bộ vào trận.
    expect(setup.words.map((word) => word.id).sort()).toEqual(EXTRA_DECK.map((word) => word.id).sort());
    expect(setup.words.find((word) => word.id === 'word0')?.pos).toBe('noun');
    expect(setup.allowElite).toBe(true);
    expect(setup.promptTimeMs).toBe(field.promptTimeMs);
  });

  it('marks hard-tier words weak and keeps mastery', () => {
    const learnedWords = learned(EXTRA_DECK).map((entry) =>
      entry.word.id === 'word1' ? { ...entry, lapses: 2, ef: 2.0 } : entry.word.id === 'word2' ? { ...entry, mastered: true, ivl: 30 } : entry,
    );
    const { setup } = prepareBattle(input({ learnedWords, wordMisses: new Map([['word3', 1]]) }));
    const weak = setup.words.filter((word) => word.weak).map((word) => word.id).sort();
    expect(weak).toEqual(['word1', 'word3']);
    expect(setup.words.find((word) => word.id === 'word2')?.mastered).toBe(true);
  });

  it('clears the hard tier after enough correct answers in HeroX', () => {
    const learnedWords = learned(EXTRA_DECK);
    const wordMisses = new Map([['word5', 2]]);
    // Chưa đủ chuỗi đúng: vẫn hay sai → cờ yếu.
    const stillWeak = prepareBattle(input({ learnedWords, wordMisses, exposures: new Map([['word5', { correctStreak: WEAK_CLEAR_STREAK - 1, lastSeenAtMs: NOW - DAY_MS }]]) }));
    expect(stillWeak.setup.words.find((word) => word.id === 'word5')?.weak).toBe(true);
    // Đã đúng đủ 2 lần liên tiếp: hết yếu.
    const cleared = prepareBattle(input({ learnedWords, wordMisses, exposures: new Map([['word5', { correctStreak: WEAK_CLEAR_STREAK, lastSeenAtMs: NOW - DAY_MS }]]) }));
    expect(cleared.setup.words.find((word) => word.id === 'word5')?.weak).toBe(false);
  });

  it('keeps only loadout words that made it into the pool', () => {
    const { setup } = prepareBattle(input({ citadel: { loadout: ['word4', 'not-learned', 'word5'], skillTiers: BASE_SKILL_TIERS, inventory: [] } }));
    expect(setup.loadout).toEqual(['word4', 'word5']);
  });

  it('orders a tier so a word seen recently comes after one long unseen', () => {
    // word0 và word1 cùng nhóm "due"; chỉ word0 vừa gặp → word0 xếp sau word1. Thêm từ nền để đủ 8 từ (không vào tutorial).
    const dueWords = [deckWord('word0'), deckWord('word1')];
    const filler = Array.from({ length: 8 }, (_, index) => deckWord(`filler${index}`));
    const learnedWords = [...learned(dueWords, { due: NOW - DAY_MS }), ...learned(filler)];
    const exposures = new Map<string, WordExposure>([['word0', { correctStreak: 1, lastSeenAtMs: NOW - EXPOSURE_COOLDOWN_MS / 2 }]]);
    const { setup } = prepareBattle(input({ learnedWords, deckWords: [...dueWords, ...filler], exposures }));
    const ids = setup.words.map((word) => word.id);
    expect(ids.indexOf('word1')).toBeLessThan(ids.indexOf('word0'));
  });

  it('flags words first studied within the fresh window and puts them in a crowded pool', () => {
    // 60 từ quen chiếm hết 40 slot; 3 từ vừa học hôm nay vẫn phải vào trận, từ học lâu rồi thì không bị cờ.
    const crowd = Array.from({ length: 60 }, (_, index) => deckWord(`crowd${index}`));
    const freshWords = [deckWord('fresh0'), deckWord('fresh1'), deckWord('fresh2')];
    const learnedWords = [
      ...learned(crowd, { firstStudiedAt: NOW - FRESH_STUDY_WINDOW_MS - DAY_MS }),
      ...learned(freshWords, { firstStudiedAt: NOW - DAY_MS / 2 }),
    ];
    const { setup } = prepareBattle(input({ learnedWords, deckWords: [...crowd, ...freshWords] }));
    const byId = new Map(setup.words.map((word) => [word.id, word]));
    for (const id of ['fresh0', 'fresh1', 'fresh2']) expect(byId.get(id)?.fresh).toBe(true);
    expect(setup.words.filter((word) => word.fresh)).toHaveLength(3);
  });

  it('orders the new tier by most recent study first', () => {
    // 30 từ mới học cách 10 ngày, 1 từ mới học hôm qua: hạn ngạch nhóm mới chỉ lấy vài từ, từ hôm qua phải có mặt.
    const older = Array.from({ length: 60 }, (_, index) => deckWord(`old${index}`));
    const latest = [deckWord('latest')];
    const asNew = { state: 'learning', reps: 1 } as const;
    const learnedWords = [
      ...learned(older, { ...asNew, firstStudiedAt: NOW - 10 * DAY_MS }),
      ...learned(latest, { ...asNew, firstStudiedAt: NOW - 5 * DAY_MS }),
    ];
    const { setup } = prepareBattle(input({ learnedWords, deckWords: [...older, ...latest] }));
    // Cả hai ngoài cửa sổ "vừa học" nên chỉ thứ tự trong nhóm mới quyết định; từ học gần nhất đứng đầu bộ.
    expect(setup.words[0]?.id).toBe('latest');
  });

  it('flags words unseen in HeroX for a long time (or never) as stale and puts them first in their tier', () => {
    const exposures = new Map<string, WordExposure>([
      ['word0', { correctStreak: 3, lastSeenAtMs: NOW - STALE_EXPOSURE_MS - DAY_MS }],
      ['word1', { correctStreak: 3, lastSeenAtMs: NOW - 2 * DAY_MS }],
    ]);
    const { setup } = prepareBattle(input({ exposures }));
    const byId = new Map(setup.words.map((word) => [word.id, word]));
    expect(byId.get('word0')?.stale).toBe(true);
    expect(byId.get('word1')?.stale).toBe(false);
    // Chưa gặp lần nào cũng là lâu chưa gặp.
    expect(byId.get('word2')?.stale).toBe(true);
    const ids = setup.words.map((word) => word.id);
    expect(ids.indexOf('word0')).toBeLessThan(ids.indexOf('word1'));
  });

  it('is deterministic for the same seed and varies with the seed', () => {
    const many = Array.from({ length: 80 }, (_, index) => deckWord(`many${index}`));
    const base = input({ learnedWords: learned(many), deckWords: many });
    expect(prepareBattle(base)).toEqual(prepareBattle(base));
    expect(prepareBattle({ ...base, seed: 78 }).setup.words).not.toEqual(prepareBattle(base).setup.words);
    expect(prepareBattle(base).setup.words).toHaveLength(40);
  });

  it('uses the boss word mix for a boss encounter', () => {
    const many = Array.from({ length: 80 }, (_, index) => deckWord(`many${index}`));
    // Nửa bộ là từ khó (ef thấp) để nhóm hard đủ từ cho hạn ngạch boss 40%.
    const learnedWords = learned(many).map((entry, index) => (index % 2 === 0 ? { ...entry, ef: 2.0 } : entry));
    const { setup } = prepareBattle(input({ encounter: boss, learnedWords, deckWords: many }));
    const hardCount = setup.words.filter((word) => word.weak).length;
    // Boss nặng nhóm khó: ≥ 30% bộ 40 từ là từ khó.
    expect(hardCount).toBeGreaterThanOrEqual(12);
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
      ['word0', 'word1', 'word2'].includes(entry.word.id) ? { ...entry, mastered: true, ivl: 30 } : entry,
    );
    const { setup } = prepareBattle(input({ encounter: masteredEncounter, learnedWords }));
    expect(setup.words.every((word) => ['word0', 'word1', 'word2'].includes(word.id))).toBe(true);
    expect(setup.words.every((word) => word.mastered)).toBe(true);

    // Chưa thuộc từ nào: vẫn dựng được trận từ toàn bộ từ đã học (gate mastered thường đã chặn trước).
    const fallback = prepareBattle(input({ encounter: masteredEncounter, learnedWords: learned(EXTRA_DECK) }));
    expect(fallback.setup.words.length).toBeGreaterThan(0);
  });
});
