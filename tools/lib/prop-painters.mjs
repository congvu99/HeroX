// Đồ vật 32x32 vẽ bằng script khi bộ DCSS không có hình phù hợp (rương). Màu lấy từ bảng màu chung.
import { createImage } from './png.mjs';
import { fillRect, hexToRgb } from './image-ops.mjs';
import { PALETTE } from './palette.mjs';

const SIZE = 32;
const RGBA_CHANNELS = 4;
const COLORS = {
  outline: hexToRgb(PALETTE.ink),
  wood: hexToRgb('#4a2c1c'),
  woodLight: hexToRgb('#5e3a24'),
  woodDark: hexToRgb('#2e1a10'),
  iron: hexToRgb('#3a3540'),
  ironLight: hexToRgb('#6c6378'),
  lock: hexToRgb(PALETTE.candle),
  glow: hexToRgb(PALETTE.holyLight),
  glowEdge: hexToRgb(PALETTE.candle),
};

/** Viền 1px màu Mực đêm quanh vùng có pixel, để đồ vật tách khỏi nền tối. */
function outline(image, color) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < image.width && y < image.height
    && image.rgba[(y * image.width + x) * RGBA_CHANNELS + 3] > 0;
  const edges = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edges.push([x, y]);
    }
  }
  for (const [x, y] of edges) fillRect(image, { x, y, width: 1, height: 1 }, color);
}

function drawBody(image, top) {
  const bottom = SIZE - 2; // chừa 1 hàng cho viền, viền chạm hàng dưới cùng
  fillRect(image, { x: 5, y: top, width: 22, height: bottom - top + 1 }, COLORS.wood);
  for (let y = top + 4; y < bottom; y += 5) fillRect(image, { x: 5, y, width: 22, height: 1 }, COLORS.woodDark);
  for (const bandX of [8, 22]) {
    fillRect(image, { x: bandX, y: top, width: 2, height: bottom - top + 1 }, COLORS.iron);
    fillRect(image, { x: bandX, y: top, width: 1, height: bottom - top + 1 }, COLORS.ironLight);
  }
}

/** Rương gỗ đai sắt; `open` vẽ nắp lật ra sau và lòng rương phát ánh Thánh quang. */
export function drawChest(open) {
  const image = createImage(SIZE, SIZE);
  if (open) {
    fillRect(image, { x: 6, y: 4, width: 20, height: 9 }, COLORS.woodDark);
    fillRect(image, { x: 8, y: 4, width: 2, height: 9 }, COLORS.iron);
    fillRect(image, { x: 22, y: 4, width: 2, height: 9 }, COLORS.iron);
    drawBody(image, 15);
    fillRect(image, { x: 6, y: 13, width: 20, height: 3 }, COLORS.glowEdge);
    fillRect(image, { x: 9, y: 13, width: 14, height: 2 }, COLORS.glow);
  } else {
    fillRect(image, { x: 6, y: 8, width: 20, height: 1 }, COLORS.woodLight);
    fillRect(image, { x: 5, y: 9, width: 22, height: 6 }, COLORS.woodLight);
    fillRect(image, { x: 5, y: 14, width: 22, height: 1 }, COLORS.woodDark);
    drawBody(image, 15);
    fillRect(image, { x: 8, y: 8, width: 2, height: 7 }, COLORS.iron);
    fillRect(image, { x: 22, y: 8, width: 2, height: 7 }, COLORS.iron);
    fillRect(image, { x: 14, y: 13, width: 4, height: 5 }, COLORS.lock);
    fillRect(image, { x: 15, y: 15, width: 2, height: 2 }, COLORS.outline);
  }
  outline(image, COLORS.outline);
  return image;
}
