// Máy sinh map chung cho chương 2–5: cùng cơ chế giải mã lưới ký tự và ghi file như generate-chapter-1.mjs,
// gom lại một chỗ để các chương chỉ khai báo cấu hình + mô tả level (không chép lại máy móc).
// Script tất định: chạy lại ra đúng file cũ. id level/entity là hợp đồng với client và dữ liệu truyện.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writePng } from '../../../tools/lib/png.mjs';
import { hashNoise } from '../../../tools/lib/image-ops.mjs';
import { buildLevelJson, buildProjectJson, GRID, writeJson } from '../../../tools/lib/ldtk-project.mjs';
import { ASSETS_DIR, SOURCES, upsertCredits } from '../../../tools/lib/credits-store.mjs';
import { ATLAS_COLUMNS, buildKenneyAtlas, KENNEY_SHEETS, KENNEY_TILES } from '../chapter-1/kenney-atlas.mjs';

const MAIN_VARIANT_SHARE = 0.7;

// ---------- Giải mã lưới ký tự (giống generate-chapter-1.mjs) ----------

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

function decodeCell(grid, x, y, context, legend) {
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
  const entry = theme.legend[value] ?? legend[value];
  if (!entry) throw new Error(`${context.identifier}: ký tự "${value}" chưa có trong bảng`);
  return placeTile(context, floor, pick(entry.tiles, x, y, seed + 1), entry.solid);
}

function decodeLevel(spec, index, atlas, iidTagPrefix, legend) {
  const grid = rasterize(spec);
  const context = { theme: spec.theme, atlas, seed: index * 7 + 3, identifier: spec.identifier };
  return {
    identifier: spec.identifier,
    iid: spec.iid,
    iidTag: `${iidTagPrefix}${(index + 1).toString(16).padStart(2, '0')}`,
    index,
    worldX: spec.worldX,
    worldY: spec.worldY,
    widthCells: spec.width,
    heightCells: spec.height,
    cells: grid.map((row, y) => row.map((_value, x) => decodeCell(grid, x, y, context, legend))),
    entities: spec.entities,
    ascii: grid.map((row) => row.map((value) => (typeof value === 'object' ? (value.solid ? '@' : '+') : value)).join('')),
  };
}

// ---------- Kiểm tra nhanh trước khi ghi (test đầy đủ ở client/test/chapter-1-map.test.ts, chung mọi chương) ----------

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
  if (!firstSpawn) throw new Error(`${level.identifier}: thiếu PlayerSpawn`);
  const reachable = reachableFrom(level, firstSpawn.cell);
  for (const entity of level.entities) {
    if (entity.id === 'Torch' || entity.id === 'BattleTrigger') continue;
    const cells = entity.id === 'Building' ? [[entity.cell[0] + 1, entity.cell[1] + 2]] : entityCells(entity);
    if (!cells.some(([x, y]) => reachable.has(`${x},${y}`))) {
      throw new Error(`${level.identifier}: ${entity.id} ở (${entity.cell}) không đi tới được\n${level.ascii.join('\n')}`);
    }
  }
}

/**
 * Sinh một chương. `config`:
 * { mapName, tilesetIdentifier, iidTagPrefix (6 hex), projectIid, dummyWorldIid, bgColor, chapterTitle, levels, legend }.
 */
export function generateChapter(config) {
  const atlas = buildKenneyAtlas();
  const tilesetFile = `${config.mapName.split('-').slice(0, 2).join('-')}.png`;
  const tileIndexFile = `${config.mapName.split('-').slice(0, 2).join('-')}-tiles.json`;
  const glowFile = `${config.mapName.split('-').slice(0, 2).join('-')}-glow.json`;
  const tilesetRelPath = `../tilesets/${tilesetFile}`;

  mkdirSync(join(ASSETS_DIR, 'tilesets'), { recursive: true });
  writePng(join(ASSETS_DIR, 'tilesets', tilesetFile), atlas.image);
  writeJson(join(ASSETS_DIR, 'tilesets', tileIndexFile), Object.fromEntries(atlas.indexByName));
  writeJson(join(ASSETS_DIR, 'tilesets', glowFile), atlas.glow);

  const context = { tilesetRelPath, columns: ATLAS_COLUMNS, bgColor: config.bgColor };
  const levels = config.levels.map((spec, index) => {
    const level = decodeLevel(spec, index, atlas, config.iidTagPrefix, config.legend);
    assertPlayable(level);
    return { json: buildLevelJson(level, context), relPath: `${config.mapName}/${spec.identifier}.ldtkl` };
  });
  for (const { json, relPath } of levels) writeJson(join(ASSETS_DIR, 'maps', relPath), json);

  const project = {
    iid: config.projectIid,
    dummyWorldIid: config.dummyWorldIid,
    bgColor: config.bgColor,
    tileset: { identifier: config.tilesetIdentifier, relPath: tilesetRelPath, width: atlas.image.width, height: atlas.image.height, columns: ATLAS_COLUMNS, rows: atlas.rows },
  };
  writeJson(join(ASSETS_DIR, 'maps', `${config.mapName}.ldtk`), buildProjectJson(project, levels));

  upsertCredits([{
    ...SOURCES.kenney,
    path: `tilesets/${tilesetFile}`,
    title: `Atlas tile ${config.chapterTitle} (ghép)`,
    source: 'Ghép: Kenney Tiny Town + Tiny Dungeon (CC0)',
    modified: `ghép bằng client/scripts/generate-${config.mapName.split('-').slice(0, 2).join('-')}.mjs từ ${Object.values(KENNEY_SHEETS).join(', ')} `
      + `(${Object.keys(KENNEY_TILES).length} tile, phóng nearest ×2 lên ${GRID}px)`,
  }]);

  return { tilesetFile, levelCount: levels.length };
}
