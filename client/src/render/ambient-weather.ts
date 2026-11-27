import type { ArenaThemeId } from '../battle/battle-arena-layout';
import type { LightingPresetName } from './lighting-presets';

/**
 * "Thời tiết môi trường": loại hạt nền đặc trưng cho từng theme sân và từng kiểu ánh sáng map.
 * Thuần dữ liệu, không import Phaser — phần render (P2) đọc bảng này để dựng emitter.
 *
 * Quyết định DRY (GĐ1): map lấy weather theo **lighting preset** (5 preset) thay vì theo level (13 level),
 * để trùng trục với màu ánh sáng đã có; sân trận lấy theo `ArenaThemeId` vì theme sân là một trục riêng.
 */

/** Loại hạt môi trường; `addDust` của atmosphere là khuôn render chung cho mọi loại. */
export type WeatherKind = 'leaves' | 'ash' | 'motes';

export interface WeatherSpec {
  readonly kind: WeatherKind;
  /** Tint lên hạt (0xRRGGBB), đồng tông với preset/theme. */
  readonly tint: number;
  /** Khoảng cách giữa hai lần phát hạt (ms); lớn hơn = thưa hơn, rẻ hơn. */
  readonly frequencyMs: number;
  readonly lifespanMs: number;
  /** Vận tốc trôi ngang/dọc (px/s), min–max để hạt tản tự nhiên. */
  readonly speedX: { readonly min: number; readonly max: number };
  readonly speedY: { readonly min: number; readonly max: number };
  readonly alpha: { readonly start: number; readonly end: number };
  /** Cạnh hạt vuông (px). */
  readonly size: number;
}

/** Tông màu hạt lấy từ bảng ánh sáng để không rải magic number trong render. */
const LEAF_TINT = 0xffb85c; // lá/tro vàng cam của rừng chiều tà
const ASH_TINT = 0xd98a6a; // tàn tro hồng xám của vực lửa
const MOTE_TINT_COOL = 0xcfe0ff; // đốm sáng lam lạnh dưới trăng (hầm mộ)
const MOTE_TINT_HOLY = 0xfff2c8; // đốm Thánh quang trắng vàng (thiên cung)

/** Lá bay chéo xuống nhẹ, lơ lửng lâu; đặc trưng đồng/rừng. */
const LEAVES: WeatherSpec = {
  kind: 'leaves',
  tint: LEAF_TINT,
  frequencyMs: 480,
  lifespanMs: 5200,
  speedX: { min: -14, max: 10 },
  speedY: { min: 10, max: 26 },
  alpha: { start: 0.75, end: 0 },
  size: 3,
};

/** Đốm sáng lơ lửng gần như đứng yên; đặc trưng không gian thiêng/hầm. */
function motes(tint: number): WeatherSpec {
  return {
    kind: 'motes',
    tint,
    frequencyMs: 560,
    lifespanMs: 6000,
    speedX: { min: -6, max: 6 },
    speedY: { min: -8, max: -2 },
    alpha: { start: 0.6, end: 0 },
    size: 2,
  };
}

/**
 * Hạt môi trường theo theme sân trận.
 * `lair`/`hellmaw` trả `null`: hai theme này đã có tàn lửa (ember) riêng, tránh hạt chồng.
 * `village` để `null`: phố xá dùng bụi sẵn có là đủ, không cần lớp hạt thứ hai.
 */
const ARENA_WEATHER: Readonly<Record<ArenaThemeId, WeatherSpec | null>> = {
  fields: LEAVES,
  'ash-forest': LEAVES,
  catacomb: motes(MOTE_TINT_COOL),
  'broken-heaven': motes(MOTE_TINT_HOLY),
  village: null,
  lair: null,
  hellmaw: null,
};

/**
 * Hạt môi trường cho map theo kiểu ánh sáng:
 * - `sunny`/`sunset`: ngoài trời ban ngày/chiều tà → lá bay.
 * - `moonlight`: đêm/hầm dưới trăng → đốm sáng lam.
 * - `holy`: Thánh quang → đốm sáng vàng ấm.
 * - `infernal`: vực lửa → tàn tro bay lên.
 */
const MAP_WEATHER: Readonly<Record<LightingPresetName, WeatherSpec | null>> = {
  sunny: LEAVES,
  sunset: LEAVES,
  moonlight: motes(MOTE_TINT_COOL),
  holy: motes(MOTE_TINT_HOLY),
  infernal: {
    kind: 'ash',
    tint: ASH_TINT,
    frequencyMs: 420,
    lifespanMs: 4200,
    speedX: { min: -8, max: 8 },
    speedY: { min: -30, max: -12 },
    alpha: { start: 0.7, end: 0 },
    size: 2,
  },
};

/** Hạt môi trường cho một theme sân; `null` khi theme đã có ember riêng hoặc không cần hạt. */
export function arenaWeatherFor(theme: ArenaThemeId): WeatherSpec | null {
  return ARENA_WEATHER[theme] ?? null;
}

/** Hạt môi trường cho map theo kiểu ánh sáng của level; `null` khi preset lạ (map mới vẫn chạy, chỉ không có weather). */
export function mapWeatherForPreset(preset: LightingPresetName): WeatherSpec | null {
  return MAP_WEATHER[preset] ?? null;
}
