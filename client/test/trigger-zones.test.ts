import { describe, expect, it } from 'vitest';
import { buildingDoorRect, rectsOverlap, TriggerZones } from '../src/world/trigger-zones';

const FORGE = { x: 64, y: 64, width: 96, height: 64 };
const HERO_SIZE = { width: 20, height: 12 };

describe('TriggerZones', () => {
  it('kích hoạt khi bước vào, không kích hoạt lại tới khi đã rời vùng', () => {
    const zones = new TriggerZones([{ rect: buildingDoorRect(FORGE), value: 'forge' }]);
    const outside = { x: 100, y: 200, ...HERO_SIZE };
    // Hero đứng sát chân tường công trình (đáy hitbox chạm mép móng).
    const atDoor = { x: 100, y: 128 - HERO_SIZE.height, ...HERO_SIZE };
    expect(zones.enter(outside)).toBeNull();
    expect(zones.enter(atDoor)).toBe('forge');
    expect(zones.enter(atDoor)).toBeNull();
    expect(zones.enter(outside)).toBeNull();
    expect(zones.enter(atDoor)).toBe('forge');
  });

  it('vừa xuất hiện trong vùng thì chưa kích hoạt', () => {
    const zones = new TriggerZones([{ rect: buildingDoorRect(FORGE), value: 'forge' }]);
    expect(zones.enter({ x: 100, y: 120, ...HERO_SIZE })).toBeNull();
  });

  it('cửa nằm ở cạnh dưới nền móng, chạm mép không tính', () => {
    expect(buildingDoorRect(FORGE)).toEqual({ x: 64, y: 124, width: 96, height: 20 });
    expect(rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
  });
});
