import { describe, expect, it } from 'vitest';
import { computeDisplayZoom } from '../src/config/display';
import {
  combineMovement,
  facingFromVector,
  joystickVector,
  keyboardVector,
} from '../src/input/movement-vector';

const NO_KEYS = { left: false, right: false, up: false, down: false };

describe('keyboardVector', () => {
  it('đi chéo có độ lớn 1, không nhanh hơn đi thẳng', () => {
    const diagonal = keyboardVector({ ...NO_KEYS, right: true, down: true });
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(keyboardVector({ ...NO_KEYS, left: true })).toEqual({ x: -1, y: 0 });
  });

  it('hai phím ngược chiều triệt tiêu', () => {
    expect(keyboardVector({ ...NO_KEYS, left: true, right: true })).toEqual({ x: 0, y: 0 });
  });
});

describe('joystickVector', () => {
  it('vùng chết trả 0, kéo quá bán kính giới hạn ở 1', () => {
    expect(joystickVector(3, 0, 34, 0.18)).toEqual({ x: 0, y: 0 });
    const far = joystickVector(0, -200, 34, 0.18);
    expect(far.x).toBeCloseTo(0);
    expect(far.y).toBeCloseTo(-1);
  });

  it('tăng tuyến tính giữa vùng chết và bán kính', () => {
    const half = joystickVector(20, 0, 30, 1 / 3);
    expect(half.x).toBeCloseTo(0.5);
  });
});

describe('combineMovement', () => {
  it('cộng bàn phím và joystick rồi giới hạn độ lớn', () => {
    const combined = combineMovement({ x: 1, y: 0 }, { x: 0, y: 1 });
    expect(Math.hypot(combined.x, combined.y)).toBeCloseTo(1);
  });
});

describe('facingFromVector', () => {
  it('đi chéo dùng hướng ngang; đứng yên giữ hướng cũ', () => {
    expect(facingFromVector({ x: 0.7, y: -0.7 }, 'down')).toBe('right');
    expect(facingFromVector({ x: -0.2, y: 0.9 }, 'left')).toBe('down');
    expect(facingFromVector({ x: 0, y: -1 }, 'down')).toBe('up');
    expect(facingFromVector({ x: 0, y: 0 }, 'left')).toBe('left');
  });
});

describe('computeDisplayZoom', () => {
  it('màn PC lấy zoom số nguyên', () => {
    expect(computeDisplayZoom(1920, 1080)).toBe(3);
    expect(computeDisplayZoom(1366, 768)).toBe(2);
  });

  it('iPhone 12 ngang (844×390 trừ safe-area) dùng zoom 1 vì lấp trên 85%', () => {
    expect(computeDisplayZoom(750, 390)).toBe(1);
  });

  it('iPhone dọc dùng zoom lẻ để không còn viền đen lớn', () => {
    expect(computeDisplayZoom(390, 800)).toBeCloseTo(390 / 640);
  });

  it('làm tròn theo pixel thiết bị khi màn hình có DPR lẻ', () => {
    // Laptop 1920×1080 scale 125% → 1536×864 px CSS: mỗi pixel logic đúng 3 px thiết bị.
    expect(computeDisplayZoom(1536, 864, 1.25)).toBeCloseTo(2.4);
    // Không làm tròn theo px CSS (2) vì sẽ ra 2,5 px thiết bị.
    expect(computeDisplayZoom(1536, 864, 1.25) * 1.25).toBe(3);
  });

  it('iPhone 12 ngang DPR 3 (750×369) cho số nguyên px thiết bị', () => {
    expect(computeDisplayZoom(750, 369, 3) * 3).toBe(3);
  });

  it('kích thước 0 (chưa layout) không làm hỏng zoom', () => {
    expect(computeDisplayZoom(0, 0)).toBe(1);
  });
});
