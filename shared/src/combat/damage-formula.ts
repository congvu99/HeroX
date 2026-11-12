import { SKILL_TIER_POWER_FACTORS, type SkillTier } from '../data/skill-catalog.js';
import type { SkillKind } from './skill-kind.js';

/** Cách tung chiêu: gõ khớp hẳn, gõ gần đúng, hay chọn trên vòng từ. */
export type CastAccuracy = 'exact' | 'near' | 'ring';

// Gõ đúng là nhớ lại chủ động nên mạnh nhất; vòng từ chỉ là nhận diện nên yếu hơn.
export const ACCURACY_DAMAGE_FACTORS: Readonly<Record<CastAccuracy, number>> = {
  exact: 1,
  near: 0.8,
  ring: 0.7,
};
// Từ đã thuộc (ivl ≥ 21 ngày) mạnh hơn 25%.
export const MASTERED_DAMAGE_FACTOR = 1.25;
// Chiêu hỗ trợ (khiên, làm yếu, né) đánh nhẹ hơn vì đổi lấy hiệu ứng.
export const UTILITY_SKILL_DAMAGE_FACTOR = 0.6;
// Khiên nhận thêm một nửa sức chiêu, tối đa nửa máu anh hùng.
const GUARD_SHIELD_RATIO = 0.5;
const MAX_SHIELD_RATIO_OF_HP = 0.5;
// Quái bị làm yếu chỉ đánh được một nửa sát thương ở đòn kế tiếp.
export const WEAKENED_ENEMY_DAMAGE_FACTOR = 0.5;
const MIN_CAST_DAMAGE = 1;

export interface CastPower {
  readonly power: number;
  readonly accuracy: CastAccuracy;
  readonly mastered: boolean;
  readonly skill: SkillKind;
  /** Bậc của loại chiêu này, nâng ở tháp phép. */
  readonly tier: SkillTier;
  readonly comboMultiplier: number;
}

function castStrength(cast: CastPower): number {
  return (
    cast.power *
    ACCURACY_DAMAGE_FACTORS[cast.accuracy] *
    (cast.mastered ? MASTERED_DAMAGE_FACTOR : 1) *
    SKILL_TIER_POWER_FACTORS[cast.tier]
  );
}

/** Sát thương của một chiêu lên quái, làm tròn, tối thiểu 1. */
export function computeCastDamage(cast: CastPower): number {
  const skillFactor = cast.skill === 'attack' ? 1 : UTILITY_SKILL_DAMAGE_FACTOR;
  return Math.max(MIN_CAST_DAMAGE, Math.round(castStrength(cast) * skillFactor * cast.comboMultiplier));
}

/** Lượng khiên một chiêu danh từ tạo thêm (không nhân combo để khiên không phình quá nhanh). */
export function computeShieldGain(cast: CastPower): number {
  return Math.round(castStrength(cast) * GUARD_SHIELD_RATIO);
}

export function maxShieldFor(heroMaxHp: number): number {
  return Math.floor(heroMaxHp * MAX_SHIELD_RATIO_OF_HP);
}

/** Sát thương một đòn đánh trả của quái trước khi trừ khiên. */
export function computeEnemyHitDamage(attack: number, weakened: boolean): number {
  return Math.round(attack * (weakened ? WEAKENED_ENEMY_DAMAGE_FACTOR : 1));
}
