import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CollisionGrid, MapTileLayer } from '../src/maps/ldtk-loader';
import { findTileGlows, flickerScale, glowByTileIndex, solidRuns, type TileGlowRect } from '../src/render/golden-hour-layout';

const readJson = <T>(relPath: string): T => JSON.parse(readFileSync(new URL(relPath, import.meta.url), 'utf8')) as T;
const TILE_INDEX = readJson<Record<string, number>>('../../assets/tilesets/chapter-1-tiles.json');
const TILE_GLOW = readJson<Record<string, TileGlowRect>>('../../assets/tilesets/chapter-1-glow.json');

const WINDOW: TileGlowRect = { x: 6, y: 8, width: 20, height: 18, strength: 1 };

function layer(gridSize: number, tiles: readonly [number, number, number][]): MapTileLayer {
  return {
    identifier: 'Decor', tilesetUid: 1, gridSize, widthCells: 10, heightCells: 10, offsetX: 0, offsetY: 0, opacity: 1, stackIndex: 0,
    tiles: tiles.map(([cellX, cellY, tileIndex]) => ({ cellX, cellY, tileIndex, flipX: false, flipY: false, alpha: 1 })),
  };
}

describe('golden-hour-layout', () => {
  it('mọi tile phát sáng trong chapter-1-glow.json có trong atlas, cường độ trong 0..1, nằm trong ô 32 px', () => {
    expect(Object.keys(TILE_GLOW).length).toBeGreaterThan(0);
    for (const [name, rect] of Object.entries(TILE_GLOW)) {
      expect(TILE_INDEX[name], name).toBeTypeOf('number');
      expect(rect.strength).toBeGreaterThan(0);
      expect(rect.strength).toBeLessThanOrEqual(1);
      expect(rect.x + rect.width).toBeLessThanOrEqual(32);
      expect(rect.y + rect.height).toBeLessThanOrEqual(32);
    }
  });

  it('ghép tên → chỉ số, bỏ tên không có trong atlas', () => {
    const map = glowByTileIndex({ window: 7, door: 9 }, { window: WINDOW, ghost: WINDOW });
    expect([...map.keys()]).toEqual([7]);
  });

  it('đổi ô cửa sổ ra toạ độ thế giới, co giãn theo cỡ lưới, bỏ tile thường', () => {
    const glows = new Map([[7, WINDOW]]);
    expect(findTileGlows([layer(32, [[2, 3, 7], [4, 4, 1]])], glows)).toEqual([{ x: 70, y: 104, width: 20, height: 18, strength: 1 }]);
    expect(findTileGlows([layer(16, [[1, 0, 7]])], glows)).toEqual([{ x: 19, y: 4, width: 10, height: 9, strength: 1 }]);
  });

  it('gộp ô chắn liền nhau theo hàng thành dải', () => {
    const collision: CollisionGrid = {
      gridSize: 32, offsetX: 0, offsetY: 0, widthCells: 4, heightCells: 2,
      cells: Uint8Array.from([1, 1, 0, 1, 0, 0, 0, 0]),
    };
    expect(solidRuns(collision)).toEqual([
      { x: 0, y: 0, width: 64, height: 32 },
      { x: 96, y: 0, width: 32, height: 32 },
    ]);
  });

  it('đuốc chập chờn quanh 1 trong biên độ', () => {
    for (let time = 0; time < 2000; time += 97) {
      const scale = flickerScale(time, 1.7, 0.06, 0.012);
      expect(scale).toBeGreaterThanOrEqual(0.94);
      expect(scale).toBeLessThanOrEqual(1.06);
    }
  });
});
