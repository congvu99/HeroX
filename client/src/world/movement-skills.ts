import {
  isMovementSkillUnlocked,
  MOVEMENT_SKILL_IDS,
  MOVEMENT_SKILLS,
  type MovementSkillId,
  type PartOfSpeechGroup,
} from '@herox/shared';
import type { Facing, MovementVector } from '../input/movement-vector';
import { isSolidCell, type CollisionGrid } from '../maps/ldtk-loader';

/** Lướt: tốc độ gấp ~3,3 lần đi bộ trong 180 ms (khoảng 2 ô), không trúng đòn trong lúc lướt. */
export const DASH_SPEED = 360;
export const DASH_DURATION_MS = 180;
/** Thuấn bộ tối đa 3 ô, tối thiểu 1 ô (ngắn hơn thì không đáng tốn hồi chiêu). */
export const BLINK_MAX_DISTANCE = 96;
export const BLINK_MIN_DISTANCE = 32;
/** Bước dò điểm đáp; nhỏ hơn bề rộng hitbox chân (20 px) để không nhảy qua khe hẹp. */
export const BLINK_SCAN_STEP = 4;

const FACING_VECTORS: Readonly<Record<Facing, MovementVector>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function facingVector(facing: Facing): MovementVector {
  return FACING_VECTORS[facing];
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Điểm đáp xa nhất (≤ `BLINK_MAX_DISTANCE`) theo `direction` mà hitbox đứng được; vượt được tường mỏng, khe hẹp.
 * Trả `null` khi không có chỗ đáp cách ít nhất `BLINK_MIN_DISTANCE`.
 */
export function findBlinkDestination(origin: Point, direction: MovementVector, isFree: (point: Point) => boolean): Point | null {
  for (let distance = BLINK_MAX_DISTANCE; distance >= BLINK_MIN_DISTANCE; distance -= BLINK_SCAN_STEP) {
    const point = { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance };
    if (isFree(point)) return point;
  }
  return null;
}

/** Kỹ năng di chuyển đã mở, hồi chiêu và trạng thái lướt; thời gian tính bằng ms của game loop. */
export class MovementSkillState {
  private readonly readyAtMs = new Map<MovementSkillId, number>();
  private dashEndsAtMs = Number.NEGATIVE_INFINITY;

  constructor(private readonly unlocked: ReadonlySet<MovementSkillId>) {}

  isUnlocked(id: MovementSkillId): boolean {
    return this.unlocked.has(id);
  }

  canUse(id: MovementSkillId, nowMs: number): boolean {
    return this.isUnlocked(id) && nowMs >= (this.readyAtMs.get(id) ?? Number.NEGATIVE_INFINITY);
  }

  /** Bắt đầu hồi chiêu; trả `false` khi chưa mở hoặc đang hồi. */
  use(id: MovementSkillId, nowMs: number): boolean {
    if (!this.canUse(id, nowMs)) return false;
    this.readyAtMs.set(id, nowMs + MOVEMENT_SKILLS[id].cooldownMs);
    if (id === 'dash') this.dashEndsAtMs = nowMs + DASH_DURATION_MS;
    return true;
  }

  isDashing(nowMs: number): boolean {
    return nowMs < this.dashEndsAtMs;
  }

  /** Khung bất tử của lướt: trùng thời gian lướt. */
  isInvulnerable(nowMs: number): boolean {
    return this.isDashing(nowMs);
  }

  /** Tỉ lệ hồi chiêu còn lại 0..1 để vẽ nút. */
  cooldownRatio(id: MovementSkillId, nowMs: number): number {
    const remaining = (this.readyAtMs.get(id) ?? 0) - nowMs;
    return remaining > 0 ? Math.min(1, remaining / MOVEMENT_SKILLS[id].cooldownMs) : 0;
  }
}

/**
 * Kỹ năng di chuyển đã mở theo tiến độ học. `byPos` `null` (dev vào map thử không có phiên LingoBrain)
 * thì mở hết khi `unlockAllWithoutProgress` bật, để thử được kỹ năng.
 */
export function unlockedMovementSkills(
  byPos: Readonly<Record<PartOfSpeechGroup, number>> | null,
  unlockAllWithoutProgress: boolean,
): ReadonlySet<MovementSkillId> {
  if (byPos === null) return new Set(unlockAllWithoutProgress ? MOVEMENT_SKILL_IDS : []);
  return new Set(MOVEMENT_SKILL_IDS.filter((id) => isMovementSkillUnlocked(id, byPos)));
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Hitbox đứng được ở `area`: nằm trong level, không đè ô chắn của lưới va chạm, không đè vật cản (NPC, rương).
 * Dùng để chọn điểm đáp của thuấn bộ, nên chỉ cần đúng theo ô lưới, không cần chính xác như Arcade Physics.
 */
export function isAreaWalkable(area: Rect, level: { readonly widthPx: number; readonly heightPx: number }, grid: CollisionGrid | null, blockers: readonly Rect[]): boolean {
  if (area.x < 0 || area.y < 0 || area.x + area.width > level.widthPx || area.y + area.height > level.heightPx) return false;
  if (blockers.some((blocker) => rectsOverlap(area, blocker))) return false;
  if (grid === null) return true;
  const firstCellX = Math.floor((area.x - grid.offsetX) / grid.gridSize);
  const lastCellX = Math.floor((area.x + area.width - 1 - grid.offsetX) / grid.gridSize);
  const firstCellY = Math.floor((area.y - grid.offsetY) / grid.gridSize);
  const lastCellY = Math.floor((area.y + area.height - 1 - grid.offsetY) / grid.gridSize);
  for (let cellY = firstCellY; cellY <= lastCellY; cellY += 1) {
    for (let cellX = firstCellX; cellX <= lastCellX; cellX += 1) {
      if (isSolidCell(grid, cellX, cellY)) return false;
    }
  }
  return true;
}
