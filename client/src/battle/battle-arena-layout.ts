import { LOGICAL_HEIGHT, LOGICAL_WIDTH, TILE_SIZE } from '../config/display';
import { FIELD_ENCOUNTER_ID, FIELD_ROAM_ENCOUNTER_ID, SCARECROW_BOSS_ENCOUNTER_ID, SMITHY_ENCOUNTER_ID, TUTORIAL_ENCOUNTER_ID } from '@herox/shared';

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

export type ArenaThemeId = 'fields' | 'village' | 'lair';

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
  /** Hang trùm có tàn lửa bay lên từ dung nham. */
  readonly embers: boolean;
}

interface ThemeSpec {
  readonly floor: readonly string[];
  readonly wallTop: readonly string[];
  readonly wallFace: readonly string[];
  /** Ký tự trong bản vẽ ASCII → tile vật thể. */
  readonly decor: Readonly<Record<string, string>>;
  /** Ký tự → tile nền riêng (dung nham, máu); không có thì dùng sàn. */
  readonly ground: Readonly<Record<string, readonly string[]>>;
  /** Ký tự phát sáng (nến, lò rèn, dung nham) → bán kính. */
  readonly glow: Readonly<Record<string, number>>;
  readonly rows: readonly string[];
  readonly embers: boolean;
}

const CANDLE_GLOW = 70;
const FORGE_GLOW = 110;
const LAVA_GLOW = 90;

/**
 * '#' mặt trên tường, '|' mặt tường, '.' sàn; ký tự khác tra `decor`/`ground` của chủ đề.
 * Khung dọc 6×11: hàng 0 tường trên, hàng 1 mặt tường + vật thể/nguồn sáng; hàng 2–8 để trống
 * cho quái (trên) và hiệp sĩ (dưới); hàng 9 vật thể mép dưới; hàng 10 sàn. Vật thể chỉ ở mép trên/dưới.
 */
const THEMES: Readonly<Record<ArenaThemeId, ThemeSpec>> = {
  fields: {
    floor: ['mist_grass0', 'mist_grass1'],
    wallTop: ['tree1_red', 'tree2_red'],
    wallFace: ['tree2_red', 'tree1_red'],
    decor: { g: 'grave', n: 'candles', o: 'crumbled_column', x: 'bones' },
    ground: { m: ['mud'] },
    glow: { n: CANDLE_GLOW },
    rows: ['######', '|gnng|', '..m...', '......', '......', '...m..', '......', '......', '......', 'o.nn.o', 'x....g'],
    embers: false,
  },
  village: {
    floor: ['grey_dirt0', 'grey_dirt3'],
    wallTop: ['brick_dark0'],
    wallFace: ['brick_dark_face'],
    decor: { F: 'forge', n: 'candles', r: 'rubble', o: 'crumbled_column' },
    ground: { '=': ['cobble_blood1', 'cobble_blood2'] },
    glow: { F: FORGE_GLOW, n: CANDLE_GLOW },
    rows: ['######', '|oFno|', '.==...', '...=..', '......', '..=...', '......', '......', '......', 'r.nn.r', '.r..r.'],
    embers: false,
  },
  lair: {
    floor: ['volcanic_floor0', 'volcanic_floor1'],
    wallTop: ['volcanic_wall0'],
    wallFace: ['volcanic_wall_face'],
    decor: { x: 'bones', S: 'dngn_granite_statue', n: 'candles' },
    ground: { L: ['lava0', 'lava1'], l: ['lava_crack'] },
    glow: { L: LAVA_GLOW, l: LAVA_GLOW / 2, n: CANDLE_GLOW },
    rows: ['######', '|SnnS|', '......', '...l..', '......', '......', '..l...', '......', '......', 'nL..Ln', 'LLlxLL'],
    embers: true,
  },
};

const ENCOUNTER_THEMES: Readonly<Record<string, ArenaThemeId>> = {
  [TUTORIAL_ENCOUNTER_ID]: 'fields',
  [FIELD_ENCOUNTER_ID]: 'fields',
  [FIELD_ROAM_ENCOUNTER_ID]: 'fields',
  [SMITHY_ENCOUNTER_ID]: 'village',
  [SCARECROW_BOSS_ENCOUNTER_ID]: 'lair',
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

export const ARENA_THEMES: readonly ArenaThemeId[] = ['fields', 'village', 'lair'];
