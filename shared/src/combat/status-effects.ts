import type { ComboTier } from './combo-tier.js';

/**
 * Hiệu ứng trạng thái do chiêu bậc combo cao gây ra. Quái chỉ đánh khi người chơi sai, nên:
 * trạng thái gây sát thương tick sau mỗi đòn đúng; trạng thái chặn đòn áp vào lần quái đánh kế tiếp.
 */
export const STATUS_KINDS = ['burn', 'poison', 'freeze', 'stun', 'lifesteal', 'heal', 'haste', 'curse'] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

/** Trạng thái lưu lại trên quái tới khi hết lượt. */
export type EnemyStatusKind = Extract<StatusKind, 'burn' | 'poison' | 'freeze' | 'stun'>;
/** Trạng thái lưu lại trên hiệp sĩ. */
export type HeroStatusKind = Extract<StatusKind, 'haste'>;
export type DamageOverTimeKind = Extract<EnemyStatusKind, 'burn' | 'poison'>;
export type PreventingStatusKind = Extract<EnemyStatusKind, 'stun' | 'freeze'>;

export interface ActiveStatus<K extends StatusKind = StatusKind> {
  readonly kind: K;
  /** Số đòn đúng (hoặc lượt quái đánh với choáng/băng) còn lại. */
  readonly turns: number;
  /** Hệ số mạnh: bậc combo cao nhất nhân thêm. */
  readonly power: number;
}

// Tỉ lệ chiêu gây trạng thái theo bậc combo: chuỗi càng dài càng chắc chắn.
export const STATUS_CHANCE_BY_COMBO_TIER: Readonly<Record<ComboTier, number>> = { 1: 0, 2: 0.25, 3: 0.5, 4: 1, 5: 1 };
// Bậc combo cao nhất (10+) làm mọi trạng thái mạnh thêm 25%.
export const STATUS_POWER_BY_COMBO_TIER: Readonly<Record<ComboTier, number>> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1.25 };

// Đốt: sau mỗi đòn đúng, quái mất thêm 10% sát thương của đòn đó, trong 3 đòn.
export const BURN_DAMAGE_RATIO = 0.1;
// Độc: sau mỗi đòn đúng, quái mất 1,5% máu tối đa, trong 3 đòn; vẫn ăn khi trùm dựng khiên lửa.
export const POISON_MAX_HP_RATIO = 0.015;
export const DAMAGE_OVER_TIME_TURNS = 3;
// Đóng băng: đòn đúng kế tiếp mạnh thêm 25% rồi băng vỡ.
export const FREEZE_DAMAGE_BONUS = 0.25;
// Hút máu: hồi 15% sát thương gây ra. Hồi máu: hồi 5% máu tối đa.
export const LIFESTEAL_RATIO = 0.15;
export const HEAL_MAX_HP_RATIO = 0.05;
// Tăng tốc: cửa sổ nối combo dài thêm 1,5 giây, trong 3 đòn đúng.
export const HASTE_COMBO_WINDOW_BONUS_MS = 1_500;
export const HASTE_TURNS = 3;
/** Sát thương theo lượt không bao giờ tự hạ quái: đòn chiêu phải là đòn cuối. */
export const DAMAGE_OVER_TIME_MIN_HP = 1;

export function statusChanceFor(tier: ComboTier): number {
  return STATUS_CHANCE_BY_COMBO_TIER[tier];
}

export function statusPowerFor(tier: ComboTier): number {
  return STATUS_POWER_BY_COMBO_TIER[tier];
}

/** Số lượt của trạng thái lưu lại; trạng thái tức thì (hồi máu, hút máu, nguyền) trả 0. */
export function statusTurns(kind: StatusKind): number {
  if (kind === 'burn' || kind === 'poison') return DAMAGE_OVER_TIME_TURNS;
  if (kind === 'haste') return HASTE_TURNS;
  if (kind === 'freeze' || kind === 'stun') return 1;
  return 0;
}

export function isEnemyStatus(kind: StatusKind): kind is EnemyStatusKind {
  return kind === 'burn' || kind === 'poison' || kind === 'freeze' || kind === 'stun';
}

/** Trạng thái có cần đòn chiêu trúng (không bị khiên lửa chặn) mới có tác dụng. */
export function needsLandedHit(kind: StatusKind): boolean {
  return kind === 'burn' || kind === 'lifesteal';
}

/** Choáng/đóng băng làm quái mất lượt; trùm miễn nhiễm phần mất lượt. */
export function isPreventingStatus(kind: StatusKind): kind is PreventingStatusKind {
  return kind === 'stun' || kind === 'freeze';
}

function atLeastOne(value: number): number {
  return Math.max(1, Math.round(value));
}

/** Trạng thái tác dụng lên quái (áp sau khi biết quái còn sống); còn lại tác dụng lên hiệp sĩ. */
export function isEnemyTargeted(kind: StatusKind): boolean {
  return isEnemyStatus(kind) || kind === 'curse';
}

export const DAMAGE_OVER_TIME_STATUSES: readonly EnemyStatusKind[] = ['burn', 'poison'];
export const HERO_TIMED_STATUSES: readonly HeroStatusKind[] = ['haste'];

/** Sát thương một lượt của đốt/độc; trạng thái khác trả 0. `hitDamage` = null: đòn bị khiên lửa chặn, đốt không ăn. */
export function damageOverTimeTick(status: ActiveStatus, enemyMaxHp: number, hitDamage: number | null): number {
  if (status.kind === 'poison') return poisonTickDamage(enemyMaxHp, status.power);
  if (status.kind === 'burn' && hitDamage !== null) return burnTickDamage(hitDamage, status.power);
  return 0;
}

export function burnTickDamage(hitDamage: number, power: number): number {
  return atLeastOne(hitDamage * BURN_DAMAGE_RATIO * power);
}

export function poisonTickDamage(enemyMaxHp: number, power: number): number {
  return atLeastOne(enemyMaxHp * POISON_MAX_HP_RATIO * power);
}

export function freezeDamageFactor(power: number): number {
  return 1 + FREEZE_DAMAGE_BONUS * power;
}

export function lifestealAmount(damage: number, power: number): number {
  return Math.round(damage * LIFESTEAL_RATIO * power);
}

export function healAmount(heroMaxHp: number, power: number): number {
  return atLeastOne(heroMaxHp * HEAL_MAX_HP_RATIO * power);
}

export function hasteComboWindowBonusMs(statuses: readonly ActiveStatus[]): number {
  const haste = statuses.find((status) => status.kind === 'haste');
  return haste === undefined ? 0 : Math.round(HASTE_COMBO_WINDOW_BONUS_MS * haste.power);
}

/** Thêm hoặc làm mới trạng thái: mỗi loại chỉ một bản trên một mục tiêu, không cộng dồn. */
export function upsertStatus<K extends StatusKind>(statuses: readonly ActiveStatus<K>[], status: ActiveStatus<K>): ActiveStatus<K>[] {
  return [...statuses.filter((existing) => existing.kind !== status.kind), status];
}

export function findStatus<K extends StatusKind>(statuses: readonly ActiveStatus<K>[], kind: K): ActiveStatus<K> | undefined {
  return statuses.find((status) => status.kind === kind);
}

export function removeStatus<K extends StatusKind>(statuses: readonly ActiveStatus<K>[], kind: K): ActiveStatus<K>[] {
  return statuses.filter((status) => status.kind !== kind);
}

/** Bớt một lượt của các trạng thái thuộc `kinds`; trả danh sách mới và các loại vừa hết. */
export function decrementStatuses<K extends StatusKind>(
  statuses: readonly ActiveStatus<K>[],
  kinds: readonly K[],
): { readonly statuses: ActiveStatus<K>[]; readonly expired: K[] } {
  const expired: K[] = [];
  const next: ActiveStatus<K>[] = [];
  for (const status of statuses) {
    if (!kinds.includes(status.kind)) {
      next.push(status);
    } else if (status.turns <= 1) {
      expired.push(status.kind);
    } else {
      next.push({ ...status, turns: status.turns - 1 });
    }
  }
  return { statuses: next, expired };
}
