import type { SkillKind } from '../combat/skill-kind.js';
import type { PartOfSpeechGroup } from '../me-contract.js';

/** Bậc chiêu nâng ở tháp phép của thành trì; người chơi mới ở bậc 1. */
export const SKILL_TIERS = [1, 2, 3] as const;
export type SkillTier = (typeof SKILL_TIERS)[number];
export const BASE_SKILL_TIER: SkillTier = 1;
export const MAX_SKILL_TIER: SkillTier = 3;

/** Bậc hiện tại của từng loại chiêu. */
export type SkillTiers = Readonly<Record<SkillKind, SkillTier>>;

export const BASE_SKILL_TIERS: SkillTiers = {
  attack: BASE_SKILL_TIER,
  guard: BASE_SKILL_TIER,
  empower: BASE_SKILL_TIER,
  evade: BASE_SKILL_TIER,
};

// Mỗi bậc chiêu nâng ở tháp phép làm chiêu loại đó mạnh thêm 15%.
export const SKILL_TIER_POWER_FACTORS: Readonly<Record<SkillTier, number>> = {
  1: 1,
  2: 1.15,
  3: 1.3,
};

export function isSkillTier(value: unknown): value is SkillTier {
  return typeof value === 'number' && (SKILL_TIERS as readonly number[]).includes(value);
}

/** Hiệu ứng hệ thống ngoài chiêu; tên trùng `name` trong `assets/fx/fx-manifest.json`. */
export const SYSTEM_FX = {
  finisher: 'finisher',
  comboUp: 'combo-up',
  enemyStrike: 'enemy-strike',
  enemySpawn: 'enemy-spawn',
  enemyDeath: 'enemy-death',
  levelUp: 'level-up',
  shieldBlock: 'guard-cast-1',
  dashDust: 'dash-dust',
  blinkOut: 'blink-out',
  blinkIn: 'blink-in',
} as const;

/** Một biến thể chiêu: tên, mô tả hiển thị và hiệu ứng (tên trong fx manifest). */
export interface SkillVariant {
  readonly id: string;
  readonly kind: SkillKind;
  readonly tier: SkillTier;
  readonly name: string;
  readonly description: string;
  /** Hiệu ứng phát ở hiệp sĩ lúc tung chiêu. */
  readonly castFx: string;
  /** Hiệu ứng phát ở quái lúc trúng. */
  readonly impactFx: string;
  /** Tỉ lệ phóng hiệu ứng; bậc 3 dùng lại hiệu ứng bậc 2 nhưng to hơn. */
  readonly fxScale: number;
}

type TierVariants = readonly [SkillVariant, SkillVariant, SkillVariant];

function variant(kind: SkillKind, tier: SkillTier, fields: Omit<SkillVariant, 'id' | 'kind' | 'tier'>): SkillVariant {
  return { id: `${kind}-${tier}`, kind, tier, ...fields };
}

/**
 * Hệ chiêu HeroX: mỗi loại chiêu (theo từ loại) có 3 bậc. Sức mạnh do `damage-formula` quyết định;
 * bậc ở đây đổi tên, mô tả và hiệu ứng, phần chỉ số theo bậc do thành trì quyết định.
 */
export const SKILL_CATALOG: Readonly<Record<SkillKind, TierVariants>> = {
  attack: [
    variant('attack', 1, {
      name: 'Lời Chém',
      description: 'Đọc đúng một động từ, lưỡi kiếm khắc chữ chém thẳng vào quỷ.',
      castFx: 'attack-cast-1',
      impactFx: 'attack-impact-1',
      fxScale: 1,
    }),
    variant('attack', 2, {
      name: 'Nhát Bổ Thánh Ngôn',
      description: 'Chữ bùng sáng trên lưỡi kiếm, bổ xuống từ trên cao.',
      castFx: 'attack-cast-2',
      impactFx: 'attack-impact-2',
      fxScale: 1,
    }),
    variant('attack', 3, {
      name: 'Phán Quyết Ánh Sáng',
      description: 'Nhát bổ mang sức nặng của cả câu thánh ngôn, rung chuyển mặt đất.',
      castFx: 'attack-cast-2',
      impactFx: 'attack-impact-2',
      fxScale: 1.25,
    }),
  ],
  guard: [
    variant('guard', 1, {
      name: 'Khiên Chữ',
      description: 'Danh từ hoá thành tấm khiên, đỡ một phần đòn quỷ.',
      castFx: 'guard-cast-1',
      impactFx: 'guard-impact-1',
      fxScale: 1,
    }),
    variant('guard', 2, {
      name: 'Vòm Thánh Quang',
      description: 'Vòm sáng vàng bao quanh hiệp sĩ, hấp thụ đòn đánh.',
      castFx: 'guard-cast-2',
      impactFx: 'guard-impact-2',
      fxScale: 1,
    }),
    variant('guard', 3, {
      name: 'Thành Luỹ Thánh Ngôn',
      description: 'Vòm sáng dày như tường thành, đỡ đòn quỷ chắc chắn hơn.',
      castFx: 'guard-cast-2',
      impactFx: 'guard-impact-2',
      fxScale: 1.25,
    }),
  ],
  empower: [
    variant('empower', 1, {
      name: 'Xiềng Ngôn',
      description: 'Tính từ thành xiềng xích bóng tối, trói tay quỷ làm đòn kế yếu đi.',
      castFx: 'empower-cast-1',
      impactFx: 'empower-impact-1',
      fxScale: 1,
    }),
    variant('empower', 2, {
      name: 'Ấn Câm Lặng',
      description: 'Khắc ấn nguyền lên quỷ, rút sức của nó.',
      castFx: 'empower-cast-2',
      impactFx: 'empower-impact-2',
      fxScale: 1,
    }),
    variant('empower', 3, {
      name: 'Phong Ấn Vực Sâu',
      description: 'Ấn nguyền khổng lồ đè quỷ xuống, sức nó cạn dần.',
      castFx: 'empower-cast-2',
      impactFx: 'empower-impact-2',
      fxScale: 1.25,
    }),
  ],
  evade: [
    variant('evade', 1, {
      name: 'Bước Lướt',
      description: 'Trạng từ, giới từ cho đôi chân tốc độ: lướt né trọn đòn kế của quỷ.',
      castFx: SYSTEM_FX.dashDust,
      impactFx: 'attack-impact-1',
      fxScale: 1,
    }),
    variant('evade', 2, {
      name: 'Thuấn Bộ',
      description: 'Tan thành ánh sáng rồi hiện lại ở chỗ khác, né trọn đòn kế.',
      castFx: SYSTEM_FX.blinkOut,
      impactFx: 'attack-impact-1',
      fxScale: 1,
    }),
    variant('evade', 3, {
      name: 'Bóng Ánh Sáng',
      description: 'Thuấn bộ nhanh tới mức quỷ chỉ chém trúng bóng sáng còn lại.',
      castFx: SYSTEM_FX.blinkOut,
      impactFx: 'attack-impact-2',
      fxScale: 1.25,
    }),
  ],
};

/**
 * Biến thể chiêu hiển thị cho một lần tung. Từ đã thuộc (chiêu mạnh hơn 25%) hiện hiệu ứng cao hơn một bậc
 * để người chơi thấy rõ lợi ích của việc ôn đến thuộc.
 */
export function skillVariantFor(kind: SkillKind, tier: SkillTier, mastered: boolean): SkillVariant {
  const shownTier = Math.min(MAX_SKILL_TIER, tier + (mastered ? 1 : 0)) as SkillTier;
  return SKILL_CATALOG[kind][shownTier - 1] as SkillVariant;
}

/** Kỹ năng di chuyển ngoài map, mở theo số trạng từ + giới từ đã học. */
export const MOVEMENT_SKILL_IDS = ['dash', 'blink'] as const;
export type MovementSkillId = (typeof MOVEMENT_SKILL_IDS)[number];

export interface MovementSkill {
  readonly id: MovementSkillId;
  readonly name: string;
  readonly description: string;
  /** Số trạng từ + giới từ đã học cần có để mở. */
  readonly requiredAdvPrepWords: number;
  readonly cooldownMs: number;
}

// Mốc mở thấp cho lướt (gặp sớm ở chương 1), cao hơn cho dịch chuyển để có mục tiêu học tiếp.
export const MOVEMENT_SKILLS: Readonly<Record<MovementSkillId, MovementSkill>> = {
  dash: {
    id: 'dash',
    name: 'Bước Lướt',
    description: 'Lướt nhanh một đoạn ngắn, không bị trúng đòn trong lúc lướt.',
    requiredAdvPrepWords: 5,
    cooldownMs: 1_200,
  },
  blink: {
    id: 'blink',
    name: 'Thuấn Bộ',
    description: 'Dịch chuyển tức thời qua khe hẹp hoặc chướng ngại mỏng phía trước.',
    requiredAdvPrepWords: 15,
    cooldownMs: 4_000,
  },
};

/** Số từ có thể dùng mở kỹ năng di chuyển: trạng từ + giới từ đã học. */
export function advPrepWordCount(byPos: Readonly<Record<PartOfSpeechGroup, number>>): number {
  return byPos.adv + byPos.prep;
}

export function isMovementSkillUnlocked(id: MovementSkillId, byPos: Readonly<Record<PartOfSpeechGroup, number>>): boolean {
  return advPrepWordCount(byPos) >= MOVEMENT_SKILLS[id].requiredAdvPrepWords;
}
