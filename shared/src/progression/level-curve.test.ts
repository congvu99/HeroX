import { describe, expect, it } from 'vitest';
import {
  CHAPTER_UNLOCKS,
  heroLevelForLearned,
  heroStatsForLevel,
  highestUnlockedChapter,
  isChapterUnlocked,
  learnedWordsForLevel,
  MAX_HERO_LEVEL,
} from './level-curve.js';

describe('hero level curve', () => {
  it.each([
    [0, 1],
    [4, 1],
    [5, 2],
    [14, 2],
    [15, 3],
    [50, 5],
    [225, 10],
    [949, 19],
    [950, 20],
    [5_033, 45],
    [1_000_000, MAX_HERO_LEVEL],
    [-3, 1],
    [Number.NaN, 1],
  ])('%d learned words → level %d', (learned, level) => {
    expect(heroLevelForLearned(learned)).toBe(level);
  });

  it('is the exact inverse of learnedWordsForLevel at every threshold', () => {
    for (let level = 1; level <= MAX_HERO_LEVEL; level += 1) {
      const threshold = learnedWordsForLevel(level);
      expect(heroLevelForLearned(threshold)).toBe(level);
      if (level > 1) expect(heroLevelForLearned(threshold - 1)).toBe(level - 1);
    }
  });

  it('clamps levels outside 1..50', () => {
    expect(learnedWordsForLevel(0)).toBe(0);
    expect(learnedWordsForLevel(99)).toBe(learnedWordsForLevel(MAX_HERO_LEVEL));
  });

  it('grows hero stats with the level', () => {
    expect(heroStatsForLevel(1)).toEqual({ maxHp: 100, power: 10 });
    expect(heroStatsForLevel(10)).toEqual({ maxHp: 190, power: 28 });
    expect(heroStatsForLevel(0)).toEqual(heroStatsForLevel(1));
    expect(heroStatsForLevel(500)).toEqual(heroStatsForLevel(MAX_HERO_LEVEL));
  });
});

describe('chapter unlocks', () => {
  it('uses the milestones 0/100/300/600/1000 learned (+200 mastered for chapter 5)', () => {
    expect(CHAPTER_UNLOCKS.map((unlock) => [unlock.chapter, unlock.learned, unlock.mastered])).toEqual([
      [1, 0, 0],
      [2, 100, 0],
      [3, 300, 0],
      [4, 600, 0],
      [5, 1000, 200],
    ]);
  });

  it.each([
    [{ learned: 0, mastered: 0 }, 1],
    [{ learned: 99, mastered: 0 }, 1],
    [{ learned: 100, mastered: 0 }, 2],
    [{ learned: 650, mastered: 0 }, 4],
    [{ learned: 1500, mastered: 199 }, 4],
    [{ learned: 1000, mastered: 200 }, 5],
  ])('%o unlocks up to chapter %d', (counts, chapter) => {
    expect(highestUnlockedChapter(counts)).toBe(chapter);
  });

  it('reports unknown chapters as locked', () => {
    expect(isChapterUnlocked(6, { learned: 10_000, mastered: 10_000 })).toBe(false);
    expect(isChapterUnlocked(1, { learned: 0, mastered: 0 })).toBe(true);
  });
});
