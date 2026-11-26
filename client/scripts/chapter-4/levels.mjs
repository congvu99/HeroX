// Mô tả 2 level chương 4 (Vực Lửa) dạng lưới ký tự. Dùng chung máy sinh scripts/lib/generate-chapter.mjs
// và atlas Kenney chương 1. id level/entity là hợp đồng với client và dữ liệu truyện (shared/data/story/chapter-4.ts).
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

/** Mọi level cao 22 ô để khung dọc không lộ nền ngoài map. */
export const LEVEL_HEIGHT = 22;

/** '#' tường theo chủ đề, '.' sàn theo chủ đề; ký tự khác tra bảng này (chủ đề có thể ghi đè). */
export const LEGEND = {
  _: { tiles: ['cave_floor'], solid: false },
  L: { tiles: ['cave_rubble'], solid: true },
  l: { tiles: ['cave_gravel'], solid: false },
  o: { tiles: ['column'], solid: true },
  S: { tiles: ['gargoyle'], solid: true },
  x: { tiles: ['skull_pile'], solid: false },
  g: { tiles: ['gravestone'], solid: true },
  k: { tiles: ['brick_wall'], solid: true },
};

export const THEME = {
  // Vực dung nham: sàn hang tối, viền gạch đổ (tông đỏ/tím do ánh sáng).
  hellmaw: { floor: ['cave_floor', 'cave_floor', 'cave_gravel'], wallTop: 'brick_wall', wallFace: 'brick_wall_barred', legend: {} },
  throne: { floor: ['cave_floor', 'cave_rubble'], wallTop: 'brick_wall', wallFace: 'brick_wall_barred', legend: { L: { tiles: ['cave_rubble'], solid: true } } },
};

// ---------- Entity ----------
const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [2 * GRID, GRID];

const wallBand = (width, fromRow) => ['rect', 0, fromRow, width, LEVEL_HEIGHT - fromRow, 'k'];

/** Lòng vực: cầu đá qua hai bờ dung nham, lũ quỷ lửa chắn nhịp giữa, cổng qua ngai ở nam. */
const HELLMAW = {
  identifier: 'Hellmaw', iid: 'c4a7e000-0b5d-4e1f-9a04-000000000001', theme: THEME.hellmaw,
  width: 32, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 32, 20, '#'], ['rect', 1, 1, 30, 18, '.'], wallBand(32, 20),
    // Mở tường bắc ở ô cổng về Lexhold.
    ['rect', 15, 0, 2, 1, '.'],
    ['rect', 15, 1, 2, 19, '_'],
    // Đá đổ chắn ngang, chừa nhịp cầu giữa (cột 15-16).
    ['rect', 1, 10, 14, 1, 'L'], ['rect', 17, 10, 14, 1, 'L'],
    ['at', 'L', [[5, 4], [26, 4], [5, 15], [26, 15]]],
    ['at', 'o', [[9, 6], [22, 6], [9, 14], [22, 14]]],
    ['at', 'S', [[3, 8], [28, 8]]],
    ['at', 'x', [[12, 5], [20, 6], [11, 15], [21, 14]]], ['at', 'l', [[8, 12], [24, 7]]],
  ],
  entities: [
    // Cổng về Lexhold (trung tâm nối các chương) ngay trên chỗ xuất hiện.
    portal([15, 0], GATE_H, 'Lexhold', 'from-hellmaw'),
    spawn([15, 2], 'from-fields'), spawn([15, 17], 'from-throne'),
    npc([12, 3], 'chained-soul'),
    battle([15, 10], [64, 32], 'ch4-field'),
    portal([15, 19], GATE_H, 'Antonym_Throne', 'from-hellmaw'),
    ...torches([[13, 1], [18, 1], [14, 18], [17, 18], [2, 5]]),
  ],
};

/** Ngai Ngược Nghĩa: bệ đá giữa lòng vực, Chúa Quỷ đứng giữa, cổng về lòng vực ở bắc. */
const ANTONYM_THRONE = {
  identifier: 'Antonym_Throne', iid: 'c4a7e000-0b5d-4e1f-9a04-000000000002', theme: THEME.throne,
  width: 30, height: LEVEL_HEIGHT, worldX: 0, worldY: 704,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'], wallBand(30, 20),
    ['rect', 14, 0, 2, 1, '_'], ['rect', 14, 1, 2, 5, '_'],
    ['at', 'L', [[4, 4], [25, 4], [4, 15], [25, 15]]],
    ['at', 'o', [[7, 7], [22, 7], [7, 13], [22, 13]]],
    ['at', 'x', [[12, 16], [17, 16]]], ['at', 'g', [[10, 2], [19, 2]]],
  ],
  entities: [
    spawn([14, 7], 'from-hellmaw'),
    npc([14, 11], 'antonym-demon'),
    portal([14, 0], GATE_H, 'Hellmaw', 'from-throne'),
    ...torches([[13, 1], [16, 1], [5, 9], [24, 9], [14, 17]]),
  ],
};

/** Hellmaw phải là level đầu tiên: client mở chương ở level đầu của project. */
export const LEVELS = [HELLMAW, ANTONYM_THRONE];
