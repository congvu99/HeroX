// Mô tả 2 level chương 2 (Rừng Tro) dạng lưới ký tự. Dùng chung máy sinh ở scripts/lib/generate-chapter.mjs
// và atlas Kenney chương 1. id level/entity là hợp đồng với client và dữ liệu truyện (shared/data/story/chapter-2.ts).
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

/** Mọi level cao 22 ô để khung dọc không lộ nền ngoài map. */
export const LEVEL_HEIGHT = 22;

/** '#' tường theo chủ đề, '.' sàn theo chủ đề; ký tự khác tra bảng này (chủ đề có thể ghi đè). */
export const LEGEND = {
  ',': { tiles: ['grass_tuft', 'grass'], solid: false },
  '=': { tiles: ['dirt', 'dirt_pebble', 'dirt_tuft'], solid: false },
  x: { tiles: ['grass_flowers'], solid: false },
  r: { tiles: ['sprout', 'mushroom'], solid: false },
  T: { tiles: ['tree_pine', 'tree_autumn', 'tree_cone_autumn'], solid: true },
  Y: { tiles: ['bush'], solid: true },
  o: { tiles: ['barrel'], solid: true },
  s: { tiles: ['sign'], solid: true },
};

const GRASS = ['grass', 'grass', 'grass_tuft', 'grass_flowers'];
const ASH_TREES = ['tree_autumn', 'tree_cone_autumn', 'tree_pine'];

export const THEME = {
  // Rừng cháy dở: nền cỏ xen đất, viền là hàng cây mùa thu (tông tro/nắng tà).
  forest: { floor: GRASS, wallTop: ASH_TREES, wallFace: ASH_TREES, legend: {} },
  grove: { floor: ['dirt', 'dirt', 'dirt_pebble'], wallTop: ASH_TREES, wallFace: ASH_TREES, legend: { x: { tiles: ['grass_flowers'], solid: false } } },
};

// ---------- Entity ----------
const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [2 * GRID, GRID];

/** Dải cây dưới tường bao cho đủ chiều cao; người chơi không tới được. */
const forestBand = (width, fromRow) => ['rect', 0, fromRow, width, LEVEL_HEIGHT - fromRow, 'T'];

/** Rừng Tro: cửa vào từ chương 1 ở bắc, lối mòn giữa có trận chắn, cổng xuống trảng thiêng ở nam. */
const ASH_FOREST = {
  identifier: 'Ash_Forest', iid: 'c2a7e000-0b5d-4e1f-9a02-000000000001', theme: THEME.forest,
  width: 32, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 32, 20, '#'], ['rect', 1, 1, 30, 18, '.'], forestBand(32, 20),
    // Mở tường bắc ở ô cổng về Lexhold.
    ['rect', 15, 0, 2, 1, '.'],
    // Lối mòn đất dọc từ chỗ xuất hiện (bắc) xuống cổng nam (xuyên qua mép dưới ở ô cổng).
    ['rect', 15, 1, 2, 19, '='],
    // Hàng cây chắn ngang, chừa khe giữa (cột 15-16) làm lối duy nhất xuống nam.
    ['rect', 1, 10, 14, 1, 'T'], ['rect', 17, 10, 14, 1, 'T'],
    ['at', 'T', [[5, 4], [9, 6], [24, 5], [27, 7], [6, 15], [25, 15], [10, 16]]],
    ['at', 'Y', [[3, 7], [28, 12], [8, 13]]],
    ['at', 'x', [[12, 5], [20, 6], [22, 14]]], ['at', 'r', [[7, 8], [26, 9], [13, 14]]],
    ['at', 's', [[11, 3]]],
  ],
  entities: [
    // Cổng về Lexhold (trung tâm nối các chương) ngay trên chỗ xuất hiện.
    portal([15, 0], GATE_H, 'Lexhold', 'from-ash-forest'),
    spawn([15, 2], 'from-lexhold'), spawn([15, 17], 'from-grove'),
    npc([12, 3], 'ash-warden'),
    // Trận phủ kín khe giữa hàng cây: không thắng thì không xuống nam được.
    battle([15, 10], [64, 32], 'ch2-field'),
    portal([15, 19], GATE_H, 'Ash_Stag_Grove', 'from-forest'),
    ...torches([[13, 1], [18, 1], [14, 18], [17, 18], [2, 5]]),
  ],
};

/** Trảng thiêng: khoảng đất tròn giữa rừng, Hươu Quỷ Tro đứng giữa, cổng về rừng ở bắc. */
const ASH_STAG_GROVE = {
  identifier: 'Ash_Stag_Grove', iid: 'c2a7e000-0b5d-4e1f-9a02-000000000002', theme: THEME.grove,
  width: 30, height: LEVEL_HEIGHT, worldX: 0, worldY: 704,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'], forestBand(30, 20),
    ['rect', 14, 0, 2, 1, '='], ['rect', 14, 1, 2, 4, '='],
    ['at', 'T', [[4, 4], [25, 4], [5, 15], [24, 15], [3, 10], [26, 10]]],
    ['at', 'Y', [[8, 7], [21, 7], [8, 13], [21, 13]]],
    ['at', 'x', [[13, 9], [16, 9], [13, 12], [16, 12]]], ['at', 'r', [[11, 16], [18, 16]]],
  ],
  entities: [
    spawn([14, 3], 'from-forest'),
    npc([14, 10], 'ash-stag'),
    portal([14, 0], GATE_H, 'Ash_Forest', 'from-grove'),
    ...torches([[13, 1], [16, 1], [6, 9], [23, 9], [14, 17]]),
  ],
};

/** Ash_Forest phải là level đầu tiên: client mở chương ở level đầu của project. */
export const LEVELS = [ASH_FOREST, ASH_STAG_GROVE];
