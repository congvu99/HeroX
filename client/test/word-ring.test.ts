import { describe, expect, it } from 'vitest';
import { RING_SIZE } from '@herox/shared';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/config/display';
import { arcButtonPoints, chooseRingLayout } from '../src/ui/word-ring';

describe('chooseRingLayout', () => {
  it('dùng cung khi nhãn ngắn', () => {
    expect(chooseRingLayout(5)).toBe('arc');
    expect(chooseRingLayout(9)).toBe('arc');
  });

  it('rớt về lưới khi nhãn quá dài', () => {
    expect(chooseRingLayout(10)).toBe('grid');
    expect(chooseRingLayout(14)).toBe('grid');
  });
});

describe('arcButtonPoints', () => {
  const center = { x: LOGICAL_WIDTH / 2, y: 390 };
  const points = arcButtonPoints(center, RING_SIZE);

  it('trả đúng số điểm', () => {
    expect(points).toHaveLength(RING_SIZE);
  });

  it('mọi điểm nằm ở nửa dưới / ngang tâm (không bao lên trên đầu hiệp sĩ)', () => {
    for (const point of points) {
      // Cung hướng xuống: y của mọi nút không cao hơn tâm (toạ độ màn: y lớn hơn là thấp hơn).
      expect(point.y).toBeGreaterThanOrEqual(center.y - 1);
    }
  });

  it('điểm trải đối xứng quanh trục dọc qua tâm', () => {
    const first = points[0];
    const last = points[points.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (first === undefined || last === undefined) return;
    // Hai nút đầu-cuối đối xứng qua x tâm.
    expect(first.x + last.x).toBeCloseTo(center.x * 2, 5);
    // Nút giữa gần trục dọc, thấp nhất (xa tâm nhất xuống dưới).
    const mid = points[Math.floor(points.length / 2)];
    expect(mid).toBeDefined();
    if (mid === undefined) return;
    expect(Math.abs(mid.x - center.x)).toBeLessThan(Math.abs(first.x - center.x));
  });

  it('điểm nằm trong khung', () => {
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(LOGICAL_WIDTH);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(LOGICAL_HEIGHT);
    }
  });
});
