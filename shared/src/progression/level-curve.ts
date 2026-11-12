import type { HeroCombatStats } from '../combat/battle-types.js';

export const MAX_HERO_LEVEL = 50;
// Lên cấp L cần thêm 5 × (L − 1) từ: cấp 2 = 5 từ, cấp 5 = 50, cấp 10 = 225, cấp 20 = 950.
// Đầu game lên nhanh để người mới thấy thưởng, về sau chậm dần theo tốc độ học thật.
const WORDS_PER_LEVEL_STEP = 5;
const BASE_HERO_HP = 100;
const HERO_HP_PER_LEVEL = 10;
const BASE_HERO_POWER = 10;
const HERO_POWER_PER_LEVEL = 2;

/** Số từ đã học tối thiểu để đạt `level`. */
export function learnedWordsForLevel(level: number): number {
  const clamped = Math.min(Math.max(Math.floor(level), 1), MAX_HERO_LEVEL);
  return (WORDS_PER_LEVEL_STEP * (clamped - 1) * clamped) / 2;
}

/** Cấp anh hùng theo số từ đã học (1..50). */
export function heroLevelForLearned(learned: number): number {
  const words = Math.max(0, Math.floor(Number.isFinite(learned) ? learned : 0));
  // Nghịch đảo của learnedWordsForLevel, rồi chỉnh ±1 phòng sai số dấu phẩy động.
  let level = Math.floor((1 + Math.sqrt(1 + (8 * words) / WORDS_PER_LEVEL_STEP)) / 2);
  while (level > 1 && learnedWordsForLevel(level) > words) level -= 1;
  while (level < MAX_HERO_LEVEL && learnedWordsForLevel(level + 1) <= words) level += 1;
  return Math.min(Math.max(level, 1), MAX_HERO_LEVEL);
}

/** Chỉ số chiến đấu gốc theo cấp (trang bị ở thành trì cộng thêm sau). */
export function heroStatsForLevel(level: number): HeroCombatStats {
  const steps = Math.min(Math.max(Math.floor(level), 1), MAX_HERO_LEVEL) - 1;
  return {
    maxHp: BASE_HERO_HP + HERO_HP_PER_LEVEL * steps,
    power: BASE_HERO_POWER + HERO_POWER_PER_LEVEL * steps,
  };
}

export interface ChapterUnlock {
  readonly chapter: number;
  readonly learned: number;
  readonly mastered: number;
}

/** Mốc mở chương (vùng): số từ đã học, riêng chương 5 cần thêm 200 từ đã thuộc. */
export const CHAPTER_UNLOCKS: readonly ChapterUnlock[] = [
  { chapter: 1, learned: 0, mastered: 0 },
  { chapter: 2, learned: 100, mastered: 0 },
  { chapter: 3, learned: 300, mastered: 0 },
  { chapter: 4, learned: 600, mastered: 0 },
  { chapter: 5, learned: 1000, mastered: 200 },
];

export interface WordCounts {
  readonly learned: number;
  readonly mastered: number;
}

export function isChapterUnlocked(chapter: number, counts: WordCounts): boolean {
  const unlock = CHAPTER_UNLOCKS.find((entry) => entry.chapter === chapter);
  return unlock !== undefined && counts.learned >= unlock.learned && counts.mastered >= unlock.mastered;
}

/** Chương cao nhất đã mở (các mốc tăng dần nên chương sau mở thì chương trước cũng đã mở). */
export function highestUnlockedChapter(counts: WordCounts): number {
  return CHAPTER_UNLOCKS.reduce(
    (highest, unlock) => (isChapterUnlocked(unlock.chapter, counts) ? unlock.chapter : highest),
    1,
  );
}
