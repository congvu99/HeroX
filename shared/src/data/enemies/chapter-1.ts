import type { EnemyTemplate } from '../../combat/encounters.js';
import { CHAPTER_2_ENEMIES } from './chapter-2.js';
import { CHAPTER_3_ENEMIES } from './chapter-3.js';
import { CHAPTER_4_ENEMIES } from './chapter-4.js';
import { CHAPTER_5_ENEMIES } from './chapter-5.js';

/**
 * Quỷ chương 1 (Làng Sương Sớm). Chỉ số là mức cấp 1, trận nhân theo cấp anh hùng (`scaleEncounterEnemies`).
 * `name` hiện trên HUD trận; hình của từng `kind` do client ánh xạ.
 */
export const CHAPTER_1_ENEMIES = {
  impScout: { kind: 'imp-scout', name: 'Tiểu quỷ do thám', baseHp: 30, baseAttack: 8, rewardGold: 5 },
  imp: { kind: 'imp', name: 'Tiểu quỷ', baseHp: 40, baseAttack: 12, rewardGold: 8 },
  skeleton: { kind: 'skeleton', name: 'Xương khô', baseHp: 55, baseAttack: 13, rewardGold: 10 },
  ghoul: { kind: 'ghoul', name: 'Quỷ đói', baseHp: 60, baseAttack: 15, rewardGold: 12 },
  /**
   * Trùm Quỷ Bù Nhìn. Còn ≤ 50% máu thì sang pha 2, dựng khiên lửa:
   * chỉ chiêu nằm trong combo từ 3 chiêu liên tiếp mới xuyên khiên (dạy người chơi ghép chuỗi).
   */
  scarecrowDemon: {
    kind: 'scarecrow-demon',
    name: 'Quỷ Bù Nhìn',
    baseHp: 240,
    baseAttack: 18,
    rewardGold: 60,
    fireShield: { belowHpRatio: 0.5, minCombo: 3 },
  },
} as const satisfies Readonly<Record<string, EnemyTemplate>>;

/** Tên hiển thị theo `kind` của mọi chương; quái không có trong bảng dùng chính `kind`. */
const ALL_ENEMY_TABLES: readonly Readonly<Record<string, EnemyTemplate>>[] = [
  CHAPTER_1_ENEMIES,
  CHAPTER_2_ENEMIES,
  CHAPTER_3_ENEMIES,
  CHAPTER_4_ENEMIES,
  CHAPTER_5_ENEMIES,
];
export const ENEMY_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
  ALL_ENEMY_TABLES.flatMap((table) => Object.values(table)).map((enemy) => [enemy.kind, enemy.name ?? enemy.kind]),
);
