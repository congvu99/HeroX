// Bảng màu chung HeroX (docs/art-direction.md) và phép đưa ảnh khác nguồn về cùng tông.
import { hexToRgb, luminance, mapPixels, mixRgb } from './image-ops.mjs';

export const PALETTE = {
  ink: '#0b0a10', // Mực đêm
  ash: '#1b1720', // Tro
  bone: '#d9d2c0', // Xương
  holyBlood: '#7a141c', // Máu thánh
  ember: '#e0602a', // Than hồng
  candle: '#e8c66a', // Vàng nến
  holyLight: '#fff1c2', // Thánh quang
  silentAbyss: '#5a2a6a', // Vực câm
};

/** Khoá chunk tEXt đánh dấu ảnh đã chỉnh tông; chạy lại công cụ sẽ bỏ qua để không chỉnh chồng nhiều lần. */
export const HARMONIZED_TEXT_KEY = 'herox-harmonized';
export const HARMONIZE_VERSION = 'palette-v1';

// Hệ số chọn bằng mắt trên hình DCSS/LPC: đủ kéo về tông gothic mà không làm bệt chi tiết.
const DESATURATE = 0.22;
const SHADOW_THRESHOLD = 0.38;
const SHADOW_STRENGTH = 0.5;
const HIGHLIGHT_THRESHOLD = 0.62;
const HIGHLIGHT_STRENGTH = 0.32;

const INK = hexToRgb(PALETTE.ink);
const ABYSS = hexToRgb(PALETTE.silentAbyss);
const CANDLE = hexToRgb(PALETTE.candle);
const BONE = hexToRgb(PALETTE.bone);

function harmonizePixel([red, green, blue, alpha]) {
  const light = luminance([red, green, blue]);
  const gray = light * 255;
  let color = mixRgb([red, green, blue], [gray, gray, gray], DESATURATE);
  if (light < SHADOW_THRESHOLD) {
    const depth = (SHADOW_THRESHOLD - light) / SHADOW_THRESHOLD;
    // Bóng sâu về Mực đêm, bóng nông nhuốm tím Vực câm.
    const target = mixRgb(INK, ABYSS, (1 - depth) * 0.6);
    color = mixRgb(color, target, depth * SHADOW_STRENGTH);
  } else if (light > HIGHLIGHT_THRESHOLD) {
    const height = (light - HIGHLIGHT_THRESHOLD) / (1 - HIGHLIGHT_THRESHOLD);
    // Vùng sáng ấm như ánh nến, sáng nhất ngả màu Xương.
    const target = mixRgb(CANDLE, BONE, height);
    color = mixRgb(color, target, height * HIGHLIGHT_STRENGTH);
  }
  return [...color, alpha];
}

export function isHarmonized(image) {
  return image.text?.[HARMONIZED_TEXT_KEY] !== undefined;
}

/** Trả ảnh mới đã chỉnh tông (giữ alpha) và đánh dấu; ảnh đã đánh dấu trả về nguyên trạng. */
export function harmonizeImage(image) {
  if (isHarmonized(image)) return image;
  const out = mapPixels(image, harmonizePixel);
  out.text = { ...image.text, [HARMONIZED_TEXT_KEY]: HARMONIZE_VERSION };
  return out;
}
