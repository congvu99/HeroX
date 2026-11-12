import { describe, expect, it } from 'vitest';
import { RING_SIZE } from '@herox/shared';
import { isSlotOnScreen, RING_SLOT_HEIGHT, RING_SLOT_WIDTH, ringSlotPositions } from '../src/ui/word-ring-layout';

/** 44pt theo khuyến nghị chạm của Apple; màn ngang iPhone có zoom logic → CSS khoảng 1. */
const MIN_TOUCH_SIZE = 44;

describe('word ring layout', () => {
  const slots = ringSlotPositions(RING_SIZE);

  it('6 ô nằm trọn trong màn', () => {
    expect(slots).toHaveLength(RING_SIZE);
    expect(slots.every(isSlotOnScreen)).toBe(true);
  });

  it('ô đủ lớn cho ngón tay', () => {
    expect(Math.min(RING_SLOT_WIDTH, RING_SLOT_HEIGHT)).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
  });

  it('các ô không chồng nhau', () => {
    for (const [index, a] of slots.entries()) {
      for (const b of slots.slice(index + 1)) {
        const overlap = Math.abs(a.x - b.x) < RING_SLOT_WIDTH && Math.abs(a.y - b.y) < RING_SLOT_HEIGHT;
        expect(overlap).toBe(false);
      }
    }
  });
});
