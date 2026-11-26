// Mô tả 2 level chương 3 (Hầm Mộ Thánh) dạng lưới ký tự. Dùng chung máy sinh scripts/lib/generate-chapter.mjs
// và atlas Kenney chương 1. id level/entity là hợp đồng với client và dữ liệu truyện (shared/data/story/chapter-3.ts).
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

/** Mọi level cao 22 ô để khung dọc không lộ nền ngoài map. */
export const LEVEL_HEIGHT = 22;

/** '#' tường theo chủ đề, '.' sàn theo chủ đề; ký tự khác tra bảng này (chủ đề có thể ghi đè). */
export const LEGEND = {
  _: { tiles: ['flagstone'], solid: false },
  R: { tiles: ['cobble'], solid: false },
  o: { tiles: ['column'], solid: true },
  g: { tiles: ['gravestone', 'tombstone'], solid: true },
  S: { tiles: ['gargoyle'], solid: true },
  x: { tiles: ['skull_pile'], solid: false },
  n: { tiles: ['banner'], solid: false },
  A: { tiles: ['altar'], solid: true },
  b: { tiles: ['bench'], solid: true },
  k: { tiles: ['brick_wall'], solid: true },
};

export const THEME = {
  // Hầm mộ đá: sàn phiến đá, tường gạch có song sắt.
  catacomb: { floor: ['flagstone', 'flagstone', 'cave_gravel'], wallTop: 'brick_wall', wallFace: 'brick_wall_barred', legend: {} },
  sanctum: { floor: ['stone_slab', 'flagstone'], wallTop: 'pillar_wall', wallFace: 'brick_wall', legend: {} },
};

// ---------- Entity ----------
const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [2 * GRID, GRID];

/** Dải tường đá dưới biên cho đủ chiều cao; người chơi không tới được. */
const wallBand = (width, fromRow) => ['rect', 0, fromRow, width, LEVEL_HEIGHT - fromRow, 'k'];

/** Gian mộ: hàng cột đôi bên, hàng xương kỵ sĩ chắn lối giữa, cổng xuống hậu đường ở nam. */
const SAINT_CATACOMB = {
  identifier: 'Saint_Catacomb', iid: 'c3a7e000-0b5d-4e1f-9a03-000000000001', theme: THEME.catacomb,
  width: 32, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 32, 20, '#'], ['rect', 1, 1, 30, 18, '.'], wallBand(32, 20),
    // Mở tường bắc ở ô cổng về Lexhold.
    ['rect', 15, 0, 2, 1, '.'],
    ['rect', 15, 1, 2, 19, '_'],
    // Hàng cột + mộ chắn ngang, chừa khe giữa (cột 15-16).
    ['rect', 1, 10, 14, 1, 'g'], ['rect', 17, 10, 14, 1, 'g'],
    ['at', 'o', [[5, 4], [26, 4], [5, 15], [26, 15]]],
    ['at', 'g', [[9, 6], [22, 6], [9, 14], [22, 14]]],
    ['at', 'S', [[3, 8], [28, 8]]],
    ['at', 'x', [[12, 5], [20, 6], [11, 15], [21, 14]]], ['at', 'n', [[12, 2], [19, 2]]],
  ],
  entities: [
    // Cổng về Lexhold (trung tâm nối các chương) ngay trên chỗ xuất hiện.
    portal([15, 0], GATE_H, 'Lexhold', 'from-catacomb'),
    spawn([15, 2], 'from-fields'), spawn([15, 17], 'from-sanctum'),
    npc([12, 3], 'crypt-warden'),
    battle([15, 10], [64, 32], 'ch3-field'),
    portal([15, 19], GATE_H, 'Bishop_Sanctum', 'from-catacomb'),
    ...torches([[13, 1], [18, 1], [14, 18], [17, 18], [2, 5]]),
  ],
};

/** Hậu đường: bàn thờ phía bắc, Giám Mục Mất Tên giữa gian, cổng về gian mộ ở bắc. */
const BISHOP_SANCTUM = {
  identifier: 'Bishop_Sanctum', iid: 'c3a7e000-0b5d-4e1f-9a03-000000000002', theme: THEME.sanctum,
  width: 30, height: LEVEL_HEIGHT, worldX: 0, worldY: 704,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'], wallBand(30, 20),
    ['rect', 14, 0, 2, 1, '_'], ['rect', 14, 1, 2, 5, '_'],
    ['at', 'A', [[4, 2], [25, 2]]],
    ['at', 'o', [[6, 6], [23, 6], [6, 13], [23, 13]]],
    ['at', 'b', [[9, 9], [20, 9], [9, 11], [20, 11]]],
    ['at', 'x', [[12, 16], [17, 16]]], ['at', 'n', [[11, 1], [18, 1]]],
  ],
  entities: [
    spawn([14, 7], 'from-catacomb'),
    npc([14, 11], 'nameless-bishop'),
    portal([14, 0], GATE_H, 'Saint_Catacomb', 'from-sanctum'),
    ...torches([[13, 1], [16, 1], [5, 9], [24, 9], [14, 17]]),
  ],
};

/** Saint_Catacomb phải là level đầu tiên: client mở chương ở level đầu của project. */
export const LEVELS = [SAINT_CATACOMB, BISHOP_SANCTUM];
