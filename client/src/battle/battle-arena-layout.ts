import { LOGICAL_HEIGHT, LOGICAL_WIDTH, TILE_SIZE } from '../config/display';
import {
  CH2_BOSS_ENCOUNTER_ID,
  CH2_FIELD_ENCOUNTER_ID,
  CH3_BOSS_ENCOUNTER_ID,
  CH3_FIELD_ENCOUNTER_ID,
  CH4_BOSS_ENCOUNTER_ID,
  CH4_FIELD_ENCOUNTER_ID,
  CH5_BOSS_ENCOUNTER_ID,
  CH5_FIELD_ENCOUNTER_ID,
  FIELD_ENCOUNTER_ID,
  FIELD_ROAM_ENCOUNTER_ID,
  SCARECROW_BOSS_ENCOUNTER_ID,
  SMITHY_ENCOUNTER_ID,
  TUTORIAL_ENCOUNTER_ID,
} from '@herox/shared';

/**
 * Bố cục sân trận: lưới tile (theo tên tile trong atlas chương 1) và điểm sáng, tách khỏi Phaser để test được.
 * Mỗi ô atlas 32 px vẽ phóng ×2 nên sân 384×704 là 6×11 ô cho khung dọc 360×780 (cột mép lấn ra ngoài một chút).
 * Khung dọc: quái ở hàng trên, hiệp sĩ ở hàng dưới; dải giữa để hiệu ứng chiêu bay dọc lên/xuống.
 */
export const ARENA_TILE_SCALE = 2;
export const ARENA_COLUMNS = 6;
export const ARENA_ROWS = 11;

/** Cạnh một ô sân sau khi phóng (pixel logic). */
export const ARENA_CELL_PX = TILE_SIZE * ARENA_TILE_SCALE;

/**
 * Góc trên trái của lưới sân để sân nằm giữa khung: phần thừa chia đều hai mép (cột mép cắt mỗi bên một ít),
 * phần thiếu chiều dọc chia đều trên dưới. Nhân vật, hiệu ứng, HUD đều căn theo tâm khung nên sân phải cùng tâm.
 */
export const ARENA_ORIGIN = {
  x: (LOGICAL_WIDTH - ARENA_COLUMNS * ARENA_CELL_PX) / 2,
  y: (LOGICAL_HEIGHT - ARENA_ROWS * ARENA_CELL_PX) / 2,
} as const;

/** Tâm ô (cột, hàng) trên khung, đã cộng góc lưới. */
export function arenaCellCenter(column: number, row: number): { readonly x: number; readonly y: number } {
  return {
    x: ARENA_ORIGIN.x + column * ARENA_CELL_PX + ARENA_CELL_PX / 2,
    y: ARENA_ORIGIN.y + row * ARENA_CELL_PX + ARENA_CELL_PX / 2,
  };
}

export type ArenaThemeId = 'fields' | 'village' | 'lair' | 'ash-forest' | 'catacomb' | 'hellmaw' | 'broken-heaven';

export interface ArenaCell {
  /** Tile nền (sàn, tường). */
  readonly ground: string;
  /** Tile vật thể có nền trong suốt vẽ đè lên nền, `null` khi không có. */
  readonly decor: string | null;
}

export interface ArenaLight {
  readonly column: number;
  readonly row: number;
  /** Bán kính vùng sáng theo pixel logic. */
  readonly radius: number;
  readonly flicker: boolean;
}

export interface ArenaLayout {
  readonly theme: ArenaThemeId;
  readonly cells: readonly (readonly ArenaCell[])[];
  readonly lights: readonly ArenaLight[];
  /** Hầm trùm có tàn lửa bay lên từ hàng đá vụn dưới cùng. */
  readonly embers: boolean;
}

interface ThemeSpec {
  readonly floor: readonly string[];
  readonly wallTop: readonly string[];
  readonly wallFace: readonly string[];
  /** Ký tự trong bản vẽ ASCII → tile vật thể. */
  readonly decor: Readonly<Record<string, string>>;
  /** Ký tự → tile nền riêng (mái, tường nhà, đá vụn); không có thì dùng sàn. */
  readonly ground: Readonly<Record<string, readonly string[]>>;
  /** Ký tự phát sáng (cửa sổ, lò rèn, cờ hiệu) → bán kính. */
  readonly glow: Readonly<Record<string, number>>;
  readonly rows: readonly string[];
  readonly embers: boolean;
}

/** Bán kính quầng sáng ấm (pixel logic): cửa sổ, cửa nhà, lò rèn, đuốc cờ hiệu, đá vụn hầm trùm. */
const WINDOW_GLOW = 70;
const FORGE_GLOW = 110;
const BANNER_GLOW = 80;
const RUBBLE_GLOW = 60;

const GRASS = ['grass', 'grass', 'grass_tuft', 'grass_flowers'];

/**
 * '#' mặt trên tường, '|' mặt tường, '.' sàn; ký tự khác tra `decor`/`ground` của chủ đề.
 * Khung dọc 6×11: hàng 0–1 mép trên (cây, nhà, tường) + nguồn sáng; hàng 2–8 để trống
 * cho quái (trên) và hiệp sĩ (dưới); hàng 9–10 vật thể mép dưới. Vật thể chỉ ở mép trên/dưới.
 */
const THEMES: Readonly<Record<ArenaThemeId, ThemeSpec>> = {
  fields: {
    floor: GRASS,
    wallTop: ['grass'],
    wallFace: ['grass'],
    decor: { T: 'tree_pine', A: 'tree_autumn', C: 'tree_cone_autumn', l: 'fence_left', f: 'fence_mid', r: 'fence_right', t: 'target', b: 'bush', v: 'beehive' },
    ground: { m: ['dirt', 'dirt_pebble'] },
    glow: { t: WINDOW_GLOW, v: WINDOW_GLOW },
    rows: ['TATCTA', 'lffrbt', '..m...', '...m..', '......', '..m...', '......', '......', '......', 'b.v..C', 'TATTAT'],
    embers: false,
  },
  village: {
    floor: ['dirt', 'dirt', 'dirt_pebble', 'dirt_tuft'],
    wallTop: ['roof_orange_mid'],
    wallFace: ['wood_wall_mid'],
    decor: { F: 'anvil', o: 'barrel', q: 'sack', U: 'well', s: 'sign' },
    ground: {
      a: ['roof_orange_left'], b: ['roof_orange_dormer'], c: ['roof_orange_right'],
      d: ['roof_grey_left'], e: ['roof_grey_dormer'], g: ['roof_grey_right'],
      w: ['wood_window'], h: ['wood_door'], i: ['wood_wall_right'],
      x: ['stone_window'], y: ['stone_door'], z: ['stone_wall_right'],
      '=': ['cobble'],
    },
    glow: { w: WINDOW_GLOW, h: WINDOW_GLOW, x: WINDOW_GLOW, y: WINDOW_GLOW, F: FORGE_GLOW },
    rows: ['abcdeg', 'whixyz', '.==...', '...=..', '......', '..=...', '......', '......', '......', 'o.F.Uq', '.s..o.'],
    embers: false,
  },
  lair: {
    floor: ['cave_floor', 'cave_floor', 'cave_gravel'],
    wallTop: ['brick_wall'],
    wallFace: ['brick_wall_barred', 'brick_wall'],
    decor: { x: 'skull_pile', S: 'gargoyle', n: 'banner', g: 'gravestone' },
    ground: { L: ['cave_rubble'] },
    glow: { n: BANNER_GLOW, L: RUBBLE_GLOW },
    rows: ['######', '|SnnS|', '......', '...L..', '......', '......', '..L...', '......', '......', 'nLg.Ln', 'LLxgLL'],
    embers: true,
  },
  // Chương 2 Rừng Tro: viền cây mùa thu, nền đất-cỏ, nguồn sáng từ bia/tổ ong (tông nắng tà/tro).
  'ash-forest': {
    floor: ['dirt', 'dirt', 'dirt_pebble', 'grass_tuft'],
    wallTop: ['tree_autumn'],
    wallFace: ['tree_cone_autumn'],
    decor: { T: 'tree_pine', A: 'tree_autumn', C: 'tree_cone_autumn', b: 'bush', t: 'target', v: 'beehive', s: 'sprout' },
    ground: { m: ['dirt', 'dirt_pebble'] },
    glow: { t: WINDOW_GLOW, v: WINDOW_GLOW },
    rows: ['ATCTAC', 'bt.v.b', '..m...', '...m..', '......', '..m...', '......', '......', '......', 'b.s..b', 'TACCTA'],
    embers: false,
  },
  // Chương 3 Hầm Mộ Thánh: tường gạch, sàn phiến đá, cột và bia; nguồn sáng từ cờ hiệu (tông trăng).
  catacomb: {
    floor: ['flagstone', 'flagstone', 'cave_gravel'],
    wallTop: ['brick_wall'],
    wallFace: ['brick_wall_barred', 'brick_wall'],
    decor: { x: 'skull_pile', S: 'gargoyle', n: 'banner', g: 'gravestone', o: 'column' },
    ground: { A: ['altar'] },
    glow: { n: BANNER_GLOW },
    rows: ['######', '|SnnS|', '......', '......', '......', '......', '......', '......', '......', 'ognngo', 'oxg.go'],
    embers: false,
  },
  // Chương 4 Vực Lửa: tường gạch song sắt, sàn hang, đá đổ; tàn lửa bay lên (tông đỏ/tím).
  hellmaw: {
    floor: ['cave_floor', 'cave_floor', 'cave_gravel'],
    wallTop: ['brick_wall'],
    wallFace: ['brick_wall_barred'],
    decor: { x: 'skull_pile', S: 'gargoyle', n: 'banner', g: 'gravestone' },
    ground: { L: ['cave_rubble'] },
    glow: { n: BANNER_GLOW, L: RUBBLE_GLOW },
    rows: ['######', '|SnnS|', '......', '...L..', '......', '......', '..L...', '......', '......', 'nLg.Ln', 'LLxgLL'],
    embers: true,
  },
  // Chương 5 Thiên Cung Vỡ: cột trụ trắng, sàn phiến đá sáng, bia thờ; nguồn sáng từ cờ (tông Thánh quang).
  'broken-heaven': {
    floor: ['stone_slab', 'flagstone'],
    wallTop: ['pillar_wall'],
    wallFace: ['brick_wall'],
    decor: { o: 'column', A: 'altar', n: 'banner', x: 'grass_flowers' },
    ground: {},
    glow: { n: BANNER_GLOW },
    rows: ['######', '|AnnA|', '......', '......', '......', '......', '......', '......', '......', 'on..no', 'ooxxoo'],
    embers: false,
  },
};

const ENCOUNTER_THEMES: Readonly<Record<string, ArenaThemeId>> = {
  [TUTORIAL_ENCOUNTER_ID]: 'fields',
  [FIELD_ENCOUNTER_ID]: 'fields',
  [FIELD_ROAM_ENCOUNTER_ID]: 'fields',
  [SMITHY_ENCOUNTER_ID]: 'village',
  [SCARECROW_BOSS_ENCOUNTER_ID]: 'lair',
  [CH2_FIELD_ENCOUNTER_ID]: 'ash-forest',
  [CH2_BOSS_ENCOUNTER_ID]: 'ash-forest',
  [CH3_FIELD_ENCOUNTER_ID]: 'catacomb',
  [CH3_BOSS_ENCOUNTER_ID]: 'catacomb',
  [CH4_FIELD_ENCOUNTER_ID]: 'hellmaw',
  [CH4_BOSS_ENCOUNTER_ID]: 'hellmaw',
  [CH5_FIELD_ENCOUNTER_ID]: 'broken-heaven',
  [CH5_BOSS_ENCOUNTER_ID]: 'broken-heaven',
};

/** Trận chưa gắn chủ đề (trận thử, chương sau) dùng cánh đồng. */
export function arenaThemeFor(encounterId: string): ArenaThemeId {
  return ENCOUNTER_THEMES[encounterId] ?? 'fields';
}

/** Chọn biến thể tile tất định theo vị trí để sân không lặp đều mà mỗi lần mở vẫn giống nhau. */
function pickVariant(variants: readonly string[], column: number, row: number): string {
  const hash = (column * 73_856_093) ^ (row * 19_349_663);
  return variants[Math.abs(hash) % variants.length] ?? variants[0] ?? '';
}

function cellFor(spec: ThemeSpec, symbol: string, column: number, row: number): ArenaCell {
  if (symbol === '#') return { ground: pickVariant(spec.wallTop, column, row), decor: null };
  if (symbol === '|') return { ground: pickVariant(spec.wallFace, column, row), decor: null };
  const floor = pickVariant(spec.floor, column, row);
  const ground = spec.ground[symbol];
  if (ground !== undefined) return { ground: pickVariant(ground, column, row), decor: null };
  // Vật thể đứng trên hàng mặt tường thì nền là mặt tường, không phải sàn.
  const base = row === 1 ? pickVariant(spec.wallFace, column, row) : floor;
  return { ground: base, decor: spec.decor[symbol] ?? null };
}

export function buildArenaLayout(theme: ArenaThemeId): ArenaLayout {
  const spec = THEMES[theme];
  const cells = spec.rows.map((line, row) => Array.from(line, (symbol, column) => cellFor(spec, symbol, column, row)));
  const lights: ArenaLight[] = [];
  spec.rows.forEach((line, row) => {
    Array.from(line).forEach((symbol, column) => {
      const radius = spec.glow[symbol];
      if (radius !== undefined) lights.push({ column, row, radius, flicker: true });
    });
  });
  return { theme, cells, lights, embers: spec.embers };
}

/** Mọi tên tile một bố cục dùng, để kiểm có trong atlas. */
export function arenaTileNames(layout: ArenaLayout): Set<string> {
  const names = new Set<string>();
  for (const row of layout.cells) {
    for (const cell of row) {
      names.add(cell.ground);
      if (cell.decor !== null) names.add(cell.decor);
    }
  }
  return names;
}

export const ARENA_THEMES: readonly ArenaThemeId[] = ['fields', 'village', 'lair', 'ash-forest', 'catacomb', 'hellmaw', 'broken-heaven'];
