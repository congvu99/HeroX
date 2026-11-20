// Sinh map chương 1 `assets/maps/chapter-1-misty-village.ldtk` (LDtk 1.5.3, level tách file .ldtkl)
// và atlas `assets/tilesets/chapter-1.png` ghép từ tile DCSS (assets/tiles/dcss) + tile vẽ bằng script.
// Chạy: npm run generate:chapter-1 -w @herox/client. Script tất định: chạy lại ra đúng file cũ.
// Hình là bản TẠM chờ PixelLab; id level/entity là hợp đồng với client và dữ liệu truyện, đổi phải sửa cả hai phía.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createImage, blit, readPng, writePng } from '../../tools/lib/png.mjs';
import { hashNoise, hasTransparency } from '../../tools/lib/image-ops.mjs';
import { harmonizeImage, HARMONIZED_TEXT_KEY, HARMONIZE_VERSION } from '../../tools/lib/palette.mjs';
import { DRAWN_TILES, mistify, wallFace } from '../../tools/lib/tile-painters.mjs';
import { buildLevelJson, buildProjectJson, GRID, writeJson } from '../../tools/lib/ldtk-project.mjs';
import { ASSETS_DIR, SOURCES, upsertCredits } from '../../tools/lib/credits-store.mjs';

const MAP_NAME = 'chapter-1-misty-village';
const TILESET_FILE = 'chapter-1.png';
const TILESET_REL_PATH = `../tilesets/${TILESET_FILE}`;
/** Tên tile → chỉ số trong atlas; màn trận vẽ sân theo tên tile nên không phụ thuộc thứ tự ghép. */
const TILE_INDEX_FILE = 'chapter-1-tiles.json';
const ATLAS_COLUMNS = 8;
const MAIN_VARIANT_SHARE = 0.7;
const ATLAS_MAX_PX = 2048; // trần texture WebGL an toàn trên iPhone
const PROJECT_IID = 'c1a7e000-0b5d-4e1f-9a01-000000000000';
const DUMMY_WORLD_IID = 'c1a7e000-0b5d-4e1f-9a01-0000000000ff';

const DCSS_TILE_NAMES = [
  'cobble_blood1', 'cobble_blood2', 'rect_gray0', 'rect_gray1', 'grey_dirt0', 'grey_dirt3', 'marble_floor1',
  'marble_floor2', 'tomb0', 'volcanic_floor0', 'volcanic_floor1', 'lava0', 'lava1', 'brick_dark0', 'brick_dark3',
  'brick_brown0', 'stone2_dark0', 'volcanic_wall0', 'tree1_red', 'tree2_red', 'crumbled_column',
  'dngn_granite_statue', 'gate_closed_middle', 'dngn_closed_door', 'dngn_altar', 'dngn_blood_fountain',
];
/** Tile phái sinh từ tile DCSS đã chỉnh tông: [tên, nguồn, phép biến đổi]. */
const DERIVED_TILES = [
  ['mist_grass0', 'grass0', (image) => mistify(image, 1)],
  ['mist_grass1', 'grass1', (image) => mistify(image, 2)],
  ['brick_dark_face', 'brick_dark0', wallFace],
  ['brick_dark3_face', 'brick_dark3', wallFace],
  ['volcanic_wall_face', 'volcanic_wall0', wallFace],
];

function loadTiles() {
  const tiles = new Map();
  for (const name of DCSS_TILE_NAMES) tiles.set(name, readPng(join(ASSETS_DIR, 'tiles', 'dcss', `${name}.png`)));
  for (const [name, source, transform] of DERIVED_TILES) {
    tiles.set(name, transform(readPng(join(ASSETS_DIR, 'tiles', 'dcss', `${source}.png`))));
  }
  // Tile vẽ bằng script cũng qua palette-harmonize để cùng tông với tile DCSS (tile đã đánh dấu được bỏ qua).
  for (const [name, painter] of Object.entries(DRAWN_TILES)) tiles.set(name, harmonizeImage(painter()));
  return tiles;
}

function buildAtlas(tiles) {
  const names = [...tiles.keys()];
  const rows = Math.ceil(names.length / ATLAS_COLUMNS);
  const atlas = createImage(ATLAS_COLUMNS * GRID, rows * GRID);
  if (atlas.width > ATLAS_MAX_PX || atlas.height > ATLAS_MAX_PX) throw new Error(`Atlas ${atlas.width}x${atlas.height} vượt ${ATLAS_MAX_PX}`);
  names.forEach((name, index) => blit(atlas, tiles.get(name), (index % ATLAS_COLUMNS) * GRID, Math.floor(index / ATLAS_COLUMNS) * GRID));
  atlas.text = { [HARMONIZED_TEXT_KEY]: HARMONIZE_VERSION };
  const indexByName = new Map(names.map((name, index) => [name, index]));
  const objectTiles = new Set(names.flatMap((name, index) => (hasTransparency(tiles.get(name)) ? [index] : [])));
  return { image: atlas, rows, indexByName, objectTiles };
}

// ---------- Level ----------

/** '#' là tường theo chủ đề level, '.' là sàn theo chủ đề; ký tự khác tra bảng này. */
const LEGEND = {
  ',': { tiles: ['mud'], solid: false },
  '=': { tiles: ['cobble_blood1', 'cobble_blood2'], solid: false },
  _: { tiles: ['tomb0'], solid: false },
  c: { tiles: ['carpet'], solid: false },
  R: { tiles: ['rune_gate'], solid: false },
  r: { tiles: ['rubble'], solid: false },
  x: { tiles: ['bones'], solid: false },
  n: { tiles: ['candles'], solid: false },
  W: { tiles: ['ruin_wall'], solid: true },
  T: { tiles: ['tree1_red', 'tree2_red'], solid: true },
  o: { tiles: ['crumbled_column'], solid: true },
  S: { tiles: ['dngn_granite_statue'], solid: true },
  g: { tiles: ['grave'], solid: true },
  b: { tiles: ['foundation'], solid: true },
  h: { tiles: ['brick_brown0'], solid: true },
  d: { tiles: ['dngn_closed_door'], solid: true },
  I: { tiles: ['gate_closed_middle'], solid: true },
  L: { tiles: ['lava0', 'lava1'], solid: true },
  l: { tiles: ['lava_crack'], solid: true },
  A: { tiles: ['dngn_altar'], solid: true },
  F: { tiles: ['forge'], solid: true },
  U: { tiles: ['dngn_blood_fountain'], solid: true },
  k: { tiles: ['stone2_dark0'], solid: true },
};

const THEME = {
  outpost: { floor: ['rect_gray0', 'rect_gray1', 'grey_dirt0'], wallTop: 'brick_dark0', wallFace: 'brick_dark_face' },
  fields: { floor: ['mist_grass0', 'mist_grass1'], wallTop: 'tree1_red', wallFace: 'tree2_red' },
  village: { floor: ['grey_dirt0', 'grey_dirt3'], wallTop: 'brick_dark0', wallFace: 'brick_dark_face' },
  chapel: { floor: ['marble_floor1', 'marble_floor2'], wallTop: 'brick_dark3', wallFace: 'brick_dark3_face' },
  lair: { floor: ['volcanic_floor0', 'volcanic_floor1'], wallTop: 'volcanic_wall0', wallFace: 'volcanic_wall_face' },
};

const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const chest = (cell, itemId) => ({ id: 'Chest', cell, fields: { itemId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const building = (cell, buildingId) => ({ id: 'Building', cell, size: [96, 64], fields: { buildingId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [64, 32]; // cổng 2 ô ngang (cạnh trên/dưới)
const GATE_V = [32, 64]; // cổng 2 ô dọc (cạnh trái/phải)

/** Tiền đồn Lexhold đổ nát: 4 nền móng công trình, cổng nam ra cánh đồng (qua trận hướng dẫn), cổng đông chưa mở. */
const LEXHOLD = {
  identifier: 'Lexhold', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000001', theme: THEME.outpost,
  width: 36, height: 22, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 36, 22, '#'], ['rect', 1, 1, 34, 18, '.'],
    ['rect', 3, 5, 30, 1, '='], ['rect', 17, 5, 2, 14, '='], ['rect', 19, 10, 16, 2, '='],
    ['rect', 17, 19, 2, 2, '='], ['rect', 17, 21, 2, 1, 'R'], ['rect', 35, 10, 1, 2, 'R'],
    ['rect', 4, 3, 3, 2, 'b'], ['rect', 11, 3, 3, 2, 'b'], ['rect', 22, 3, 3, 2, 'b'], ['rect', 29, 3, 3, 2, 'b'],
    ['at', 'S', [[15, 7], [20, 7]]], ['at', 'U', [[11, 11]]],
    ['at', 'o', [[1, 1], [34, 1], [9, 9], [26, 14], [9, 15]]],
    ['rect', 1, 13, 3, 1, 'W'], ['rect', 6, 16, 1, 3, 'W'], ['rect', 27, 16, 4, 1, 'W'], ['at', 'W', [[32, 7], [2, 8], [13, 1], [23, 1]]],
    ['rect', 5, 9, 3, 2, ','], ['rect', 23, 13, 3, 2, ','], ['rect', 28, 1, 3, 1, ','],
    ['at', 'r', [[12, 13], [21, 16], [4, 18], [30, 12], [2, 2], [14, 17]]],
  ],
  entities: [
    spawn([16, 10], 'start'), spawn([17, 17], 'from-fields'),
    npc([15, 9], 'keeper'),
    building([4, 3], 'forge'), building([11, 3], 'arcane-tower'), building([22, 3], 'tailor'), building([29, 3], 'library'),
    // Trận hướng dẫn chắn kín hành lang cổng nam, nằm trước cổng: không đánh xong thì không ra được cánh đồng.
    battle([17, 19], [64, 64], 'tutorial'),
    portal([17, 21], GATE_H, 'Misty_Fields', 'from-lexhold'),
    // Rừng Tro thuộc chương sau, cố ý chưa có level; client tự chặn cổng tới khi đủ mốc từ.
    portal([35, 10], GATE_V, 'Ash_Forest', 'from-lexhold'),
    ...torches([[16, 18], [19, 18], [8, 6], [27, 6], [33, 9], [33, 12]]),
  ],
};

/** Cánh đồng sương đỏ: hàng cây chắn ngang, đường bùn chính đi qua khe có trận ch1-field. */
const MISTY_FIELDS = {
  identifier: 'Misty_Fields', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000002', theme: THEME.fields,
  width: 44, height: 24, worldX: -256, worldY: 768,
  ops: [
    ['rect', 0, 0, 44, 24, '#'], ['rect', 1, 1, 42, 22, '.'],
    ['rect', 21, 0, 2, 1, 'R'], ['rect', 43, 11, 1, 2, 'R'],
    ['rect', 21, 1, 2, 11, ','], ['rect', 21, 11, 22, 2, ','],
    ['rect', 30, 1, 2, 8, 'T'], ['rect', 30, 15, 2, 8, 'T'],
    ['rect', 3, 4, 10, 7, '_'], ['rect', 3, 3, 10, 1, 'I'], ['rect', 3, 11, 8, 1, 'I'],
    ['at', 'g', [[4, 5], [6, 5], [8, 5], [10, 5], [4, 8], [6, 8], [8, 8], [10, 8]]],
    ['at', 'T', [[15, 4], [16, 15], [25, 5], [26, 18], [37, 4], [38, 19], [8, 16], [13, 20], [35, 7]]],
    ['rect', 14, 8, 1, 3, 'W'], ['rect', 24, 16, 3, 1, 'W'], ['at', 'W', [[36, 15], [40, 6]]],
    ['rect', 5, 14, 3, 2, ','], ['rect', 34, 17, 3, 2, ','],
    ['at', 'x', [[17, 13], [27, 7], [39, 16]]], ['at', 'r', [[18, 6], [33, 9], [11, 18]]],
  ],
  entities: [
    spawn([21, 2], 'from-lexhold'), spawn([40, 11], 'from-village'),
    portal([21, 0], GATE_H, 'Lexhold', 'from-fields'),
    portal([43, 11], GATE_V, 'Misty_Village', 'from-fields'),
    // Khe giữa hàng cây là lối duy nhất sang phía đông; trận phủ kín khe.
    battle([30, 9], [64, 192], 'ch1-field'),
    battle([2, 17], [128, 128], 'ch1-field-roam'),
    ...torches([[20, 2], [23, 2], [41, 10], [41, 13], [29, 10], [32, 13]]),
  ],
};

/** Làng Sương Sớm: nhà nguyện phía bắc (cửa mất chữ), lò rèn phía đông nam, lối xuống hang trùm phía nam. */
const MISTY_VILLAGE = {
  identifier: 'Misty_Village', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000003', theme: THEME.village,
  width: 40, height: 24, worldX: 1216, worldY: 768,
  ops: [
    ['rect', 0, 0, 40, 24, '#'], ['rect', 1, 1, 38, 22, '.'],
    ['rect', 0, 11, 1, 2, 'R'], ['rect', 19, 23, 2, 1, 'R'],
    ['rect', 1, 11, 38, 2, '='], ['rect', 19, 6, 2, 17, '='],
    ['rect', 14, 1, 12, 5, 'h'], ['rect', 19, 5, 2, 1, 'R'],
    ['rect', 3, 2, 7, 4, 'h'], ['rect', 30, 2, 7, 4, 'h'], ['rect', 3, 15, 7, 4, 'h'], ['rect', 30, 15, 7, 4, 'h'],
    ['at', 'd', [[6, 5], [33, 5], [6, 15]]], ['at', 'F', [[31, 14], [32, 14]]], ['at', 'U', [[25, 8]]],
    ['at', 'g', [[24, 17], [26, 17], [24, 19], [26, 19], [28, 20]]],
    ['rect', 11, 7, 1, 3, 'W'], ['at', 'W', [[37, 9], [12, 19]]],
    ['rect', 8, 8, 3, 2, ','], ['rect', 22, 14, 3, 2, ','],
    ['at', 'r', [[13, 15], [36, 20], [27, 9]]], ['at', 'x', [[25, 21]]],
  ],
  entities: [
    spawn([2, 11], 'from-fields'), spawn([20, 8], 'from-chapel'), spawn([19, 20], 'from-lair'),
    npc([5, 9], 'hollow-villager'),
    npc([33, 14], 'smith'),
    // Cánh cửa nhà nguyện đứng trước nửa trái cổng; hero đi qua nửa phải để vào.
    npc([19, 6], 'chapel-door'),
    portal([19, 5], GATE_H, 'Misty_Chapel', 'from-village'),
    portal([19, 23], GATE_H, 'Scarecrow_Lair', 'from-village'),
    portal([0, 11], GATE_V, 'Misty_Fields', 'from-village'),
    ...torches([[18, 6], [21, 6], [2, 10], [2, 13], [18, 22], [21, 22], [35, 13]]),
  ],
};

/** Nhà nguyện: gian giữa trải thảm tới bàn thờ, 3 mảnh Thánh Ngôn trong rương ở các góc. */
const MISTY_CHAPEL = {
  identifier: 'Misty_Chapel', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000004', theme: THEME.chapel,
  width: 30, height: 20, worldX: 1376, worldY: 64,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'],
    ['rect', 14, 19, 2, 1, 'R'], ['rect', 14, 4, 2, 15, 'c'], ['rect', 13, 2, 4, 1, 'A'],
    ['rect', 1, 1, 4, 3, '_'], ['rect', 25, 1, 4, 3, '_'], ['rect', 25, 16, 4, 3, '_'],
    ['at', 'n', [[11, 2], [18, 2], [12, 3], [17, 3]]],
    ['at', 'o', [[8, 5], [8, 8], [8, 11], [8, 14], [21, 5], [21, 8], [21, 11], [21, 14]]],
    ['rect', 10, 6, 3, 1, 'b'], ['rect', 17, 6, 3, 1, 'b'], ['rect', 10, 9, 3, 1, 'b'],
    ['rect', 17, 9, 3, 1, 'b'], ['rect', 10, 12, 3, 1, 'b'], ['rect', 17, 12, 3, 1, 'b'],
    ['at', 'x', [[4, 10], [25, 9]]], ['at', 'r', [[6, 16], [23, 15]]],
  ],
  entities: [
    spawn([14, 17], 'from-village'),
    chest([2, 2], 'holy-fragment-1'), chest([27, 2], 'holy-fragment-2'), chest([27, 17], 'holy-fragment-3'),
    npc([14, 3], 'chapel-altar'),
    portal([14, 19], GATE_H, 'Misty_Village', 'from-chapel'),
    ...torches([[6, 1], [23, 1], [10, 18], [19, 18], [1, 10], [28, 10]]),
  ],
};

/** Hang trùm: hồ dung nham bốn góc, vòng khe dung nham quanh đấu trường của Quỷ Bù Nhìn. */
const SCARECROW_LAIR = {
  identifier: 'Scarecrow_Lair', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000005', theme: THEME.lair,
  width: 34, height: 22, worldX: 1312, worldY: 1600,
  ops: [
    ['rect', 0, 0, 34, 22, '#'], ['rect', 1, 1, 32, 20, '.'], ['rect', 16, 0, 2, 1, 'R'],
    ['rect', 1, 1, 3, 3, 'k'], ['rect', 30, 1, 3, 3, 'k'], ['rect', 1, 18, 3, 3, 'k'], ['rect', 30, 18, 3, 3, 'k'],
    ['rect', 4, 5, 4, 3, 'L'], ['rect', 26, 5, 4, 3, 'L'], ['rect', 4, 14, 3, 3, 'L'], ['rect', 27, 14, 3, 3, 'L'],
    ['rect', 10, 9, 4, 1, 'l'], ['rect', 20, 9, 4, 1, 'l'], ['rect', 9, 10, 1, 6, 'l'], ['rect', 24, 10, 1, 6, 'l'],
    ['rect', 10, 17, 4, 1, 'l'], ['rect', 20, 17, 4, 1, 'l'],
    ['at', 'o', [[12, 4], [21, 4]]], ['at', 'x', [[6, 10], [27, 11], [15, 19], [11, 13], [22, 12]]],
  ],
  entities: [
    spawn([16, 2], 'from-village'),
    npc([16, 13], 'scarecrow'),
    portal([16, 0], GATE_H, 'Misty_Village', 'from-lair'),
    ...torches([[14, 1], [19, 1], [9, 8], [24, 8], [16, 18]]),
  ],
};

/** Lexhold phải là level đầu tiên: client mở game ở level đầu của project. */
const LEVELS = [LEXHOLD, MISTY_FIELDS, MISTY_VILLAGE, MISTY_CHAPEL, SCARECROW_LAIR];

// ---------- Giải mã lưới ký tự ----------

/** Vẽ lưới ký tự từ các lệnh: ['fill', ch] | ['rect', x, y, w, h, ch] | ['at', ch, [[x, y]...]]. */
function rasterize(spec) {
  const grid = Array.from({ length: spec.height }, () => Array(spec.width).fill('.'));
  const put = (x, y, char) => {
    if (x < 0 || y < 0 || x >= spec.width || y >= spec.height) throw new Error(`${spec.identifier}: ô (${x},${y}) ngoài level`);
    grid[y][x] = char;
  };
  for (const [op, ...args] of spec.ops) {
    if (op === 'rect') {
      const [x, y, width, height, char] = args;
      for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) put(col, row, char);
    } else if (op === 'at') {
      for (const [x, y] of args[1]) put(x, y, args[0]);
    } else throw new Error(`${spec.identifier}: lệnh "${op}" không hợp lệ`);
  }
  return grid;
}

/** Biến thể đầu tiên là chủ đạo, các biến thể sau rải thưa để nền không loang lổ như bàn cờ. */
function pick(options, x, y, seed) {
  const roll = hashNoise(x, y, seed);
  if (options.length === 1 || roll < MAIN_VARIANT_SHARE) return options[0];
  const rest = options.slice(1);
  return rest[Math.floor(((roll - MAIN_VARIANT_SHARE) / (1 - MAIN_VARIANT_SHARE)) * rest.length) % rest.length];
}

/** Ký tự → { ground, decor, solid } theo chủ đề level; ô đối tượng trong suốt vẽ chồng lên sàn. */
function decodeCell(grid, x, y, context) {
  const { theme, legend, atlas, seed } = context;
  const char = grid[y][x];
  const floor = atlas.indexByName.get(pick(theme.floor, x, y, seed));
  if (char === '#') {
    // Mặt tường lộ ra khi ô bên dưới đi được (góc nhìn 3/4 thấy mặt đứng).
    const exposed = y + 1 < grid.length && grid[y + 1][x] !== '#';
    return { ground: atlas.indexByName.get(exposed ? theme.wallFace : theme.wallTop), decor: null, solid: true };
  }
  if (char === '.') return { ground: floor, decor: null, solid: false };
  const entry = legend[char];
  if (!entry) throw new Error(`${context.identifier}: ký tự "${char}" chưa có trong bảng`);
  const tile = atlas.indexByName.get(pick(entry.tiles, x, y, seed + 1));
  if (tile === undefined) throw new Error(`${context.identifier}: tile ${entry.tiles.join('/')} không có trong atlas`);
  return atlas.objectTiles.has(tile) ? { ground: floor, decor: tile, solid: entry.solid } : { ground: tile, decor: null, solid: entry.solid };
}

function decodeLevel(spec, index, atlas, legend) {
  const grid = rasterize(spec);
  const context = { theme: spec.theme, legend, atlas, seed: index * 7 + 3, identifier: spec.identifier };
  return {
    identifier: spec.identifier,
    iid: spec.iid,
    iidTag: `c1a7e0${index + 1}`,
    index,
    worldX: spec.worldX,
    worldY: spec.worldY,
    widthCells: spec.width,
    heightCells: spec.height,
    cells: grid.map((row, y) => row.map((_char, x) => decodeCell(grid, x, y, context))),
    entities: spec.entities,
    ascii: grid.map((row) => row.join('')),
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
  const tiles = loadTiles();
  const atlas = buildAtlas(tiles);
  mkdirSync(join(ASSETS_DIR, 'tilesets'), { recursive: true });
  writePng(join(ASSETS_DIR, 'tilesets', TILESET_FILE), atlas.image);
  writeJson(join(ASSETS_DIR, 'tilesets', TILE_INDEX_FILE), Object.fromEntries(atlas.indexByName));

  const context = { tilesetRelPath: TILESET_REL_PATH, columns: ATLAS_COLUMNS };
  const levels = LEVELS.map((spec, index) => {
    const level = decodeLevel(spec, index, atlas, LEGEND);
    assertPlayable(level);
    return { json: buildLevelJson(level, context), relPath: `${MAP_NAME}/${spec.identifier}.ldtkl` };
  });
  for (const { json, relPath } of levels) writeJson(join(ASSETS_DIR, 'maps', relPath), json);
  const project = {
    iid: PROJECT_IID,
    dummyWorldIid: DUMMY_WORLD_IID,
    tileset: { identifier: 'Chapter_1', relPath: TILESET_REL_PATH, width: atlas.image.width, height: atlas.image.height, columns: ATLAS_COLUMNS, rows: atlas.rows },
  };
  writeJson(join(ASSETS_DIR, 'maps', `${MAP_NAME}.ldtk`), buildProjectJson(project, levels));

  upsertCredits([{
    ...SOURCES.herox,
    path: `tilesets/${TILESET_FILE}`,
    title: 'Atlas tile chương 1 (ghép)',
    source: 'Ghép: Dungeon Crawl Stone Soup tiles (CC0) + HeroX, vẽ bằng script',
    url: SOURCES.dcss.url,
    authors: `${SOURCES.dcss.authors}; HeroX`,
    license: 'CC0 1.0 (tile DCSS) + thuộc dự án HeroX (tile vẽ bằng script)',
    modified: `ghép bằng client/scripts/generate-chapter-1.mjs từ tiles/dcss/* (${DCSS_TILE_NAMES.length} tile, `
      + `nhuộm sương/mặt tường cho ${DERIVED_TILES.length} tile) và ${Object.keys(DRAWN_TILES).length} tile vẽ `
      + `(${Object.keys(DRAWN_TILES).join(', ')}); palette-harmonize`,
  }]);
}

main();
