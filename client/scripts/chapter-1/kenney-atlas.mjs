// Atlas tile chương 1 ghép từ Kenney Tiny Town + Tiny Dungeon (CC0, ô gốc 16 px, phóng nearest ×2 thành 32 px).
// Giữ ảnh gốc 16 px trong assets/tiles/kenney; atlas sinh lại được nên không lưu bản 32 px riêng.
import { join } from 'node:path';
import { createImage, blit, readPng } from '../../../tools/lib/png.mjs';
import { crop, hasTransparency, scaleNearest } from '../../../tools/lib/image-ops.mjs';
import { GRID } from '../../../tools/lib/ldtk-project.mjs';
import { ASSETS_DIR } from '../../../tools/lib/credits-store.mjs';

const SOURCE_TILE_PX = 16;
const SCALE = GRID / SOURCE_TILE_PX;
const SHEET_COLUMNS = 12;
export const ATLAS_COLUMNS = 8;
const ATLAS_MAX_PX = 2048; // trần texture WebGL an toàn trên iPhone

export const KENNEY_SHEETS = {
  town: 'tiles/kenney/tiny-town.png',
  dungeon: 'tiles/kenney/tiny-dungeon.png',
};

/**
 * Vùng phát sáng trong ô 32 px (cửa sổ, cửa, cổng) để lớp ánh sáng giờ vàng thắp đúng chỗ mà không phải biết chỉ số atlas.
 * `strength` 0..1: cửa sổ sáng nhất, cửa và lòng cổng dịu hơn.
 */
const WINDOW_GLOW = { x: 6, y: 8, width: 20, height: 18, strength: 1 };
const DOOR_GLOW = { x: 8, y: 12, width: 16, height: 20, strength: 0.8 };
const GATE_LEFT_GLOW = { x: 16, y: 0, width: 16, height: 32, strength: 0.9 };
const GATE_RIGHT_GLOW = { x: 0, y: 0, width: 16, height: 32, strength: 0.9 };

/** Tên tile → [tilesheet, chỉ số ô trong tilesheet 12 cột, vùng sáng?]. Thứ tự bảng là thứ tự trong atlas. */
export const KENNEY_TILES = {
  // Nền ngoài trời
  grass: ['town', 0],
  grass_tuft: ['town', 1],
  grass_flowers: ['town', 2],
  dirt: ['town', 25],
  dirt_pebble: ['town', 40],
  dirt_tuft: ['town', 41],
  cobble: ['town', 43],
  // Cây, bụi (nền trong suốt, vẽ đè lên sàn). Cây thông xanh nhạt (ô 4, 28) trùng màu cỏ nên không dùng.
  tree_pine: ['town', 16],
  tree_autumn: ['town', 15],
  tree_cone_autumn: ['town', 3],
  tree_cone_autumn_small: ['town', 27],
  bush: ['town', 5],
  sprout: ['town', 17],
  mushroom: ['town', 29],
  // Hàng rào, đồ vật làng
  fence_left: ['town', 80],
  fence_mid: ['town', 81],
  fence_right: ['town', 82],
  sign: ['town', 83],
  well: ['town', 104],
  beehive: ['town', 94],
  target: ['town', 95],
  barrel: ['town', 107],
  // Nhà mái cam / mái xám (3 cột trái-giữa-phải)
  roof_orange_left: ['town', 52],
  roof_orange_mid: ['town', 53],
  roof_orange_right: ['town', 54],
  roof_orange_dormer: ['town', 55, WINDOW_GLOW],
  roof_orange_eave_left: ['town', 64],
  roof_orange_eave_mid: ['town', 65],
  roof_orange_eave_right: ['town', 66],
  roof_grey_left: ['town', 48],
  roof_grey_mid: ['town', 49],
  roof_grey_right: ['town', 50],
  roof_grey_dormer: ['town', 51, WINDOW_GLOW],
  roof_grey_eave_left: ['town', 60],
  roof_grey_eave_mid: ['town', 61],
  roof_grey_eave_right: ['town', 62],
  wood_wall_mid: ['town', 73],
  wood_wall_right: ['town', 75],
  wood_window: ['town', 84, WINDOW_GLOW],
  wood_door: ['town', 86, DOOR_GLOW],
  stone_wall_left: ['town', 76],
  stone_wall_mid: ['town', 77],
  stone_wall_right: ['town', 79],
  stone_window: ['town', 88, WINDOW_GLOW],
  stone_door: ['town', 90, DOOR_GLOW],
  // Tường thành, tháp, cổng
  castle_battlement: ['town', 100],
  castle_wall: ['town', 126],
  tower_top_left: ['town', 96],
  tower_top_mid: ['town', 97],
  tower_top_right: ['town', 98],
  tower_left: ['town', 108],
  stone_slab: ['town', 109],
  tower_right: ['town', 110],
  tower_base_left: ['town', 120],
  tower_base_mid: ['town', 121],
  tower_base_right: ['town', 122],
  gate_arch_left: ['town', 111],
  gate_arch_right: ['town', 112],
  gate_left: ['town', 123, GATE_LEFT_GLOW],
  gate_right: ['town', 124, GATE_RIGHT_GLOW],
  // Nhà nguyện, hầm (Tiny Dungeon)
  flagstone: ['dungeon', 42],
  brick_wall: ['dungeon', 40],
  brick_wall_barred: ['dungeon', 28, WINDOW_GLOW],
  pillar_wall: ['dungeon', 57],
  cave_floor: ['dungeon', 0],
  cave_rubble: ['dungeon', 12],
  cave_gravel: ['dungeon', 24],
  bench: ['dungeon', 37],
  banner: ['dungeon', 29],
  altar: ['dungeon', 31],
  column: ['dungeon', 18],
  gargoyle: ['dungeon', 19],
  tombstone: ['dungeon', 64],
  gravestone: ['dungeon', 65],
  sack: ['dungeon', 66],
  anvil: ['dungeon', 74],
  crate: ['dungeon', 63],
  skull_pile: ['dungeon', 124],
};

function loadSheet(relPath) {
  const image = readPng(join(ASSETS_DIR, relPath));
  if (image.width !== SHEET_COLUMNS * SOURCE_TILE_PX) throw new Error(`${relPath}: cần ${SHEET_COLUMNS} cột ${SOURCE_TILE_PX}px không khoảng cách`);
  return image;
}

function cropTile(sheet, index) {
  const region = { x: (index % SHEET_COLUMNS) * SOURCE_TILE_PX, y: Math.floor(index / SHEET_COLUMNS) * SOURCE_TILE_PX, width: SOURCE_TILE_PX, height: SOURCE_TILE_PX };
  if (region.y + SOURCE_TILE_PX > sheet.height) throw new Error(`Ô ${index} ngoài tilesheet`);
  return scaleNearest(crop(sheet, region), SCALE);
}

/**
 * Dựng atlas: `indexByName` cho map và sân trận, `objectTiles` là ô nền trong suốt (vẽ ở layer Decor, chồng lên sàn),
 * `glow` là vùng sáng theo tên tile.
 */
export function buildKenneyAtlas() {
  const sheets = Object.fromEntries(Object.entries(KENNEY_SHEETS).map(([key, relPath]) => [key, loadSheet(relPath)]));
  const names = Object.keys(KENNEY_TILES);
  const rows = Math.ceil(names.length / ATLAS_COLUMNS);
  const image = createImage(ATLAS_COLUMNS * GRID, rows * GRID);
  if (image.width > ATLAS_MAX_PX || image.height > ATLAS_MAX_PX) throw new Error(`Atlas ${image.width}x${image.height} vượt ${ATLAS_MAX_PX}`);
  const objectTiles = new Set();
  const glow = {};
  names.forEach((name, index) => {
    const [sheetKey, sheetIndex, glowRect] = KENNEY_TILES[name];
    const tile = cropTile(sheets[sheetKey], sheetIndex);
    blit(image, tile, (index % ATLAS_COLUMNS) * GRID, Math.floor(index / ATLAS_COLUMNS) * GRID);
    if (hasTransparency(tile)) objectTiles.add(index);
    if (glowRect) glow[name] = glowRect;
  });
  return { image, rows, indexByName: new Map(names.map((name, index) => [name, index])), objectTiles, glow };
}
