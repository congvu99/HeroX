// Ô atlas vẽ bằng PixelLab thay cho ô Kenney cùng tên. Giữ nguyên tên và thứ tự ô trong KENNEY_TILES (chỉ số ô là
// hợp đồng với file .ldtkl), nên bố cục, va chạm và nơi dùng tên ô không đổi. Ảnh nguồn chưa có thì lùi về Kenney.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPng } from '../../../tools/lib/png.mjs';
import { clearEdgeBackground, crop, downscaleNearest, scaleNearest } from '../../../tools/lib/image-ops.mjs';
import { GRID } from '../../../tools/lib/ldtk-project.mjs';
import { ASSETS_DIR } from '../../../tools/lib/credits-store.mjs';
import {
  CASTLE_WALL_TILESET_JOB,
  GRASS_PATH_TILESET_JOB,
  HOUSE_GREY_JOB,
  HOUSE_ORANGE_JOB,
  TREE_AUTUMN_JOB,
  TREE_CONE_AUTUMN_JOB,
  TREE_PINE_JOB,
  CASTLE_GATE_JOB,
  CASTLE_TOWER_JOB,
  CHAPEL_FRONT_JOB,
} from '../../../tools/pixellab/jobs-map-structures.mjs';
import { CHAPEL_FRONT_TILES } from './chapel-front.mjs';
import { CASTLE_WALL_TILE_PREFIX, cornerMask, GRASS_PATH_TILE_PREFIX, tileName } from '../lib/grass-path-autotile.mjs';

/**
 * Mỗi mục: `path` ảnh trong assets/, `tiles` là lưới tên ô (hàng × cột, mỗi ô GRID px; `null` = bỏ qua ô đó),
 * `pixelScale` 1 giữ độ nét gốc, 2 thu nửa rồi phóng ×2 cho cùng độ hạt Kenney 16 px, `glowRects` là vùng sáng (cửa
 * sổ, cửa) đo trên ảnh nguồn, toạ độ px ảnh; `clearBackground` xoá nền đục liền mép ảnh.
 */
const WINDOW_STRENGTH = 1;
const DOOR_STRENGTH = 0.8;
const GATE_STRENGTH = 0.9;
const windowGlow = (x, y, width, height) => ({ x, y, width, height, strength: WINDOW_STRENGTH });
const doorGlow = (x, y, width, height) => ({ x, y, width, height, strength: DOOR_STRENGTH });

export const PIXELLAB_TILE_OVERRIDES = [
  {
    path: HOUSE_ORANGE_JOB.path,
    tiles: [
      ['roof_orange_left', 'roof_orange_dormer', 'roof_orange_right'],
      ['roof_orange_eave_left', 'roof_orange_eave_mid', 'roof_orange_eave_right'],
      ['wood_window', 'wood_door', 'wood_wall_right'],
    ],
    glowRects: [
      windowGlow(31, 35, 7, 9), windowGlow(16, 58, 9, 14), doorGlow(27, 56, 13, 26), windowGlow(41, 61, 9, 11), windowGlow(65, 57, 10, 16),
    ],
  },
  {
    path: HOUSE_GREY_JOB.path,
    tiles: [
      ['roof_grey_left', 'roof_grey_dormer', 'roof_grey_right'],
      ['roof_grey_eave_left', 'roof_grey_eave_mid', 'roof_grey_eave_right'],
      ['stone_window', 'stone_door', 'stone_wall_right'],
    ],
    glowRects: [windowGlow(27, 32, 8, 16), doorGlow(26, 59, 10, 24), windowGlow(61, 56, 10, 17)],
  },
  { path: TREE_PINE_JOB.path, tiles: [['tree_pine']] },
  { path: TREE_AUTUMN_JOB.path, tiles: [['tree_autumn']] },
  { path: TREE_CONE_AUTUMN_JOB.path, tiles: [['tree_cone_autumn']] },
  {
    path: CASTLE_TOWER_JOB.path,
    tiles: [
      ['tower_top_left', 'tower_top_mid', 'tower_top_right'],
      ['tower_left', 'tower_mid', 'tower_right'],
      ['tower_base_left', 'tower_base_mid', 'tower_base_right'],
    ],
    glowRects: [windowGlow(44, 39, 6, 14), doorGlow(40, 63, 15, 19)],
  },
  {
    path: CASTLE_GATE_JOB.path,
    tiles: [['gate_arch_left', 'gate_arch_right'], ['gate_left', 'gate_right']],
    glowRects: [{ x: 20, y: 26, width: 25, height: 34, strength: GATE_STRENGTH }],
  },
  {
    path: CHAPEL_FRONT_JOB.path,
    tiles: CHAPEL_FRONT_TILES,
    // Ảnh rộng này PixelLab trả nền trắng đục dù đã xin nền trong suốt.
    clearBackground: true,
    glowRects: [
      ...[50, 79, 122, 242, 287, 315].map((x) => windowGlow(x, 75, 18, 28)),
      // Hai cửa sổ sát tháp chuông bị cột che một nửa.
      windowGlow(150, 75, 9, 28), windowGlow(222, 75, 11, 28),
      windowGlow(177, 40, 23, 28), windowGlow(185, 22, 10, 13), doorGlow(175, 80, 30, 38),
    ],
  },
];

/**
 * Vùng sáng của ô (cột, hàng) từ các vùng sáng toạ độ ảnh: cắt theo biên ô; nhiều vùng chạm cùng ô thì gộp khung bao,
 * lấy độ sáng lớn nhất (lớp ánh sáng chỉ nhận một vùng mỗi tên ô).
 */
function tileGlow(glowRects, column, row) {
  let merged;
  for (const rect of glowRects) {
    const left = Math.max(rect.x, column * GRID);
    const top = Math.max(rect.y, row * GRID);
    const right = Math.min(rect.x + rect.width, (column + 1) * GRID);
    const bottom = Math.min(rect.y + rect.height, (row + 1) * GRID);
    if (right <= left || bottom <= top) continue;
    const box = { left: left - column * GRID, top: top - row * GRID, right: right - column * GRID, bottom: bottom - row * GRID };
    merged = merged
      ? {
        left: Math.min(merged.left, box.left), top: Math.min(merged.top, box.top),
        right: Math.max(merged.right, box.right), bottom: Math.max(merged.bottom, box.bottom),
        strength: Math.max(merged.strength, rect.strength),
      }
      : { ...box, strength: rect.strength };
  }
  return merged && { x: merged.left, y: merged.top, width: merged.right - merged.left, height: merged.bottom - merged.top, strength: merged.strength };
}

/**
 * Cắt ảnh nguồn thành ô GRID px theo lưới tên; báo lỗi rõ khi cỡ ảnh không khớp lưới. `glowRects` (toạ độ ảnh nguồn)
 * được chia về từng ô nên cửa sổ, cửa nằm vắt qua biên ô vẫn sáng đúng chỗ.
 */
export function sliceOverride(entry, source) {
  const rows = entry.tiles.length;
  const columns = entry.tiles[0].length;
  if (source.width !== columns * GRID || source.height !== rows * GRID) {
    throw new Error(`${entry.path}: cần ${columns * GRID}x${rows * GRID}, nhận ${source.width}x${source.height}`);
  }
  const pixelScale = entry.pixelScale ?? 1;
  const opaqueSafe = entry.clearBackground ? clearEdgeBackground(source) : source;
  const image = pixelScale === 1 ? opaqueSafe : scaleNearest(downscaleNearest(opaqueSafe, pixelScale), pixelScale);
  const tiles = new Map();
  entry.tiles.forEach((names, row) => names.forEach((name, column) => {
    if (name === null) return;
    const glow = tileGlow(entry.glowRects ?? [], column, row);
    tiles.set(name, { image: crop(image, { x: column * GRID, y: row * GRID, width: GRID, height: GRID }), glow });
  }));
  return tiles;
}

/** Tên ô → { image, glow? } cho mọi mục có ảnh nguồn trong `assetsDir`. */
export function loadOverrideTiles(entries = PIXELLAB_TILE_OVERRIDES, assetsDir = ASSETS_DIR) {
  const tiles = new Map();
  for (const entry of entries) {
    const fsPath = join(assetsDir, entry.path);
    if (!existsSync(fsPath)) continue;
    for (const [name, tile] of sliceOverride(entry, readPng(fsPath))) tiles.set(name, tile);
  }
  return tiles;
}

/** Tileset Wang (sheet ảnh + bảng góc .json do tools/pixellab/generate.mjs ghi) và tiền tố tên ô trong atlas. */
export const WANG_TILESETS = [
  { path: GRASS_PATH_TILESET_JOB.path, prefix: GRASS_PATH_TILE_PREFIX },
  { path: CASTLE_WALL_TILESET_JOB.path, prefix: CASTLE_WALL_TILE_PREFIX },
];

/**
 * Ô tileset thêm vào CUỐI atlas (tên `<tiền tố><mặt nạ góc>`), không đụng chỉ số ô Kenney. Tileset chưa sinh thì bỏ
 * qua. Ô 32 px vẽ 1:1, ô nhỏ hơn phóng nearest cho đủ ô lưới.
 */
export function loadWangTiles(tilesets = WANG_TILESETS, assetsDir = ASSETS_DIR) {
  const result = new Map();
  for (const { path, prefix } of tilesets) {
    const fsPath = join(assetsDir, path);
    if (!existsSync(fsPath)) continue;
    const { tileSize, columns, terrain, tiles } = JSON.parse(readFileSync(fsPath.replace(/\.png$/, '.json'), 'utf8'));
    if (terrain !== 'lower' && terrain !== 'upper') throw new Error(`${path}: thiếu terrain (lower|upper) trong file góc`);
    if (GRID % tileSize !== 0) throw new Error(`${path}: ô ${tileSize} px không chia hết lưới ${GRID}`);
    const sheet = readPng(fsPath);
    const before = result.size;
    tiles.forEach((tileCorners, index) => {
      const region = { x: (index % columns) * tileSize, y: Math.floor(index / columns) * tileSize, width: tileSize, height: tileSize };
      result.set(tileName(prefix, cornerMask(tileCorners, terrain)), scaleNearest(crop(sheet, region), GRID / tileSize));
    });
    if (result.size - before !== tiles.length) throw new Error(`${path}: có ô trùng mặt nạ góc`);
  }
  return result;
}
