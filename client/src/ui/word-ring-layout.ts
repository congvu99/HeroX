import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/display';

/**
 * Ô của vòng từ, tính theo pixel logic. Màn chơi nằm ngang (640×360) trên iPhone có zoom khoảng 1, nên ô cao 46 px
 * vẫn ≥ 44pt cho ngón tay (khuyến nghị của Apple).
 */
export const RING_SLOT_WIDTH = 104;
export const RING_SLOT_HEIGHT = 46;

export interface RingLayout {
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

/** Vòng từ chiếm nửa dưới màn, chừa nửa trên cho hiệp sĩ, quái và đề. */
export const DEFAULT_RING_LAYOUT: RingLayout = {
  centerX: LOGICAL_WIDTH / 2,
  centerY: 268,
  radiusX: 175,
  radiusY: 56,
};

export interface SlotPosition {
  readonly x: number;
  readonly y: number;
}

/** Tâm từng ô, xếp trên hình elip bắt đầu từ đỉnh, theo chiều kim đồng hồ. */
export function ringSlotPositions(count: number, layout: RingLayout = DEFAULT_RING_LAYOUT): SlotPosition[] {
  return Array.from({ length: count }, (_, slot) => {
    const angle = -Math.PI / 2 + (slot * 2 * Math.PI) / count;
    return {
      x: Math.round(layout.centerX + layout.radiusX * Math.cos(angle)),
      y: Math.round(layout.centerY + layout.radiusY * Math.sin(angle)),
    };
  });
}

/** Ô nằm trọn trong màn logic. */
export function isSlotOnScreen(position: SlotPosition): boolean {
  return (
    position.x - RING_SLOT_WIDTH / 2 >= 0 &&
    position.x + RING_SLOT_WIDTH / 2 <= LOGICAL_WIDTH &&
    position.y - RING_SLOT_HEIGHT / 2 >= 0 &&
    position.y + RING_SLOT_HEIGHT / 2 <= LOGICAL_HEIGHT
  );
}
