import { describe, expect, it } from 'vitest';
import { MOVEMENT_SKILLS } from '@herox/shared';
import type { CollisionGrid } from '../src/maps/ldtk-loader';
import {
  BLINK_MAX_DISTANCE,
  DASH_DURATION_MS,
  facingVector,
  findBlinkDestination,
  isAreaWalkable,
  MovementSkillState,
  unlockedMovementSkills,
} from '../src/world/movement-skills';

const NO_WORDS = { verb: 0, noun: 0, adj: 0, adv: 0, prep: 0, other: 0 };

/** Lưới 10×3 ô 32 px, cột 3 là tường mỏng một ô. */
function wallGrid(): CollisionGrid {
  const widthCells = 10;
  const heightCells = 3;
  const cells = new Uint8Array(widthCells * heightCells);
  for (let cellY = 0; cellY < heightCells; cellY += 1) cells[cellY * widthCells + 3] = 1;
  return { gridSize: 32, offsetX: 0, offsetY: 0, widthCells, heightCells, cells };
}

const LEVEL = { widthPx: 320, heightPx: 96 };
const FEET = { width: 20, height: 12 };

/** Hitbox chân đặt tại điểm chân (giữa đáy). */
function feetAt(point: { x: number; y: number }) {
  return { x: point.x - FEET.width / 2, y: point.y - FEET.height, ...FEET };
}

describe('MovementSkillState', () => {
  it('kỹ năng chưa mở thì không dùng được', () => {
    const skills = new MovementSkillState(new Set(['dash']));
    expect(skills.use('blink', 0)).toBe(false);
    expect(skills.use('dash', 0)).toBe(true);
  });

  it('lướt có khung bất tử đúng thời gian lướt, rồi hồi chiêu', () => {
    const skills = new MovementSkillState(new Set(['dash']));
    skills.use('dash', 1_000);
    expect(skills.isInvulnerable(1_000 + DASH_DURATION_MS - 1)).toBe(true);
    expect(skills.isDashing(1_000 + DASH_DURATION_MS)).toBe(false);
    expect(skills.use('dash', 1_100)).toBe(false);
    expect(skills.cooldownRatio('dash', 1_000)).toBe(1);
    expect(skills.cooldownRatio('dash', 1_000 + MOVEMENT_SKILLS.dash.cooldownMs)).toBe(0);
    expect(skills.use('dash', 1_000 + MOVEMENT_SKILLS.dash.cooldownMs)).toBe(true);
  });

  it('mở theo số trạng từ + giới từ; dev không có tiến độ thì mở hết', () => {
    expect([...unlockedMovementSkills({ ...NO_WORDS, adv: 20 }, false)]).toEqual(['dash', 'blink']);
    expect([...unlockedMovementSkills({ ...NO_WORDS, adv: 5 }, false)]).toEqual(['dash']);
    expect([...unlockedMovementSkills(NO_WORDS, true)]).toEqual([]);
    expect([...unlockedMovementSkills(null, true)]).toEqual(['dash', 'blink']);
    expect([...unlockedMovementSkills(null, false)]).toEqual([]);
  });
});

describe('thuấn bộ', () => {
  const grid = wallGrid();
  const isFree = (point: { x: number; y: number }) => isAreaWalkable(feetAt(point), LEVEL, grid, []);

  it('vượt tường mỏng, đáp xa nhất có thể', () => {
    const destination = findBlinkDestination({ x: 64, y: 60 }, facingVector('right'), isFree);
    expect(destination).toEqual({ x: 64 + BLINK_MAX_DISTANCE, y: 60 });
  });

  it('điểm xa nhất kẹt trong tường thì lùi lại tới chỗ đứng được', () => {
    // Đứng ở x=30: đáp 126 thì hitbox đè cột tường 96..127, phải lùi về trước tường.
    const destination = findBlinkDestination({ x: 30, y: 60 }, facingVector('right'), isFree);
    expect(destination).not.toBeNull();
    expect(isFree(destination ?? { x: 0, y: 0 })).toBe(true);
    expect((destination?.x ?? 0) + FEET.width / 2).toBeLessThanOrEqual(96);
  });

  it('không có chỗ đáp (sát mép level) thì trả null', () => {
    expect(findBlinkDestination({ x: 300, y: 60 }, facingVector('right'), isFree)).toBeNull();
  });

  it('vật cản (NPC, rương) chặn điểm đáp', () => {
    const blocker = { x: 150, y: 40, width: 40, height: 30 };
    expect(isAreaWalkable(feetAt({ x: 170, y: 60 }), LEVEL, grid, [blocker])).toBe(false);
    expect(isAreaWalkable(feetAt({ x: 220, y: 60 }), LEVEL, grid, [blocker])).toBe(true);
    expect(isAreaWalkable(feetAt({ x: 220, y: 60 }), LEVEL, null, [])).toBe(true);
  });
});
