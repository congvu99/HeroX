import type { ArenaThemeId } from '../battle/battle-arena-layout';

export type LightingPresetName = 'sunny' | 'sunset' | 'moonlight' | 'infernal' | 'holy';

/** Bộ thông số màu/độ đậm của một kiểu ánh sáng; màu canvas dạng chuỗi CSS, tint dạng số 0xRRGGBB. */
export interface LightingPreset {
  readonly name: LightingPresetName;
  /** Dải màu nhân (MULTIPLY) từ góc trên phải xuống góc dưới trái. */
  readonly toneLight: string;
  readonly toneDark: string;
  /** Quầng cộng ở góc trên phải: kênh "r, g, b" và alpha ở tâm. */
  readonly washRgb: string;
  readonly washAlpha: number;
  /** Tia sáng chéo: màu, độ đậm khi cộng, góc so với phương thẳng đứng (độ). */
  readonly shaftRgb: readonly [number, number, number];
  readonly shaftAlpha: number;
  readonly shaftAngleDeg: number;
  readonly windowGlowTint: number;
  readonly windowGlowAlpha: number;
  readonly warmLightTint: number;
  readonly warmLightAlpha: number;
  readonly shadowColor: string;
  readonly shadowOffset: { readonly x: number; readonly y: number };
  readonly shadowAlpha: number;
  readonly vignetteStrength: number;
  /** Màu hạt bụi lơ lửng (tint lên hạt trắng). */
  readonly dustTint: number;
}

export const LIGHTING_PRESETS: Readonly<Record<LightingPresetName, LightingPreset>> = {
  // Giờ vàng: nắng ấm, bóng đổ trái-dưới như demo đã duyệt.
  sunny: {
    name: 'sunny',
    toneLight: '#f7c6a6',
    toneDark: '#a37c92',
    washRgb: '255, 170, 90',
    washAlpha: 0.1,
    shaftRgb: [255, 196, 120],
    shaftAlpha: 0.2,
    shaftAngleDeg: 20,
    windowGlowTint: 0xffa64d,
    windowGlowAlpha: 0.55,
    warmLightTint: 0xffb060,
    warmLightAlpha: 0.16,
    shadowColor: 'rgb(70, 30, 60)',
    shadowOffset: { x: -18, y: 28 },
    shadowAlpha: 0.4,
    vignetteStrength: 0.18,
    dustTint: 0xfff0c0,
  },
  // Hoàng hôn đỏ: mặt trời thấp nên tia nghiêng hơn, bóng dài và đậm hơn.
  sunset: {
    name: 'sunset',
    toneLight: '#f29a7a',
    toneDark: '#6e4a78',
    washRgb: '255, 110, 60',
    washAlpha: 0.16,
    shaftRgb: [255, 140, 80],
    shaftAlpha: 0.24,
    shaftAngleDeg: 38,
    windowGlowTint: 0xff9a40,
    windowGlowAlpha: 0.65,
    warmLightTint: 0xffa050,
    warmLightAlpha: 0.2,
    shadowColor: 'rgb(60, 15, 45)',
    shadowOffset: { x: -34, y: 40 },
    shadowAlpha: 0.55,
    vignetteStrength: 0.26,
    dustTint: 0xffc49a,
  },
  // Ánh trăng: tông lam lạnh sẫm để cửa sổ/đuốc ấm nổi bật, bóng xanh tím.
  moonlight: {
    name: 'moonlight',
    toneLight: '#8fa6d6',
    toneDark: '#3c4470',
    washRgb: '200, 220, 255',
    washAlpha: 0.08,
    shaftRgb: [215, 230, 255],
    shaftAlpha: 0.14,
    shaftAngleDeg: 15,
    windowGlowTint: 0xffb050,
    windowGlowAlpha: 0.85,
    warmLightTint: 0xffb868,
    warmLightAlpha: 0.26,
    shadowColor: 'rgb(30, 25, 70)',
    shadowOffset: { x: 14, y: 24 },
    shadowAlpha: 0.5,
    vignetteStrength: 0.34,
    dustTint: 0xd8e4ff,
  },
  // Vực Lửa: tông đỏ-tím của dung nham, quầng nóng mạnh, bóng tím thẫm.
  infernal: {
    name: 'infernal',
    toneLight: '#e8705a',
    toneDark: '#4a2050',
    washRgb: '255, 90, 60',
    washAlpha: 0.2,
    shaftRgb: [255, 110, 70],
    shaftAlpha: 0.22,
    shaftAngleDeg: 30,
    windowGlowTint: 0xff6a2a,
    windowGlowAlpha: 0.8,
    warmLightTint: 0xff7a40,
    warmLightAlpha: 0.28,
    shadowColor: 'rgb(50, 10, 40)',
    shadowOffset: { x: -20, y: 30 },
    shadowAlpha: 0.58,
    vignetteStrength: 0.4,
    dustTint: 0xffb09a,
  },
  // Thiên Cung Vỡ: "Thánh quang" #fff1c2, nắng ấm trắng-vàng, bóng nhạt, quầng sáng dịu.
  holy: {
    name: 'holy',
    toneLight: '#fff1c2',
    toneDark: '#c9b98a',
    washRgb: '255, 241, 194',
    washAlpha: 0.18,
    shaftRgb: [255, 248, 214],
    shaftAlpha: 0.26,
    shaftAngleDeg: 12,
    windowGlowTint: 0xfff1c2,
    windowGlowAlpha: 0.7,
    warmLightTint: 0xffe8a8,
    warmLightAlpha: 0.22,
    shadowColor: 'rgb(120, 100, 70)',
    shadowOffset: { x: -10, y: 18 },
    shadowAlpha: 0.3,
    vignetteStrength: 0.14,
    dustTint: 0xfff6d8,
  },
};

/** Kiểu ánh sáng theo level chương 1 (định danh level trong LDtk). */
export const LEVEL_LIGHTING: Readonly<Record<string, LightingPresetName>> = {
  Lexhold: 'sunny',
  Misty_Fields: 'sunny',
  Misty_Village: 'sunset',
  Misty_Chapel: 'moonlight',
  Scarecrow_Lair: 'moonlight',
  // Chương 2 (Rừng Tro): rừng cháy dở lúc chiều tà, trảng thiêng dưới trăng.
  Ash_Forest: 'sunset',
  Ash_Stag_Grove: 'moonlight',
  // Chương 3 (Hầm Mộ Thánh): dưới ánh trăng xuyên khe hầm.
  Saint_Catacomb: 'moonlight',
  Bishop_Sanctum: 'moonlight',
  // Chương 4 (Vực Lửa): ánh dung nham đỏ-tím.
  Hellmaw: 'infernal',
  Antonym_Throne: 'infernal',
  // Chương 5 (Thiên Cung Vỡ): Thánh quang trắng-vàng.
  Broken_Heaven: 'holy',
  Fallen_Sanctum: 'holy',
};

/** Kiểu ánh sáng theo sân trận. */
export const ARENA_LIGHTING: Readonly<Record<ArenaThemeId, LightingPresetName>> = {
  fields: 'sunny',
  village: 'sunset',
  lair: 'moonlight',
  'ash-forest': 'sunset',
  catacomb: 'moonlight',
  hellmaw: 'infernal',
  'broken-heaven': 'holy',
};

/** Level chưa khai báo dùng nắng mặc định để bản đồ mới vẫn có ánh sáng. */
export function lightingForLevel(levelId: string): LightingPreset {
  return LIGHTING_PRESETS[LEVEL_LIGHTING[levelId] ?? 'sunny'];
}

export function lightingForArena(theme: ArenaThemeId): LightingPreset {
  return LIGHTING_PRESETS[ARENA_LIGHTING[theme]];
}
