// Mô tả 5 level chương 1 (làng hiệp sĩ Kenney) dạng lưới ký tự + khối tile đặt sẵn (nhà, tháp, cổng).
// id level/entity là hợp đồng với client và dữ liệu truyện; toạ độ entity giữ như bản cũ để e2e và truyện không đổi.
import { GRID } from '../../../tools/lib/ldtk-project.mjs';

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
  ['tower_left', 'stone_slab', 'tower_right'],
  ['tower_base_left', 'tower_base_mid', 'tower_base_right'],
];
/** Cổng vòm đóng làm cảnh (không đi qua được). */
const GATE_CLOSED = [['gate_arch_left', 'gate_arch_right']];

const house = (x, y, rows) => ['stamp', x, y, rows, true];
/** Cổng mở trên ô portal: lòng cổng phát sáng, đi qua được. */
const openGate = (x, y) => ['stamp', x, y, [['gate_left', 'gate_right']], false];

/** Mặt tiền nhà nguyện rộng `width` ô: mái xám, tường đá có cửa sổ, cổng vòm ở giữa. */
function chapelFront(x, y, width, gateColumn) {
  const middle = (left, mid, right, at = () => mid) => [left, ...Array.from({ length: width - 2 }, (_, index) => at(index + 1)), right];
  const window = (column) => (column % 3 === 1 ? 'stone_window' : 'stone_wall_mid');
  const gate = (pair) => (column) => (column === gateColumn ? pair[0] : column === gateColumn + 1 ? pair[1] : window(column));
  return [
    ['stamp', x, y, [
      middle('roof_grey_left', 'roof_grey_mid', 'roof_grey_right', (column) => (column === gateColumn || column === gateColumn + 1 ? 'roof_grey_dormer' : 'roof_grey_mid')),
      middle('roof_grey_eave_left', 'roof_grey_eave_mid', 'roof_grey_eave_right'),
      middle('stone_wall_left', 'stone_wall_mid', 'stone_wall_right', window),
      middle('stone_wall_left', 'stone_wall_mid', 'stone_wall_right', gate(['gate_arch_left', 'gate_arch_right'])),
    ], true],
  ];
}

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

/** Thành Lexhold: tường thành + 2 tháp phía bắc, 4 công trình hồi sinh, cổng nam ra cánh đồng (qua trận hướng dẫn). */
const LEXHOLD = {
  identifier: 'Lexhold', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000001', theme: THEME.outpost,
  width: 36, height: LEVEL_HEIGHT, worldX: 0, worldY: 0,
  ops: [
    ['rect', 0, 0, 36, 22, '#'], ['rect', 1, 1, 34, 18, '.'], forestBand(36, 22),
    ['rect', 3, 5, 30, 1, '='], ['rect', 17, 5, 2, 14, '='], ['rect', 19, 10, 16, 2, '='],
    ['rect', 17, 19, 2, 2, '='], ['rect', 35, 10, 1, 2, 'R'],
    ['rect', 4, 3, 3, 2, 'b'], ['rect', 11, 3, 3, 2, 'b'], ['rect', 22, 3, 3, 2, 'b'], ['rect', 29, 3, 3, 2, 'b'],
    ['at', 'S', [[15, 7], [20, 7]]], ['at', 'U', [[11, 11]]],
    ['at', 'o', [[1, 1], [34, 1], [9, 9], [26, 14], [9, 15]]],
    ['rect', 5, 9, 3, 2, ','], ['rect', 23, 13, 3, 2, ','], ['rect', 28, 1, 3, 1, ','],
    ['at', 'r', [[12, 13], [21, 16], [30, 12], [2, 2], [14, 17]]],
    ['at', 'T', [[2, 8], [32, 7], [13, 1], [23, 1]]], ['at', 's', [[16, 9]]], ['at', 'q', [[3, 10], [24, 8]]],
    house(1, 14, HOUSE_ORANGE), house(5, 16, HOUSE_GREY), house(27, 15, HOUSE_ORANGE), house(30, 15, HOUSE_GREY),
    ['stamp', 0, 0, TOWER, true], ['stamp', 33, 0, TOWER, true], ['stamp', 17, 0, GATE_CLOSED, true],
    openGate(17, 21),
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

/** Cánh đồng: hàng cây chắn ngang, đường đất đi qua khe có trận ch1-field, nghĩa trang rào gỗ, trại nông. */
const MISTY_FIELDS = {
  identifier: 'Misty_Fields', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000002', theme: THEME.fields,
  width: 44, height: LEVEL_HEIGHT, worldX: -256, worldY: 768,
  ops: [
    ['rect', 0, 0, 44, 24, '#'], ['rect', 1, 1, 42, 22, '.'], forestBand(44, 24),
    ['rect', 21, 0, 2, 1, 'R'], ['rect', 43, 11, 1, 2, 'R'],
    ['rect', 21, 1, 2, 11, '='], ['rect', 21, 11, 22, 2, '='],
    ['rect', 30, 1, 2, 8, 'T'], ['rect', 30, 15, 2, 8, 'T'],
    ['rect', 3, 4, 10, 7, '_'], ['rect', 3, 3, 10, 1, 'I'], ['rect', 3, 11, 8, 1, 'I'],
    ['at', 'g', [[4, 5], [6, 5], [8, 5], [10, 5], [4, 8], [6, 8], [8, 8], [10, 8]]],
    ['at', 'T', [[15, 4], [16, 15], [25, 5], [26, 18], [37, 4], [38, 19], [8, 16], [13, 20], [35, 7]]],
    ['rect', 14, 8, 1, 3, 'W'], ['rect', 24, 16, 3, 1, 'W'], ['at', 'W', [[36, 15], [40, 6]]],
    ['rect', 5, 14, 3, 2, ','], ['rect', 34, 17, 3, 2, ','],
    ['at', 'x', [[17, 13], [27, 7], [39, 16]]], ['at', 'r', [[18, 6], [33, 9], [11, 18]]],
    ['at', 't', [[18, 9]]], ['at', 'v', [[37, 21]]],
    house(33, 19, HOUSE_ORANGE),
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

/** Làng: nhà nguyện phía bắc, nhà dân hai bên đường, lò rèn phía đông nam, lối xuống hầm trùm phía nam. */
const MISTY_VILLAGE = {
  identifier: 'Misty_Village', iid: 'c1a7e000-0b5d-4e1f-9a01-000000000003', theme: THEME.village,
  width: 40, height: LEVEL_HEIGHT, worldX: 1216, worldY: 768,
  ops: [
    ['rect', 0, 0, 40, 24, '#'], ['rect', 1, 1, 38, 22, '.'], forestBand(40, 24),
    ['rect', 0, 11, 1, 2, 'R'], ['rect', 19, 23, 2, 1, 'R'],
    ['rect', 1, 11, 38, 2, '='], ['rect', 19, 6, 2, 17, '='],
    ...chapelFront(14, 1, 12, 5), openGate(19, 5),
    house(3, 3, HOUSE_ORANGE), house(7, 3, HOUSE_GREY), house(30, 3, HOUSE_GREY), house(34, 3, HOUSE_ORANGE),
    house(3, 16, HOUSE_GREY), house(7, 16, HOUSE_ORANGE), house(30, 16, HOUSE_ORANGE), house(34, 16, HOUSE_GREY),
    ['at', 'F', [[31, 14], [32, 14]]], ['at', 'U', [[25, 8]]],
    ['at', 'g', [[24, 17], [26, 17], [24, 19], [26, 19], [28, 20]]],
    ['rect', 11, 7, 1, 3, 'W'], ['at', 'W', [[37, 9], [12, 19]]],
    ['rect', 8, 8, 3, 2, ','], ['rect', 22, 14, 3, 2, ','],
    ['at', 'r', [[13, 15], [36, 20], [27, 9]]], ['at', 'x', [[25, 21]]], ['at', 'q', [[29, 14]]], ['at', 's', [[2, 9]]],
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
