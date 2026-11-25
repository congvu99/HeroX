import { SKILL_MOVES, type SkillMove } from '../data/skill-moves.js';
import type { ComboTier } from './combo-tier.js';
import { SeededRandom } from './seeded-random.js';
import type { SkillKind } from './skill-kind.js';
import { statusChanceFor, statusPowerFor, type StatusKind } from './status-effects.js';

/**
 * Bốc chiêu dùng luồng ngẫu nhiên riêng, tách từ seed trận: thêm/bớt chiêu không làm đổi dãy đề từ
 * (luồng chính vẫn y như trước), mà server vẫn chạy lại được trận y hệt.
 */
const MOVE_STREAM_SALT = 0x9e3779b9;

export function initialMoveRngState(seed: number): number {
  return (seed ^ MOVE_STREAM_SALT) >>> 0;
}

const DECK_STREAM_SALT = 0x85ebca6b;
/**
 * Mỗi trận chỉ dùng tối đa 2 chiêu mỗi nhóm (loại + bậc combo), chọn theo seed: đủ đổi chiêu liên tục trong trận mà
 * máy yếu chỉ phải nạp ít atlas hiệu ứng; trận sau đổi seed nên lần lượt gặp hết các chiêu.
 */
export const DECK_MOVES_PER_GROUP = 2;

/** Bộ chiêu của trận, tất định theo seed (server và client dựng ra như nhau). */
export function buildBattleDeck(seed: number, catalog: readonly SkillMove[] = SKILL_MOVES): readonly SkillMove[] {
  const rng = new SeededRandom((seed ^ DECK_STREAM_SALT) >>> 0);
  const groups = new Map<string, SkillMove[]>();
  for (const move of catalog) {
    const key = `${move.kind}:${move.comboTier}`;
    groups.set(key, [...(groups.get(key) ?? []), move]);
  }
  return [...groups.values()].flatMap((group) => rng.shuffle(group).slice(0, DECK_MOVES_PER_GROUP));
}

export class SkillMoveCatalogError extends Error {
  constructor(kind: SkillKind) {
    super(`Không có chiêu nào cho loại ${kind}`);
    this.name = 'SkillMoveCatalogError';
  }
}

/** Nhóm chiêu của bậc gần nhất (không cao hơn `tier`) còn có chiêu, để danh mục thiếu bậc vẫn chạy. */
function groupFor(kind: SkillKind, tier: ComboTier, catalog: readonly SkillMove[]): readonly SkillMove[] {
  for (let current = tier; current >= 1; current -= 1) {
    const group = catalog.filter((move) => move.kind === kind && move.comboTier === current);
    if (group.length > 0) return group;
  }
  throw new SkillMoveCatalogError(kind);
}

/** Bốc ngẫu nhiên một chiêu trong nhóm (loại + bậc combo), tránh lặp chiêu vừa dùng của cùng loại. */
export function pickSkillMove(
  kind: SkillKind,
  tier: ComboTier,
  lastMoveId: string | undefined,
  rng: SeededRandom,
  catalog: readonly SkillMove[] = SKILL_MOVES,
): SkillMove {
  const group = groupFor(kind, tier, catalog);
  const fresh = group.filter((move) => move.id !== lastMoveId);
  const pool = fresh.length > 0 ? fresh : group;
  return pool[rng.nextInt(pool.length)] as SkillMove;
}

export interface StatusRoll {
  readonly kind: StatusKind;
  readonly power: number;
}

/** Chiêu có gây trạng thái lần này không. Chỉ bốc số khi tỉ lệ nằm giữa 0 và 1, để không tốn số ngẫu nhiên vô ích. */
export function rollMoveStatus(move: SkillMove, tier: ComboTier, rng: SeededRandom): StatusRoll | null {
  if (move.status === null) return null;
  const chance = statusChanceFor(tier);
  if (chance <= 0) return null;
  if (chance < 1 && !rng.chance(chance)) return null;
  return { kind: move.status, power: statusPowerFor(tier) };
}
