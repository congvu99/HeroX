import { describe, expect, it } from 'vitest';
import type { MapTile, MapTileLayer } from '../maps/ldtk-loader';
import { tileIndexForAtlas } from './chapter-tile-names';
import { swayAngle, swayPhase, TREE_SWAY_MAX_ANGLE, treeIndicesFor, treeTilesInLayers } from './tree-sway';

function tile(cellX: number, cellY: number, tileIndex: number): MapTile {
  return { cellX, cellY, tileIndex, flipX: false, flipY: false, alpha: 1 };
}

function layer(stackIndex: number, tiles: MapTile[]): MapTileLayer {
  return { identifier: 'Decor', tilesetUid: 1, gridSize: 32, widthCells: 4, heightCells: 4, offsetX: 0, offsetY: 0, opacity: 1, stackIndex, tiles };
}

describe('treeIndicesFor', () => {
  it('lấy mọi tên bắt đầu bằng tree_, bỏ tên khác', () => {
    expect([...treeIndicesFor({ grass: 0, tree_pine: 7, tree_autumn: 8, bush: 11, street_tree: 12 })].sort()).toEqual([7, 8]);
  });

  it('bảng rỗng trả tập rỗng', () => {
    expect(treeIndicesFor({}).size).toBe(0);
  });

  it('đọc được cây từ bảng tên thật của mọi atlas chương', () => {
    for (const chapter of [1, 2, 3, 4, 5]) {
      const table = tileIndexForAtlas(`../tilesets/chapter-${chapter}.png`);
      expect(table, `chapter-${chapter}`).toBeDefined();
      expect(treeIndicesFor(table ?? {}).size).toBeGreaterThan(0);
    }
  });
});

describe('tileIndexForAtlas', () => {
  it('nhận đường dẫn kiểu Windows, bỏ qua tileset không thuộc atlas chương', () => {
    expect(tileIndexForAtlas('..\\tilesets\\chapter-1.png')).toBeDefined();
    expect(tileIndexForAtlas('../tilesets/placeholder-dungeon.png')).toBeUndefined();
  });
});

describe('treeTilesInLayers', () => {
  const trees = new Set([7, 8]);

  it('lọc đúng ô cây, giữ layer chứa ô, quét cả lớp chồng', () => {
    const base = layer(0, [tile(0, 0, 1), tile(1, 0, 7)]);
    const stacked = layer(1, [tile(2, 1, 8), tile(3, 3, 2)]);
    const found = treeTilesInLayers([base, stacked], trees);
    expect(found.map(({ layer: owner, tile: cell }) => [owner.stackIndex, cell.cellX, cell.cellY, cell.tileIndex])).toEqual([
      [0, 1, 0, 7],
      [1, 2, 1, 8],
    ]);
  });

  it('không có layer, không có cây hoặc tập chỉ số rỗng thì trả rỗng', () => {
    expect(treeTilesInLayers([], trees)).toEqual([]);
    expect(treeTilesInLayers([layer(0, [tile(0, 0, 1)])], trees)).toEqual([]);
    expect(treeTilesInLayers([layer(0, [tile(0, 0, 7)])], new Set())).toEqual([]);
  });
});

describe('swayPhase / swayAngle', () => {
  it('pha tất định trong [0, 1) và khác nhau giữa ô cạnh nhau', () => {
    const phases = [swayPhase(0, 0), swayPhase(1, 0), swayPhase(0, 1), swayPhase(5, 9)];
    for (const phase of phases) {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
    expect(swayPhase(5, 9)).toBe(phases[3]);
    expect(new Set(phases).size).toBe(phases.length);
  });

  it('góc luôn trong biên độ cho phép và thật sự dao động', () => {
    const angles = Array.from({ length: 400 }, (_, step) => swayAngle(step * 37, 0.3));
    for (const angle of angles) expect(Math.abs(angle)).toBeLessThanOrEqual(TREE_SWAY_MAX_ANGLE);
    expect(Math.max(...angles)).toBeGreaterThan(TREE_SWAY_MAX_ANGLE / 2);
    expect(Math.min(...angles)).toBeLessThan(-TREE_SWAY_MAX_ANGLE / 2);
  });

  it('hai cây khác pha không nghiêng y hệt nhau cùng lúc', () => {
    expect(swayAngle(1000, 0.1)).not.toBeCloseTo(swayAngle(1000, 0.6), 3);
  });
});
