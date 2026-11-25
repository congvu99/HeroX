import { describe, expect, it } from 'vitest';
import { computeDisplayZoom, computeViewSize, MAX_VIEW_HEIGHT, MAX_VIEW_WIDTH } from '../src/config/display';
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
  it('khung dọc khớp bội số nguyên thì lấy zoom số nguyên', () => {
    // 1080×1560 (DPR 1): chiều cao chia đúng 2 lần 780, chiều rộng dư → zoom 2.
    expect(computeDisplayZoom(1080, 1560)).toBe(2);
    // 360×780 (DPR 1): đúng một lần kích thước logic → zoom 1.
    expect(computeDisplayZoom(360, 780)).toBe(1);
  });

  it('màn rất rộng (desktop) bị giới hạn theo chiều cao, có viền hai bên', () => {
    // Khung dọc trên desktop ngang: chiều cao quyết định zoom, hai bên là viền đen.
    expect(computeDisplayZoom(1920, 1080)).toBeCloseTo(1080 / 780);
  });

  it('iPhone 14 Plus dọc (430×932) dùng zoom lẻ để không còn viền đen lớn', () => {
    expect(computeDisplayZoom(430, 932)).toBeCloseTo(Math.min(430 / 360, 932 / 780));
  });

  it('iPhone 14 Plus DPR 3: không làm tròn integer gây viền đen 4 phía, lấp đầy bằng FIT', () => {
    // Khung game sau safe-area ~430×839. FIT theo chiều cao ≈ 1,075; làm tròn integer (3,23→3) chỉ lấp ~93%
    // nên phải bỏ, dùng FIT để canvas chạm biên (hết đen 4 phía). Zoom đúng bằng FIT, không bị kéo xuống 1,0.
    const fit = Math.min(430 / 360, 839 / 780);
    expect(computeDisplayZoom(430, 839, 3)).toBeCloseTo(fit);
    expect(computeDisplayZoom(430, 839, 3)).toBeGreaterThan(1);
  });

  it('làm tròn theo pixel thiết bị khi màn hình có DPR lẻ', () => {
    // 900×1248 px CSS, DPR 1,25: chiều cao giới hạn, mỗi pixel logic đúng 2 px thiết bị.
    expect(computeDisplayZoom(900, 1248, 1.25)).toBeCloseTo(1.6);
    // Zoom × DPR là số nguyên px thiết bị (không còn lẻ).
    expect(computeDisplayZoom(900, 1248, 1.25) * 1.25).toBe(2);
  });

  it('iPhone dọc DPR 3 (360×780) cho số nguyên px thiết bị', () => {
    expect(computeDisplayZoom(360, 780, 3) * 3).toBe(3);
  });

  it('kích thước 0 (chưa layout) không làm hỏng zoom', () => {
    expect(computeDisplayZoom(0, 0)).toBe(1);
  });
});

describe('computeViewSize', () => {
  it('iPhone trong Safari (khung ngang hơn 360:780) nới chiều rộng để canvas lấp hết, không viền hai bên', () => {
    // Vùng game ~440×825 pt (iPhone 16 Pro Max, Safari): giữ cao 780, rộng theo tỉ lệ màn.
    const view = computeViewSize(440, 825);
    expect(view).toEqual({ width: 416, height: 780 });
    expect(computeDisplayZoom(440, 825, 3, view) * view.width).toBeCloseTo(440, 0);
  });

  it('màn dọc hơn 360:780 nới chiều cao, giữ rộng 360', () => {
    expect(computeViewSize(360, 900)).toEqual({ width: 360, height: 900 });
  });

  it('đúng tỉ lệ thiết kế thì giữ nguyên 360×780', () => {
    expect(computeViewSize(720, 1560)).toEqual({ width: 360, height: 780 });
  });

  it('desktop ngang chỉ nới tới trần, phần còn lại để viền', () => {
    expect(computeViewSize(1920, 1080)).toEqual({ width: MAX_VIEW_WIDTH, height: 780 });
    expect(computeViewSize(300, 2000).height).toBe(MAX_VIEW_HEIGHT);
  });

  it('chênh lệch luôn chẵn để khung thiết kế căn giữa đúng pixel', () => {
    const view = computeViewSize(431, 833);
    expect((view.width - 360) % 2).toBe(0);
    expect((view.height - 780) % 2).toBe(0);
  });

  it('chưa layout (0×0) trả khung thiết kế', () => {
    expect(computeViewSize(0, 0)).toEqual({ width: 360, height: 780 });
  });
});
