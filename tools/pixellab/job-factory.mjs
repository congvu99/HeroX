// Helper + hằng dùng chung để khai báo asset job PixelLab. Tách khỏi jobs.mjs để tránh
// vòng import (jobs.mjs và jobs-chapters-2-5.mjs cùng import từ đây).
import { SOURCES } from '../lib/credits-store.mjs';

export const STYLE_REF = 'prototypes/style-preview/public/assets/reference/style-target.png';
export const CREDIT = (title, modified) => ({ ...SOURCES.pixellab, title, modified });

// Mô tả chung để giữ phong cách nhất quán (dark fantasy, top-down 3/4, pixel art).
export const BASE_STYLE = 'top-down 3/4 pixel art, dark fantasy, clean readable silhouette, transparent background';

/** Quái/trùm: ảnh tĩnh, khung theo cỡ (thường 64, tinh anh 96, trùm 128). */
export function monster(id, file, prompt, { frameSize = 64, seed, boss = false }) {
  return {
    kind: 'single',
    id,
    path: `sprites/monsters/${file}.png`,
    prompt: `${prompt}, color-neutral palette, ${BASE_STYLE}`,
    negative: 'text, watermark, bright saturated red tint, strong color cast',
    seed,
    size: { width: boss ? 96 : 64, height: boss ? 96 : 64 },
    frameSize,
    directions: 4,
    animations: ['still'],
    reference: STYLE_REF,
    boss,
    credit: CREDIT(`Quái ${id} (PixelLab)`, `sinh tĩnh, đặt khung ${frameSize} chân chạm đáy; màu trung tính cho MULTIPLY`),
  };
}

/** Cỡ bản trận: client vẽ 1:1 cạnh hiệp sĩ dáng lưng 128 px (cao bằng bản đồ phóng x2, trùm x1.5). */
const BATTLE_MONSTER_SIZE = 128;
const BATTLE_BOSS_SIZE = 192;

/**
 * Bản quái vẽ riêng cho trận từ job bản đồ tương ứng: cùng prompt (giữ màu trung tính) và seed, cỡ lớn hơn,
 * ghi ra `sprites/monsters/battle/` nên không đụng sprite 64 px bản đồ thế giới đang dùng.
 * `promptPrefix`/`seed` chỉ dùng khi bản trận sinh hỏng với prompt/seed gốc (vd ra tượng bán thân).
 */
export function battleMonster(mapJob, { promptPrefix, seed } = {}) {
  const file = mapJob.path.slice('sprites/monsters/'.length);
  const size = mapJob.boss ? BATTLE_BOSS_SIZE : BATTLE_MONSTER_SIZE;
  return {
    ...mapJob,
    id: `${mapJob.id}-battle`,
    path: `sprites/monsters/battle/${file}`,
    prompt: promptPrefix === undefined ? mapJob.prompt : `${promptPrefix}, ${mapJob.prompt}`,
    seed: seed ?? mapJob.seed,
    size: { width: size, height: size },
    frameSize: size,
    credit: CREDIT(`Quái ${mapJob.id} - bản trận (PixelLab)`, `sinh tĩnh ${size}, đặt khung ${size} chân chạm đáy, client vẽ 1:1; màu trung tính cho MULTIPLY`),
  };
}

export function portrait(id, speaker, prompt, seed) {
  return {
    kind: 'single',
    id: `portrait-${speaker}`,
    path: `sprites/npc/${speaker}.png`,
    prompt: `portrait bust of ${prompt}, ${BASE_STYLE}`,
    seed,
    size: { width: 64, height: 64 },
    frameSize: 64,
    directions: 4,
    animations: ['still'],
    reference: STYLE_REF,
    credit: CREDIT(`Chân dung/NPC ${speaker} (PixelLab)`, 'sinh tĩnh 64x64'),
  };
}

/**
 * Dáng toàn thân của NPC để đứng trên bản đồ (64 px, chân chạm đáy); ảnh bán thân `portrait()` vẫn làm chân dung hộp thoại.
 * Tiền tố prompt né các lỗi pixflux đã gặp: tượng trên bệ, bóng đen không chi tiết, hình người không áo.
 */
export function npcFigure(speaker, prompt, seed) {
  return {
    kind: 'single',
    id: `${speaker}-figure`,
    path: `sprites/npc/${speaker}-figure.png`,
    prompt: `full body standing figure, legs visible, fully clothed, fully shaded, not a silhouette, no pedestal, ${prompt}, ${BASE_STYLE}`,
    seed,
    size: { width: 64, height: 64 },
    frameSize: 64,
    directions: 4,
    animations: ['still'],
    reference: STYLE_REF,
    credit: CREDIT(`NPC ${speaker} - dáng toàn thân trên bản đồ (PixelLab)`, 'sinh tĩnh 64x64, đặt khung 64 chân chạm đáy'),
  };
}
