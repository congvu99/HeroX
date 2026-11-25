// Ghép nền bằng tileset Wang góc (PixelLab): mỗi ô chọn ảnh theo 4 góc NW/NE/SW/SE thuộc địa hình nào.
// Dùng chung cho máy sinh map chương 1 và chương 2–5: đường đất có mép liền mạch với cỏ, tường thành nối liền mọi hướng.

/** Tên ô trong atlas: `<tiền tố><mặt nạ>`, mặt nạ góc địa hình NW=8, NE=4, SW=2, SE=1 (15 = phủ kín). */
export const GRASS_PATH_TILE_PREFIX = 'grass_path_';
export const CASTLE_WALL_TILE_PREFIX = 'castle_wall_';
const CORNER_BITS = { NW: 8, NE: 4, SW: 2, SE: 1 };
const FULL_MASK = 15;

/** Ô nền ngoài trời được thay bằng tileset cỏ ↔ đường; đá lát, sàn đá, hầm giữ nguyên. */
const OUTDOOR_GROUND_TILES = ['grass', 'grass_tuft', 'grass_flowers', 'dirt', 'dirt_pebble', 'dirt_tuft'];
const PATH_FLOOR_TILES = new Set(['dirt', 'dirt_pebble', 'dirt_tuft']);
const CASTLE_WALL_TILES = ['castle_battlement', 'castle_wall'];
/** Khối đặt sẵn nằm trong tường thành (tháp, cổng vòm): coi là tường để chân tường quanh chúng không hở. */
const CASTLE_STAMP_PREFIXES = ['tower_', 'gate_'];
const PATH_CHAR = '=';
const FLOOR_CHAR = '.';

export function tileName(prefix, mask) {
  return `${prefix}${mask}`;
}

export function grassPathTileName(mask) {
  return tileName(GRASS_PATH_TILE_PREFIX, mask);
}

/** Sàn chủ đạo của chủ đề là đất (vd. trảng rừng chương 2) thì cả ô sàn '.' coi là đường. */
export function themeFloorIsPath(floor) {
  return PATH_FLOOR_TILES.has([floor].flat()[0]);
}

/**
 * Mặt nạ góc của một ô tileset từ bảng góc API (`{ NW: 'upper' | 'lower', ... }`). `terrain` là địa hình được
 * vẽ thành đường/tường: PixelLab không luôn vẽ đúng lower/upper theo mô tả, nên ghi theo ảnh thật trong file góc.
 */
export function cornerMask(corners, terrain) {
  return Object.entries(CORNER_BITS).reduce((mask, [corner, bit]) => (corners[corner] === terrain ? mask | bit : mask), 0);
}

/**
 * Mặt nạ của ô (x, y). Quy tắc `any`: góc thuộc địa hình khi BẤT KỲ ô chạm góc thuộc địa hình (đường rộng 1 ô vẫn
 * hiện, mép tràn nhẹ sang cỏ). Quy tắc `all`: khi MỌI ô chạm góc nằm trong map đều thuộc địa hình (tường không lấn
 * sang ô đi được; ô ngoài map không tính).
 */
function cellMask(inTerrain, inBounds, rule, x, y) {
  const vertex = (vx, vy) => {
    const touching = [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]].filter(([cx, cy]) => inBounds(cx, cy));
    return rule === 'any' ? touching.some(([cx, cy]) => inTerrain(cx, cy)) : touching.every(([cx, cy]) => inTerrain(cx, cy));
  };
  return (vertex(x, y) ? CORNER_BITS.NW : 0)
    | (vertex(x + 1, y) ? CORNER_BITS.NE : 0)
    | (vertex(x, y + 1) ? CORNER_BITS.SW : 0)
    | (vertex(x + 1, y + 1) ? CORNER_BITS.SE : 0);
}

/**
 * Thay nền các ô `replaceable` bằng ô tileset `prefix` theo góc. Atlas chưa có tileset (thiếu ô phủ kín) thì trả
 * nguyên `cells` (lùi về Kenney). Ô ở layer Decor (cây, nhà) giữ nguyên, chỉ đổi nền bên dưới.
 */
function applyCornerAutotile(grid, cells, atlas, { prefix, inTerrain, replaceable, rule }) {
  if (atlas.indexByName.get(tileName(prefix, FULL_MASK)) === undefined) return cells;
  const inBounds = (x, y) => y >= 0 && y < grid.length && x >= 0 && x < grid[y].length;
  return cells.map((row, y) => row.map((cell, x) => {
    if (!replaceable(cell, x, y)) return cell;
    return { ...cell, ground: atlas.indexByName.get(tileName(prefix, cellMask(inTerrain, inBounds, rule, x, y))) };
  }));
}

/** Cỏ ↔ đường đất. Level có sàn chủ đạo là đất (`floorIsPath`) coi cả ô sàn '.' là đường, cỏ chỉ còn quanh cây, tường. */
export function applyGrassPathAutotile(grid, cells, atlas, { floorIsPath = false } = {}) {
  const outdoor = new Set(OUTDOOR_GROUND_TILES.map((name) => atlas.indexByName.get(name)));
  return applyCornerAutotile(grid, cells, atlas, {
    prefix: GRASS_PATH_TILE_PREFIX,
    rule: 'any',
    inTerrain: (x, y) => grid[y][x] === PATH_CHAR || (floorIsPath && grid[y][x] === FLOOR_CHAR),
    replaceable: (cell) => outdoor.has(cell.ground),
  });
}

/**
 * Tường thành ↔ cỏ: chỉ đổi ô tường (nhận biết qua ô Kenney castle_* hoặc khối tháp/cổng), ô đi được giữ nguyên.
 * Quy tắc `all` nên mép tường giáp cỏ hiện nửa ô cỏ: tường nhìn mỏng hơn vùng chắn, không bao giờ lấn ô đi được.
 */
export function applyCastleWallAutotile(grid, cells, atlas) {
  const wallTiles = new Set(CASTLE_WALL_TILES.map((name) => atlas.indexByName.get(name)));
  const isCastleStamp = (value) => typeof value === 'object' && CASTLE_STAMP_PREFIXES.some((prefix) => value.tile.startsWith(prefix));
  const isWall = (x, y) => wallTiles.has(cells[y][x].ground) || isCastleStamp(grid[y][x]);
  return applyCornerAutotile(grid, cells, atlas, {
    prefix: CASTLE_WALL_TILE_PREFIX,
    rule: 'all',
    inTerrain: isWall,
    // Tháp/cổng còn là ô Kenney đặc (nằm ở nền) thì giữ; đã thay bằng ảnh trong suốt (ở Decor) thì lót tường bên dưới.
    replaceable: (cell, x, y) => wallTiles.has(cell.ground) || (isCastleStamp(grid[y][x]) && cell.decor !== null),
  });
}
