/** Toán di chuyển thuần (không phụ thuộc Phaser): gộp bàn phím, joystick, chọn hướng nhìn. */

export interface MovementVector {
  readonly x: number;
  readonly y: number;
}

export interface DirectionKeys {
  readonly left: boolean;
  readonly right: boolean;
  readonly up: boolean;
  readonly down: boolean;
}

/** Hướng của sprite LPC: chỉ có 4 hàng hướng. */
export type Facing = 'down' | 'left' | 'right' | 'up';

export const ZERO_VECTOR: MovementVector = { x: 0, y: 0 };

/** Giữ độ lớn tối đa 1 để đi chéo không nhanh hơn đi thẳng. */
export function clampToUnit(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y);
  return length > 1 ? { x: vector.x / length, y: vector.y / length } : vector;
}

export function keyboardVector(keys: DirectionKeys): MovementVector {
  const x = Number(keys.right) - Number(keys.left);
  const y = Number(keys.down) - Number(keys.up);
  return clampToUnit({ x, y });
}

/**
 * Đổi độ lệch ngón tay so với tâm joystick thành vector 0..1.
 * Trong vùng chết trả 0 để chạm nhẹ không làm hero trượt; ngoài vùng chết tăng tuyến tính tới bán kính.
 */
export function joystickVector(offsetX: number, offsetY: number, radius: number, deadZoneRatio: number): MovementVector {
  const distance = Math.hypot(offsetX, offsetY);
  const deadZone = radius * deadZoneRatio;
  if (distance <= deadZone || radius <= 0) return ZERO_VECTOR;
  const strength = Math.min(1, (distance - deadZone) / (radius - deadZone));
  return { x: (offsetX / distance) * strength, y: (offsetY / distance) * strength };
}

/** Bàn phím và joystick cùng lúc: cộng lại rồi giới hạn độ lớn. */
export function combineMovement(first: MovementVector, second: MovementVector): MovementVector {
  return clampToUnit({ x: first.x + second.x, y: first.y + second.y });
}

/**
 * Sprite LPC chỉ có 4 hướng; đi chéo dùng hướng ngang (trục ngang thắng khi bằng nhau).
 * Đứng yên giữ hướng cũ.
 */
export function facingFromVector(vector: MovementVector, previous: Facing): Facing {
  if (vector.x === 0 && vector.y === 0) return previous;
  if (Math.abs(vector.x) >= Math.abs(vector.y)) return vector.x < 0 ? 'left' : 'right';
  return vector.y < 0 ? 'up' : 'down';
}
