// Sinh map chương 1 `assets/maps/chapter-1-misty-village.ldtk` (LDtk 1.5.3, level tách file .ldtkl)
// và atlas `assets/tilesets/chapter-1.png` ghép từ Kenney Tiny Town + Tiny Dungeon (CC0, xem chapter-1/kenney-atlas.mjs).
// Chạy: npm run generate:chapter-1 -w @herox/client. Script tất định: chạy lại ra đúng file cũ.
// Không sửa tay file .ldtkl: lần sinh sau sẽ ghi đè. id level/entity là hợp đồng với client và dữ liệu truyện.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writePng } from '../../tools/lib/png.mjs';
import { hashNoise } from '../../tools/lib/image-ops.mjs';
import { buildLevelJson, buildProjectJson, GRID, writeJson } from '../../tools/lib/ldtk-project.mjs';
import { ASSETS_DIR, SOURCES, upsertCredits } from '../../tools/lib/credits-store.mjs';
import { ATLAS_COLUMNS, buildKenneyAtlas, KENNEY_SHEETS, KENNEY_TILES } from './chapter-1/kenney-atlas.mjs';
import { applyCastleWallAutotile, applyGrassPathAutotile, themeFloorIsPath } from './lib/grass-path-autotile.mjs';
import { LEGEND, LEVELS } from './chapter-1/levels.mjs';

const MAP_NAME = 'chapter-1-misty-village';
const TILESET_FILE = 'chapter-1.png';
const TILESET_REL_PATH = `../tilesets/${TILESET_FILE}`;
/** Tên tile → chỉ số trong atlas; màn trận vẽ sân theo tên tile nên không phụ thuộc thứ tự ghép. */
const TILE_INDEX_FILE = 'chapter-1-tiles.json';
/** Tên tile → vùng phát sáng trong ô (cửa sổ, cửa, cổng) cho lớp ánh sáng giờ vàng. */
const TILE_GLOW_FILE = 'chapter-1-glow.json';
/** Màu cỏ Kenney: chỗ lộ nền (nếu có) trùng màu cỏ thay vì vệt tối. */
const LEVEL_BG_COLOR = '#5DA84B';
const MAIN_VARIANT_SHARE = 0.7;
const PROJECT_IID = 'c1a7e000-0b5d-4e1f-9a01-000000000000';
const DUMMY_WORLD_IID = 'c1a7e000-0b5d-4e1f-9a01-0000000000ff';

// ---------- Giải mã lưới ký tự ----------

/**
 * Vẽ lưới từ các lệnh: ['rect', x, y, w, h, ch] | ['at', ch, [[x, y]...]] | ['stamp', x, y, hàng tên tile, solid].
 * Ô của 'stamp' giữ { tile, solid } thay cho ký tự.
 */
function rasterize(spec) {
  const grid = Array.from({ length: spec.height }, () => Array(spec.width).fill('.'));
  const put = (x, y, value) => {
    if (x < 0 || y < 0 || x >= spec.width || y >= spec.height) throw new Error(`${spec.identifier}: ô (${x},${y}) ngoài level`);
    grid[y][x] = value;
  };
  for (const [op, ...args] of spec.ops) {
    if (op === 'rect') {
      const [x, y, width, height, char] = args;
      for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) put(col, row, char);
    } else if (op === 'at') {
      for (const [x, y] of args[1]) put(x, y, args[0]);
    } else if (op === 'stamp') {
      const [x, y, rows, solid] = args;
      rows.forEach((names, dy) => names.forEach((tile, dx) => put(x + dx, y + dy, { tile, solid })));
    } else throw new Error(`${spec.identifier}: lệnh "${op}" không hợp lệ`);
  }
  return grid;
}

/** Biến thể đầu tiên là chủ đạo, các biến thể sau rải thưa để nền không loang lổ như bàn cờ. */
function pick(options, x, y, seed) {
  if (typeof options === 'string') return options;
  const roll = hashNoise(x, y, seed);
  if (options.length === 1 || roll < MAIN_VARIANT_SHARE) return options[0];
  const rest = options.slice(1);
  return rest[Math.floor(((roll - MAIN_VARIANT_SHARE) / (1 - MAIN_VARIANT_SHARE)) * rest.length) % rest.length];
}

function tileIndex(context, name) {
  const index = context.atlas.indexByName.get(name);
  if (index === undefined) throw new Error(`${context.identifier}: tile "${name}" không có trong atlas`);
  return index;
}

/** Tile trong suốt (cây, đồ vật) nằm ở layer Decor trên sàn; tile đặc thay sàn. */
function placeTile(context, floor, name, solid) {
  const tile = tileIndex(context, name);
  return context.atlas.objectTiles.has(tile) ? { ground: floor, decor: tile, solid } : { ground: tile, decor: null, solid };
}

function decodeCell(grid, x, y, context) {
  const { theme, seed } = context;
  const value = grid[y][x];
  const floor = tileIndex(context, pick(theme.floor, x, y, seed));
  if (typeof value === 'object') return placeTile(context, floor, value.tile, value.solid);
  if (value === '#') {
    // Mặt tường lộ ra khi ô bên dưới đi được (góc nhìn 3/4 thấy mặt đứng).
    const below = y + 1 < grid.length ? grid[y + 1][x] : '#';
    const exposed = below !== '#' && typeof below !== 'object';
    return placeTile(context, floor, pick(exposed ? theme.wallFace : theme.wallTop, x, y, seed + 2), true);
  }
  if (value === '.') return { ground: floor, decor: null, solid: false };
  const entry = theme.legend[value] ?? LEGEND[value];
  if (!entry) throw new Error(`${context.identifier}: ký tự "${value}" chưa có trong bảng`);
  return placeTile(context, floor, pick(entry.tiles, x, y, seed + 1), entry.solid);
}

/** Nền tileset PixelLab: cỏ ↔ đường trước, rồi tường thành (nhận biết qua ô castle_* do decodeCell đặt). */
function decodeGround(grid, cells, atlas, theme) {
  const withPaths = applyGrassPathAutotile(grid, cells, atlas, { floorIsPath: themeFloorIsPath(theme.floor) });
  return applyCastleWallAutotile(grid, withPaths, atlas);
}

function decodeLevel(spec, index, atlas) {
  const grid = rasterize(spec);
  const context = { theme: spec.theme, atlas, seed: index * 7 + 3, identifier: spec.identifier };
  return {
    identifier: spec.identifier,
    iid: spec.iid,
    iidTag: `c1a7e0${index + 1}`,
    index,
    worldX: spec.worldX,
    worldY: spec.worldY,
    widthCells: spec.width,
    heightCells: spec.height,
    cells: decodeGround(grid, grid.map((row, y) => row.map((_value, x) => decodeCell(grid, x, y, context))), atlas, spec.theme),
    entities: spec.entities,
    ascii: grid.map((row) => row.map((value) => (typeof value === 'object' ? (value.solid ? '@' : '+') : value)).join('')),
  };
}

// ---------- Kiểm tra nhanh trước khi ghi (test đầy đủ ở client/test/chapter-1-map.test.ts) ----------

function entityCells(entity) {
  const [width, height] = entity.size ?? [GRID, GRID];
  const cells = [];
  for (let dy = 0; dy < Math.ceil(height / GRID); dy++) {
    for (let dx = 0; dx < Math.ceil(width / GRID); dx++) cells.push([entity.cell[0] + dx, entity.cell[1] + dy]);
  }
  return cells;
}

function reachableFrom(level, start) {
  const seen = new Set([`${start[0]},${start[1]}`]);
  const queue = [start];
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= level.widthCells || ny >= level.heightCells) continue;
      if (level.cells[ny][nx].solid || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

function assertPlayable(level) {
  const [firstSpawn] = level.entities.filter((entity) => entity.id === 'PlayerSpawn');
  const reachable = reachableFrom(level, firstSpawn.cell);
  for (const entity of level.entities) {
    if (entity.id === 'Torch' || entity.id === 'BattleTrigger') continue;
    const cells = entity.id === 'Building' ? [[entity.cell[0] + 1, entity.cell[1] + 2]] : entityCells(entity);
    if (!cells.some(([x, y]) => reachable.has(`${x},${y}`))) {
      throw new Error(`${level.identifier}: ${entity.id} ở (${entity.cell}) không đi tới được\n${level.ascii.join('\n')}`);
    }
  }
}

// ---------- Ghi file ----------

function main() {
  const atlas = buildKenneyAtlas();
  mkdirSync(join(ASSETS_DIR, 'tilesets'), { recursive: true });
  writePng(join(ASSETS_DIR, 'tilesets', TILESET_FILE), atlas.image);
  writeJson(join(ASSETS_DIR, 'tilesets', TILE_INDEX_FILE), Object.fromEntries(atlas.indexByName));
  writeJson(join(ASSETS_DIR, 'tilesets', TILE_GLOW_FILE), atlas.glow);

  const context = { tilesetRelPath: TILESET_REL_PATH, columns: ATLAS_COLUMNS, bgColor: LEVEL_BG_COLOR };
  const levels = LEVELS.map((spec, index) => {
    const level = decodeLevel(spec, index, atlas);
    assertPlayable(level);
    return { json: buildLevelJson(level, context), relPath: `${MAP_NAME}/${spec.identifier}.ldtkl` };
  });
  for (const { json, relPath } of levels) writeJson(join(ASSETS_DIR, 'maps', relPath), json);
  const project = {
    iid: PROJECT_IID,
    dummyWorldIid: DUMMY_WORLD_IID,
    bgColor: LEVEL_BG_COLOR,
    tileset: { identifier: 'Chapter_1', relPath: TILESET_REL_PATH, width: atlas.image.width, height: atlas.image.height, columns: ATLAS_COLUMNS, rows: atlas.rows },
  };
  writeJson(join(ASSETS_DIR, 'maps', `${MAP_NAME}.ldtk`), buildProjectJson(project, levels));

  upsertCredits([{
    ...SOURCES.kenney,
    path: `tilesets/${TILESET_FILE}`,
    title: 'Atlas tile chương 1 (ghép)',
    source: 'Ghép: Kenney Tiny Town + Tiny Dungeon (CC0)',
    modified: `ghép bằng client/scripts/generate-chapter-1.mjs từ ${Object.values(KENNEY_SHEETS).join(', ')} `
      + `(${Object.keys(KENNEY_TILES).length} tile, phóng nearest ×2 lên ${GRID}px)`,
  }]);
}

main();
