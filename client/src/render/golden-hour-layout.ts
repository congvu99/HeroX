import type { CollisionGrid, MapTileLayer } from '../maps/ldtk-loader';

/** Cỡ ô mà vùng sáng trong `chapter-1-glow.json` được đo theo. */
export const GLOW_CELL_PX = 32;

/** Vùng phát sáng trong một ô tile (pixel trong ô), sinh bởi `client/scripts/generate-chapter-1.mjs`. */
export interface TileGlowRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 0..1: cửa sổ sáng nhất, cửa và lòng cổng dịu hơn. */
  readonly strength: number;
}

/** Vùng sáng đặt trên bản đồ (pixel thế giới). */
export interface WorldGlow {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly strength: number;
}

/** Ghép `tên tile → chỉ số atlas` với `tên tile → vùng sáng` thành `chỉ số atlas → vùng sáng`. */
export function glowByTileIndex(
  tileIndexByName: Readonly<Record<string, number>>,
  glowByName: Readonly<Record<string, TileGlowRect>>,
): ReadonlyMap<number, TileGlowRect> {
  const result = new Map<number, TileGlowRect>();
  for (const [name, rect] of Object.entries(glowByName)) {
    const index = tileIndexByName[name];
    if (index !== undefined) result.set(index, rect);
  }
  return result;
}

/** Mọi ô cửa sổ/cửa/cổng trong các layer tile của level, đổi ra toạ độ thế giới. */
export function findTileGlows(layers: readonly MapTileLayer[], glowByIndex: ReadonlyMap<number, TileGlowRect>): WorldGlow[] {
  const glows: WorldGlow[] = [];
  for (const layer of layers) {
    // Kenney ×2: vùng sáng tính cho ô 32 px; layer lưới khác cỡ thì co giãn theo.
    const scale = layer.gridSize / GLOW_CELL_PX;
    for (const tile of layer.tiles) {
      const rect = glowByIndex.get(tile.tileIndex);
      if (rect === undefined) continue;
      glows.push({
        x: layer.offsetX + tile.cellX * layer.gridSize + rect.x * scale,
        y: layer.offsetY + tile.cellY * layer.gridSize + rect.y * scale,
        width: rect.width * scale,
        height: rect.height * scale,
        strength: rect.strength,
      });
    }
  }
  return glows;
}

export interface CellRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Ô chắn gộp theo hàng thành dải ngang (ít lệnh vẽ hơn từng ô) để vẽ bóng đổ; toạ độ pixel trong level.
 */
export function solidRuns(collision: CollisionGrid): CellRect[] {
  const runs: CellRect[] = [];
  const { widthCells, heightCells, gridSize, offsetX, offsetY, cells } = collision;
  for (let row = 0; row < heightCells; row++) {
    let start = -1;
    for (let column = 0; column <= widthCells; column++) {
      const solid = column < widthCells && cells[row * widthCells + column] === 1;
      if (solid && start < 0) start = column;
      if (!solid && start >= 0) {
        runs.push({ x: offsetX + start * gridSize, y: offsetY + row * gridSize, width: (column - start) * gridSize, height: gridSize });
        start = -1;
      }
    }
  }
  return runs;
}

/** Hệ số chập chờn của đuốc theo thời gian (1 = không đổi). */
export function flickerScale(timeMs: number, phase: number, amplitude: number, speed: number): number {
  return 1 + Math.sin(timeMs * speed + phase) * amplitude;
}
