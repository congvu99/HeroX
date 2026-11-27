import type { MapTile, MapTileLayer } from '../maps/ldtk-loader';

/** Tên tile cây trong `chapter-N-tiles.json` đều bắt đầu bằng tiền tố này (`tree_pine`, `tree_autumn`...). */
export const TREE_TILE_PREFIX = 'tree_';

/** Biên độ nghiêng tối đa của ngọn cây (độ): đủ thấy tán "sống", không làm rối mắt khi gõ từ. */
export const TREE_SWAY_MAX_ANGLE = 2.4;
/** Tần số dao động chính (rad/ms), chu kỳ khoảng 2,4 giây. */
const SWAY_SPEED = 0.0026;
/** Gió thổi theo đợt: biên độ chung lên xuống chậm, chu kỳ khoảng 9 giây. */
const GUST_SPEED = 0.0007;
/** Phần biên độ luôn giữ khi gió lặng (0..1); phần còn lại tăng giảm theo đợt gió. */
const GUST_FLOOR = 0.6;
/** Mỗi cây dao động nhanh chậm khác nhau tối đa ±15% để hàng cây không đều tăm tắp. */
const SPEED_SPREAD = 0.15;

/** Một ô cây trên bản đồ: tile kèm layer chứa nó (để tính toạ độ thế giới, tên lớp tilemap). */
export interface TreeTile {
  readonly layer: MapTileLayer;
  readonly tile: MapTile;
}

/** Chỉ số atlas của mọi tile cây, suy từ bảng `tên tile → chỉ số` của chương. */
export function treeIndicesFor(tileIndexByName: Readonly<Record<string, number>>): ReadonlySet<number> {
  const indices = new Set<number>();
  for (const [name, index] of Object.entries(tileIndexByName)) {
    if (name.startsWith(TREE_TILE_PREFIX)) indices.add(index);
  }
  return indices;
}

/** Mọi ô cây trong các layer tile (gồm cả lớp con chồng `stackIndex` > 0). */
export function treeTilesInLayers(layers: readonly MapTileLayer[], treeIndices: ReadonlySet<number>): TreeTile[] {
  if (treeIndices.size === 0) return [];
  const result: TreeTile[] = [];
  for (const layer of layers) {
    for (const tile of layer.tiles) {
      if (treeIndices.has(tile.tileIndex)) result.push({ layer, tile });
    }
  }
  return result;
}

/** Vị trí gốc cây (giữa cạnh đáy ô, toạ độ thế giới) và độ mờ hiển thị giống hệt tile gốc. */
export function treeImagePlacement({ layer, tile }: TreeTile): { readonly x: number; readonly y: number; readonly alpha: number } {
  return {
    x: layer.offsetX + (tile.cellX + 0.5) * layer.gridSize,
    y: layer.offsetY + (tile.cellY + 1) * layer.gridSize,
    // Tile gốc chịu alpha riêng của ô nhân với opacity của cả layer.
    alpha: tile.alpha * layer.opacity,
  };
}

/** Pha dao động tất định theo ô (0..1): cây cạnh nhau lệch nhịp, mỗi lần mở map vẫn giống nhau. */
export function swayPhase(cellX: number, cellY: number): number {
  const hash = Math.sin(cellX * 12.9898 + cellY * 78.233) * 43_758.5453;
  return hash - Math.floor(hash);
}

/**
 * Góc nghiêng (độ) của một cây tại thời điểm `timeMs`: dao động sin lệch pha theo cây,
 * nhân với đợt gió chung chậm để cả rừng cùng "thở" theo gió. Luôn trong ±`TREE_SWAY_MAX_ANGLE`.
 */
export function swayAngle(timeMs: number, phase: number): number {
  const speed = SWAY_SPEED * (1 + (phase - 0.5) * 2 * SPEED_SPREAD);
  const gust = GUST_FLOOR + (1 - GUST_FLOOR) * (0.5 + 0.5 * Math.sin(timeMs * GUST_SPEED));
  return Math.sin(timeMs * speed + phase * Math.PI * 2) * gust * TREE_SWAY_MAX_ANGLE;
}
