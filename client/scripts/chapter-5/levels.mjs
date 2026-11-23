// Mô tả 2 level chương 5 (Thiên Cung Vỡ) dạng lưới ký tự. Dùng chung máy sinh scripts/lib/generate-chapter.mjs
// và atlas Kenney chương 1. id level/entity là hợp đồng với client và dữ liệu truyện (shared/data/story/chapter-5.ts).
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

/** Mọi level cao 22 ô để khung dọc không lộ nền ngoài map. */
export const LEVEL_HEIGHT = 22;

/** '#' tường theo chủ đề, '.' sàn theo chủ đề; ký tự khác tra bảng này (chủ đề có thể ghi đè). */
export const LEGEND = {
  _: { tiles: ['stone_slab'], solid: false },
  R: { tiles: ['flagstone'], solid: false },
  o: { tiles: ['column'], solid: true },
  A: { tiles: ['altar'], solid: true },
  n: { tiles: ['banner'], solid: false },
  x: { tiles: ['grass_flowers'], solid: false },
  k: { tiles: ['pillar_wall'], solid: true },
};

export const THEME = {
  // Thiên cung đá trắng: sàn phiến đá sáng, viền cột và tường trụ (tông "Thánh quang").
  heaven: { floor: ['stone_slab', 'flagstone'], wallTop: 'pillar_wall', wallFace: 'brick_wall', legend: {} },
  sanctum: { floor: ['stone_slab'], wallTop: 'pillar_wall', wallFace: 'brick_wall', legend: {} },
};

// ---------- Entity ----------
const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [2 * GRID, GRID];

const wallBand = (width, fromRow) => ['rect', 0, fromRow, width, LEVEL_HEIGHT - fromRow, 'k'];

/** Tiền sảnh thiên cung: hàng cột đôi bên, bậc đá vỡ chắn lối giữa, cổng vào nội điện ở nam. */
const BROKEN_HEAVEN = {
  identifier: 'Broken_Heaven', iid: 'c5a7e000-0b5d-4e1f-9a05-000000000001', theme: THEME.heaven,
  width: 32, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 32, 20, '#'], ['rect', 1, 1, 30, 18, '.'], wallBand(32, 20),
    ['rect', 15, 1, 2, 19, '_'],
    // Hàng cột chắn ngang, chừa khe giữa (cột 15-16).
    ['rect', 1, 10, 14, 1, 'o'], ['rect', 17, 10, 14, 1, 'o'],
    ['at', 'o', [[5, 4], [26, 4], [5, 15], [26, 15]]],
    ['at', 'A', [[9, 6], [22, 6]]],
    ['at', 'x', [[12, 5], [20, 6], [11, 15], [21, 14]]], ['at', 'n', [[12, 2], [19, 2]]],
  ],
  entities: [
    spawn([15, 2], 'from-fields'), spawn([15, 17], 'from-sanctum'),
    npc([12, 3], 'gate-seraph'),
    battle([15, 10], [64, 32], 'ch5-field'),
    portal([15, 19], GATE_H, 'Fallen_Sanctum', 'from-heaven'),
    ...torches([[13, 1], [18, 1], [14, 18], [17, 18], [2, 5]]),
  ],
};

/** Nội điện: bậc thờ phía bắc, Thiên Thần Sa Ngã giữa gian, cổng về tiền sảnh ở bắc. */
const FALLEN_SANCTUM = {
  identifier: 'Fallen_Sanctum', iid: 'c5a7e000-0b5d-4e1f-9a05-000000000002', theme: THEME.sanctum,
  width: 30, height: LEVEL_HEIGHT, worldX: 0, worldY: 704,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'], wallBand(30, 20),
    ['rect', 14, 0, 2, 1, '_'], ['rect', 14, 1, 2, 5, '_'],
    ['at', 'A', [[4, 2], [25, 2]]],
    ['at', 'o', [[6, 6], [23, 6], [6, 13], [23, 13]]],
    ['at', 'x', [[12, 16], [17, 16]]], ['at', 'n', [[11, 1], [18, 1]]],
  ],
  entities: [
    spawn([14, 7], 'from-heaven'),
    npc([14, 11], 'fallen-angel'),
    portal([14, 0], GATE_H, 'Broken_Heaven', 'from-sanctum'),
    ...torches([[13, 1], [16, 1], [5, 9], [24, 9], [14, 17]]),
  ],
};

/** Broken_Heaven phải là level đầu tiên: client mở chương ở level đầu của project. */
export const LEVELS = [BROKEN_HEAVEN, FALLEN_SANCTUM];
