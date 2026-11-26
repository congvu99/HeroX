// Mô tả 5 level chương 1 (làng hiệp sĩ Kenney) dạng lưới ký tự + khối tile đặt sẵn (nhà, tháp, cổng).
// id level/entity là hợp đồng với client và dữ liệu truyện; toạ độ entity giữ như bản cũ để e2e và truyện không đổi.
import { GRID } from '../../../tools/lib/ldtk-project.mjs';
import { organicOps } from './organic-layout.mjs';
import { CHAPEL_FRONT_TILES, CHAPEL_GATE_COLUMN } from './chapel-front.mjs';

/** Mọi level cao 25 ô (800 px) để khung dọc 360×780 không lộ nền ngoài map. */
export const LEVEL_HEIGHT = 25;

/** '#' là tường theo chủ đề, '.' là sàn theo chủ đề; ký tự khác tra bảng này (chủ đề có thể ghi đè). */
export const LEGEND = {
  ',': { tiles: ['grass_tuft', 'grass'], solid: false },
  '=': { tiles: ['dirt', 'dirt_pebble', 'dirt_tuft'], solid: false },
  _: { tiles: ['flagstone'], solid: false },
  c: { tiles: ['flagstone'], solid: false },
  R: { tiles: ['cobble'], solid: false },
  r: { tiles: ['sprout', 'mushroom'], solid: false },
  x: { tiles: ['grass_flowers'], solid: false },
  n: { tiles: ['banner'], solid: false },
  W: { tiles: ['fence_mid'], solid: true },
  T: { tiles: ['tree_pine', 'tree_autumn'], solid: true },
  Y: { tiles: ['tree_pine', 'tree_autumn', 'tree_cone_autumn', 'bush', 'tree_cone_autumn_small'], solid: true },
  o: { tiles: ['barrel'], solid: true },
  S: { tiles: ['gargoyle'], solid: true },
  g: { tiles: ['gravestone', 'tombstone'], solid: true },
  b: { tiles: ['flagstone'], solid: true },
  h: { tiles: ['brick_wall'], solid: true },
  d: { tiles: ['wood_door'], solid: true },
  I: { tiles: ['fence_mid'], solid: true },
  L: { tiles: ['cave_rubble'], solid: true },
  l: { tiles: ['cave_gravel'], solid: true },
  A: { tiles: ['altar'], solid: true },
  F: { tiles: ['anvil'], solid: true },
  U: { tiles: ['well'], solid: true },
  k: { tiles: ['brick_wall'], solid: true },
  B: { tiles: ['bush'], solid: true },
  t: { tiles: ['target'], solid: true },
  v: { tiles: ['beehive'], solid: true },
  s: { tiles: ['sign'], solid: true },
  q: { tiles: ['sack', 'crate'], solid: true },
};

/** Cỏ trơn chiếm phần lớn, hoa rải thưa (~10%) để nền không rối. */
const GRASS = ['grass', 'grass_tuft', 'grass_tuft', 'grass_flowers'];
const FOREST = ['tree_pine', 'tree_autumn', 'tree_cone_autumn'];

export const THEME = {
  outpost: { floor: GRASS, wallTop: 'castle_battlement', wallFace: 'castle_wall', legend: {} },
  fields: { floor: GRASS, wallTop: FOREST, wallFace: FOREST, legend: { W: { tiles: ['bush'], solid: true } } },
  village: { floor: GRASS, wallTop: FOREST, wallFace: FOREST, legend: {} },
  chapel: {
    floor: ['stone_slab'], wallTop: 'pillar_wall', wallFace: 'brick_wall',
    legend: { o: { tiles: ['column'], solid: true }, b: { tiles: ['bench'], solid: true }, x: { tiles: ['skull_pile'], solid: false }, r: { tiles: ['sack'], solid: false } },
  },
  lair: {
    floor: ['cave_floor', 'cave_floor', 'cave_gravel'], wallTop: 'brick_wall', wallFace: 'brick_wall_barred',
    legend: {
      o: { tiles: ['column'], solid: true }, x: { tiles: ['skull_pile'], solid: false }, Y: { tiles: ['brick_wall'], solid: true },
      l: { tiles: ['gravestone', 'tombstone'], solid: true },
    },
  },
};

// ---------- Khối tile đặt sẵn: hàng tile theo tên, mọi ô đều chắn đường trừ khi ghi rõ ----------

const HOUSE_ORANGE = [
  ['roof_orange_left', 'roof_orange_dormer', 'roof_orange_right'],
  ['roof_orange_eave_left', 'roof_orange_eave_mid', 'roof_orange_eave_right'],
  ['wood_window', 'wood_door', 'wood_wall_right'],
];
const HOUSE_GREY = [
  ['roof_grey_left', 'roof_grey_dormer', 'roof_grey_right'],
  ['roof_grey_eave_left', 'roof_grey_eave_mid', 'roof_grey_eave_right'],
  ['stone_window', 'stone_door', 'stone_wall_right'],
];
const TOWER = [
  ['tower_top_left', 'tower_top_mid', 'tower_top_right'],
  ['tower_left', 'tower_mid', 'tower_right'],
  ['tower_base_left', 'tower_base_mid', 'tower_base_right'],
];
const GATE_ARCH = [['gate_arch_left', 'gate_arch_right']];
/** Cổng thành đóng làm cảnh (vòm + cánh cổng, không đi qua được). */
const GATE_CLOSED = [...GATE_ARCH, ['gate_left', 'gate_right']];

const house = (x, y, rows) => ['stamp', x, y, rows, true];
/** Cổng mở trên ô portal: lòng cổng phát sáng, đi qua được. */
const openGate = (x, y) => ['stamp', x, y, [['gate_left', 'gate_right']], false];

/** Mặt tiền nhà nguyện 12×4 ô, cổng vòm ở cột CHAPEL_GATE_COLUMN của hàng cuối. */
const chapelFront = (x, y) => ['stamp', x, y, CHAPEL_FRONT_TILES, true];

// ---------- Entity ----------

const spawn = (cell, spawnId) => ({ id: 'PlayerSpawn', cell, fields: { spawnId } });
const portal = (cell, size, targetLevel, targetSpawn) => ({ id: 'Portal', cell, size, fields: { targetLevel, targetSpawn } });
const npc = (cell, dialogId) => ({ id: 'Npc', cell, fields: { dialogId } });
const chest = (cell, itemId) => ({ id: 'Chest', cell, fields: { itemId } });
const battle = (cell, size, encounterId) => ({ id: 'BattleTrigger', cell, size, fields: { encounterId } });
const building = (cell, buildingId) => ({ id: 'Building', cell, size: [96, 64], fields: { buildingId } });
const torches = (cells) => cells.map((cell) => ({ id: 'Torch', cell, fields: {} }));
const GATE_H = [2 * GRID, GRID]; // cổng 2 ô ngang (cạnh trên/dưới)
const GATE_V = [GRID, 2 * GRID]; // cổng 2 ô dọc (cạnh trái/phải)

/** Dải rừng phía dưới tường bao để level đủ 25 ô; người chơi không tới được. */
const forestBand = (width, fromRow) => ['rect', 0, fromRow, width, LEVEL_HEIGHT - fromRow, 'Y'];

/** Thành Lexhold: tường thành có ụ lồi, 2 tháp phía bắc, 4 công trình hồi sinh, đường uốn ra cổng nam (qua trận hướng dẫn). */
const LEXHOLD_ENTITIES = [
  spawn([16, 10], 'start'), spawn([17, 17], 'from-fields'),
  // Chỗ đứng khi từ các chương sau đi cổng về thành (Lexhold là trung tâm nối mọi chương).
  spawn([33, 11], 'from-ash-forest'), spawn([8, 2], 'from-catacomb'), spawn([25, 2], 'from-hellmaw'), spawn([2, 8], 'from-heaven'),
  npc([15, 9], 'keeper'),
  building([4, 3], 'forge'), building([11, 3], 'arcane-tower'), building([22, 3], 'tailor'), building([29, 3], 'library'),
  // Trận hướng dẫn chắn kín hành lang cổng nam, nằm trước cổng: không đánh xong thì không ra được cánh đồng.
  battle([17, 19], [64, 64], 'tutorial'),
  portal([17, 21], GATE_H, 'Misty_Fields', 'from-lexhold'),
  // Cổng sang chương sau: level nằm ở project chương đó, client nạp project khi qua cổng.
  // Khoá theo mốc truyện và số từ ở `levelGates` của dữ liệu truyện.
  portal([35, 10], GATE_V, 'Ash_Forest', 'from-lexhold'),
  portal([8, 0], GATE_H, 'Saint_Catacomb', 'from-fields'),
  portal([25, 0], GATE_H, 'Hellmaw', 'from-fields'),
  portal([0, 7], GATE_V, 'Broken_Heaven', 'from-fields'),
  ...torches([[16, 18], [19, 18], [8, 6], [27, 6], [33, 9], [33, 12]]),
];
const LEXHOLD = {
  identifier: 'Lexhold', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000001', theme: THEME.outpost,
  width: 36, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 36, 22, '#'], ['rect', 1, 1, 34, 18, '.'], forestBand(36, 22),
    ...organicOps({
      interior: { x0: 1, y0: 1, x1: 34, y1: 18 },
      entities: LEXHOLD_ENTITIES,
      paths: [
        { points: [[17, 18], [18, 15], [16, 12], [17, 9], [17, 6]], width: 1 },
        { points: [[3, 7], [5, 5], [8, 6], [12, 5], [17, 6], [23, 5], [27, 6], [30, 5], [32, 7]], width: 1 },
        { points: [[18, 11], [21, 12], [26, 12], [30, 10], [34, 10]], width: 1 },
      ],
      groves: [
        { center: [8, 12], radius: 2, seed: 11 }, { center: [23, 16], radius: 2, seed: 12 },
        { center: [12, 16], radius: 1.5, seed: 13 }, { center: [27, 1], radius: 1.3, seed: 14 },
      ],
      treeChar: 'T',
    }),
    // Ụ tường lồi vào trong để thành không vuông vức.
    ['rect', 1, 4, 1, 3, '#'], ['rect', 9, 18, 4, 1, '#'], ['rect', 23, 18, 3, 1, '#'], ['rect', 34, 4, 1, 3, '#'], ['rect', 34, 15, 1, 3, '#'],
    ['rect', 17, 19, 2, 2, '='], ['rect', 35, 10, 1, 2, 'R'],
    ['rect', 8, 0, 2, 1, 'R'], ['rect', 25, 0, 2, 1, 'R'], ['rect', 0, 7, 1, 2, 'R'],
    ['rect', 4, 3, 3, 2, 'b'], ['rect', 11, 3, 3, 2, 'b'], ['rect', 22, 3, 3, 2, 'b'], ['rect', 29, 3, 3, 2, 'b'],
    ['at', 'S', [[14, 8], [21, 8]]], ['at', 'U', [[11, 11]]],
    ['at', 'o', [[1, 1], [34, 1], [9, 9], [26, 14], [9, 15]]],
    ['rect', 5, 9, 3, 2, ','], ['rect', 23, 13, 2, 2, ','], ['rect', 19, 1, 3, 1, ','],
    ['at', 'r', [[12, 13], [21, 16], [30, 11], [2, 2], [14, 17]]],
    ['at', 's', [[16, 9]]], ['at', 'q', [[3, 10], [24, 8]]],
    house(2, 12, HOUSE_ORANGE), house(5, 15, HOUSE_GREY), house(26, 15, HOUSE_ORANGE), house(30, 13, HOUSE_GREY),
    ['stamp', 0, 0, TOWER, true], ['stamp', 33, 0, TOWER, true], ['stamp', 17, 0, GATE_CLOSED, true],
    // Vòm cổng nam đứng trong hành lang (đi xuyên được), cánh cổng mở nằm trên ô portal.
    ['stamp', 17, 20, GATE_ARCH, false], openGate(17, 21),
  ],
  entities: LEXHOLD_ENTITIES,
};

/** Cánh đồng: dải rừng răng cưa chắn ngang, đường đất uốn qua khe có trận ch1-field, nghĩa trang rào gỗ, trại nông. */
const MISTY_FIELDS_ENTITIES = [
  spawn([21, 2], 'from-lexhold'), spawn([40, 11], 'from-village'),
  portal([21, 0], GATE_H, 'Lexhold', 'from-fields'),
  portal([43, 11], GATE_V, 'Misty_Village', 'from-fields'),
  // Khe giữa dải rừng là lối duy nhất sang phía đông; trận phủ kín khe.
  battle([30, 9], [64, 192], 'ch1-field'),
  battle([2, 17], [128, 128], 'ch1-field-roam'),
  ...torches([[20, 2], [23, 2], [41, 10], [41, 13], [29, 10], [32, 13]]),
];
const MISTY_FIELDS = {
  identifier: 'Misty_Fields', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000002', theme: THEME.fields,
  width: 44, height: LEVEL_HEIGHT, worldX: -256, worldY: 768,
  ops: [
    ['rect', 0, 0, 44, 24, '#'], ['rect', 1, 1, 42, 22, '.'], forestBand(44, 24),
    ...organicOps({
      interior: { x0: 1, y0: 1, x1: 42, y1: 22 },
      entities: MISTY_FIELDS_ENTITIES,
      paths: [{ points: [[21, 1], [20, 4], [22, 7], [21, 10], [25, 12], [29, 11], [33, 11], [37, 12], [42, 11]], width: 1 }],
      groves: [
        { center: [29, 4], radius: 2.2, seed: 22 }, { center: [32, 6], radius: 1.6, seed: 23 },
        { center: [29, 19], radius: 2.2, seed: 24 }, { center: [32, 17], radius: 1.6, seed: 25 },
        { center: [15, 5], radius: 2, seed: 26 }, { center: [10, 17], radius: 2, seed: 27 },
        { center: [25, 18], radius: 2, seed: 28 }, { center: [38, 5], radius: 2.2, seed: 29 },
        { center: [17, 15], radius: 1.5, seed: 30 },
      ],
      ragged: { depth: 2, seed: 21 },
    }),
    // Lõi dải rừng: hai cột kín để khe trận là lối duy nhất; cụm cây quanh lõi làm mép răng cưa.
    ['rect', 30, 1, 2, 8, 'Y'], ['rect', 30, 15, 2, 8, 'Y'],
    ['rect', 21, 0, 2, 1, 'R'], ['rect', 43, 11, 1, 2, 'R'],
    ['rect', 3, 4, 10, 7, '_'], ['rect', 3, 3, 10, 1, 'I'], ['rect', 3, 11, 8, 1, 'I'],
    ['at', 'g', [[4, 5], [7, 5], [10, 6], [5, 7], [8, 8], [11, 9], [4, 9], [7, 10]]],
    ['at', 'W', [[14, 8], [15, 10], [24, 16], [26, 15], [36, 15], [40, 6]]],
    ['rect', 5, 14, 3, 2, ','], ['rect', 34, 17, 3, 2, ','],
    ['at', 'x', [[17, 13], [27, 7], [39, 16]]], ['at', 'r', [[18, 6], [34, 9], [11, 14]]],
    ['at', 't', [[18, 9]]], ['at', 'v', [[37, 21]]],
    house(33, 19, HOUSE_ORANGE),
  ],
  entities: MISTY_FIELDS_ENTITIES,
};

/** Làng: nhà nguyện phía bắc, nhà dân rải lệch quanh đường uốn, lò rèn phía đông nam, lối xuống hầm trùm phía nam. */
const CHAPEL_X = 14;
const MISTY_VILLAGE_ENTITIES = [
  spawn([2, 11], 'from-fields'), spawn([20, 8], 'from-chapel'), spawn([19, 20], 'from-lair'),
  npc([5, 9], 'hollow-villager'),
  npc([33, 14], 'smith'),
  // Cánh cửa nhà nguyện đứng trước nửa trái cổng; hero đi qua nửa phải để vào.
  npc([19, 6], 'chapel-door'),
  portal([19, 5], GATE_H, 'Misty_Chapel', 'from-village'),
  portal([19, 23], GATE_H, 'Scarecrow_Lair', 'from-village'),
  portal([0, 11], GATE_V, 'Misty_Fields', 'from-village'),
  ...torches([[18, 6], [21, 6], [2, 10], [2, 13], [18, 22], [21, 22], [35, 13]]),
];
const MISTY_VILLAGE = {
  identifier: 'Misty_Village', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000003', theme: THEME.village,
  width: 40, height: LEVEL_HEIGHT, worldX: 1216, worldY: 768,
  ops: [
    ['rect', 0, 0, 40, 24, '#'], ['rect', 1, 1, 38, 22, '.'], forestBand(40, 24),
    ...organicOps({
      interior: { x0: 1, y0: 1, x1: 38, y1: 22 },
      entities: MISTY_VILLAGE_ENTITIES,
      paths: [
        { points: [[1, 11], [6, 12], [11, 10], [16, 11], [20, 12], [25, 13], [30, 11], [35, 12], [38, 11]], width: 1 },
        { points: [[19, 6], [20, 9], [18, 13], [19, 17], [20, 20], [19, 22]], width: 1 },
      ],
      groves: [
        { center: [12, 16], radius: 2, seed: 41 }, { center: [11, 5], radius: 1.5, seed: 42 },
        { center: [33, 9], radius: 1.8, seed: 43 }, { center: [14, 20], radius: 1.8, seed: 44 },
      ],
      ragged: { depth: 2, seed: 31 },
    }),
    ['rect', 0, 11, 1, 2, 'R'], ['rect', 19, 23, 2, 1, 'R'],
    // Cửa nhà nguyện nằm sẵn trong ảnh mặt tiền; ô portal ngay dưới là lối đất.
    chapelFront(CHAPEL_X, 1), ['rect', CHAPEL_X + CHAPEL_GATE_COLUMN, 5, 2, 1, '='],
    house(3, 4, HOUSE_ORANGE), house(8, 2, HOUSE_GREY), house(28, 6, HOUSE_GREY), house(33, 2, HOUSE_ORANGE),
    house(3, 16, HOUSE_GREY), house(9, 14, HOUSE_ORANGE), house(27, 16, HOUSE_ORANGE), house(34, 17, HOUSE_GREY),
    ['at', 'F', [[31, 14], [32, 14]]], ['at', 'U', [[25, 8]]],
    ['at', 'g', [[23, 17], [25, 18], [24, 20], [26, 20], [22, 19]]],
    ['at', 'W', [[11, 7], [12, 8], [37, 9], [12, 19]]],
    ['rect', 8, 8, 3, 2, ','], ['rect', 22, 14, 3, 2, ','],
    ['at', 'r', [[13, 15], [36, 20], [27, 9]]], ['at', 'x', [[25, 21]]], ['at', 'q', [[29, 14]]], ['at', 's', [[2, 9]]],
  ],
  entities: MISTY_VILLAGE_ENTITIES,
};

/** Nhà nguyện đá: gian giữa lát đá tới bàn thờ, hàng ghế hai bên, 3 mảnh Thánh Ngôn trong rương ở các góc. */
const MISTY_CHAPEL = {
  identifier: 'Misty_Chapel', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000004', theme: THEME.chapel,
  width: 30, height: LEVEL_HEIGHT, worldX: 1376, worldY: 64,
  ops: [
    ['rect', 0, 0, 30, 20, '#'], ['rect', 1, 1, 28, 18, '.'], ['rect', 0, 20, 30, LEVEL_HEIGHT - 20, 'k'],
    ['rect', 14, 19, 2, 1, 'R'], ['rect', 14, 4, 2, 15, 'c'], ['rect', 13, 2, 4, 1, 'A'],
    ['rect', 1, 1, 4, 3, '_'], ['rect', 25, 1, 4, 3, '_'], ['rect', 25, 16, 4, 3, '_'],
    ['at', 'n', [[11, 2], [18, 2], [12, 3], [17, 3]]],
    ['at', 'o', [[8, 5], [8, 8], [8, 11], [8, 14], [21, 5], [21, 8], [21, 11], [21, 14]]],
    ['rect', 10, 6, 3, 1, 'b'], ['rect', 17, 6, 3, 1, 'b'], ['rect', 10, 9, 3, 1, 'b'],
    ['rect', 17, 9, 3, 1, 'b'], ['rect', 10, 12, 3, 1, 'b'], ['rect', 17, 12, 3, 1, 'b'],
    ['at', 'x', [[4, 10], [25, 9]]], ['at', 'r', [[6, 16], [23, 15]]],
    ['at', 'h', [[6, 0], [23, 0]]], ['stamp', 10, 0, [['brick_wall_barred']], true], ['stamp', 19, 0, [['brick_wall_barred']], true],
  ],
  entities: [
    spawn([14, 17], 'from-village'),
    chest([2, 2], 'holy-fragment-1'), chest([27, 2], 'holy-fragment-2'), chest([27, 17], 'holy-fragment-3'),
    npc([14, 3], 'chapel-altar'),
    portal([14, 19], GATE_H, 'Misty_Village', 'from-chapel'),
    ...torches([[6, 1], [23, 1], [10, 18], [19, 18], [1, 10], [28, 10]]),
  ],
};

/** Hầm trùm dưới sân sau đổ nát: bốn góc đá vụn, vòng sỏi quanh đấu trường của Quỷ Bù Nhìn. */
const SCARECROW_LAIR = {
  identifier: 'Scarecrow_Lair', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000005', theme: THEME.lair,
  width: 34, height: LEVEL_HEIGHT, worldX: 1312, worldY: 1600,
  ops: [
    ['rect', 0, 0, 34, 22, '#'], ['rect', 1, 1, 32, 20, '.'], forestBand(34, 22), ['rect', 16, 0, 2, 1, 'R'],
    ['rect', 1, 1, 3, 3, 'k'], ['rect', 30, 1, 3, 3, 'k'], ['rect', 1, 18, 3, 3, 'k'], ['rect', 30, 18, 3, 3, 'k'],
    ['rect', 4, 5, 4, 3, 'L'], ['rect', 26, 5, 4, 3, 'L'], ['rect', 4, 14, 3, 3, 'L'], ['rect', 27, 14, 3, 3, 'L'],
    ['rect', 10, 9, 4, 1, 'l'], ['rect', 20, 9, 4, 1, 'l'], ['rect', 9, 10, 1, 6, 'l'], ['rect', 24, 10, 1, 6, 'l'],
    ['rect', 10, 17, 4, 1, 'l'], ['rect', 20, 17, 4, 1, 'l'],
    ['at', 'o', [[12, 4], [21, 4]]], ['at', 'x', [[6, 10], [27, 11], [15, 19], [11, 13], [22, 12]]],
    ['at', 'n', [[13, 1], [20, 1]]],
  ],
  entities: [
    spawn([16, 2], 'from-village'),
    npc([16, 13], 'scarecrow'),
    portal([16, 0], GATE_H, 'Misty_Village', 'from-lair'),
    ...torches([[14, 1], [19, 1], [9, 8], [24, 8], [16, 18]]),
  ],
};

/** Lexhold phải là level đầu tiên: client mở game ở level đầu của project. */
export const LEVELS = [LEXHOLD, MISTY_FIELDS, MISTY_VILLAGE, MISTY_CHAPEL, SCARECROW_LAIR];
