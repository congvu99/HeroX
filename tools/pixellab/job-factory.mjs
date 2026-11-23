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
    credit: CREDIT(`Quái ${id} (PixelLab)`, `sinh tĩnh, đặt khung ${frameSize} chân chạm đáy; màu trung tính cho MULTIPLY`),
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
