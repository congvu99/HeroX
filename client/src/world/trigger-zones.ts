import type { Rect } from './movement-skills';

/** Hai hình chữ nhật chồng lên nhau (chạm mép không tính). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Vùng kích hoạt khi hero bước vào (vùng trận, cửa công trình). Chỉ kích hoạt lại sau khi hero đã rời mọi vùng,
 * để vừa thoát trận hay đóng panel mà vẫn đứng trong vùng thì không bị kéo vào lại.
 */
export class TriggerZones<T> {
  private armed = false;

  constructor(private readonly zones: readonly { readonly rect: Rect; readonly value: T }[]) {}

  /** Gọi mỗi frame với hitbox chân hero; trả vùng vừa bước vào, hoặc null. */
  enter(body: Rect): T | null {
    const zone = this.zones.find((candidate) => rectsOverlap(body, candidate.rect));
    if (zone === undefined) {
      this.armed = true;
      return null;
    }
    if (!this.armed) return null;
    this.armed = false;
    return zone.value;
  }
}

/** Cửa ở cạnh dưới nền móng: lấn vào móng một chút và nhô ra ngoài để hero đứng sát tường là vào được. */
const DOOR_INSET = 4;
const DOOR_REACH = 16;

export function buildingDoorRect(building: Rect): Rect {
  return { x: building.x, y: building.y + building.height - DOOR_INSET, width: building.width, height: DOOR_INSET + DOOR_REACH };
}
