// Tile 32px vẽ bằng script cho chương 1 khi bộ DCSS thiếu hình hợp không khí gothic:
// đất bùn, tường đổ, nền móng, thảm, bia mộ, khe dung nham, lò rèn, nến, gạch vụn, xương, ngưỡng cổng.
// Mọi màu lấy quanh bảng màu docs/art-direction.md; nhiễu dùng hashNoise nên sinh lại không đổi.
import { hashNoise, hexToRgb, mapPixels, mixRgb, paint } from './image-ops.mjs';
import { PALETTE } from './palette.mjs';

const SIZE = 32;
const CENTER = (SIZE - 1) / 2;
const C = {
  ink: hexToRgb(PALETTE.ink),
  ash: hexToRgb(PALETTE.ash),
  bone: hexToRgb(PALETTE.bone),
  blood: hexToRgb(PALETTE.holyBlood),
  ember: hexToRgb(PALETTE.ember),
  candle: hexToRgb(PALETTE.candle),
  light: hexToRgb(PALETTE.holyLight),
  abyss: hexToRgb(PALETTE.silentAbyss),
  mud: hexToRgb('#3b2e25'),
  mudLight: hexToRgb('#4a3a2d'),
  mudDark: hexToRgb('#221a1e'),
  stone: hexToRgb('#3d3549'),
  stoneDark: hexToRgb('#2a2433'),
  stoneLight: hexToRgb('#6c6378'),
};

function mud(x, y) {
  if (hashNoise(x >> 2, y >> 2, 11) > 0.78) return C.mudDark; // vũng nước đọng
  const speck = hashNoise(x, y, 12);
  if (speck > 0.92) return C.mudLight;
  return speck < 0.06 ? C.mudDark : C.mud;
}

function ruinWall(x, y) {
  // Mép trên gãy khúc: cột nào cao bao nhiêu theo nhiễu, phần trên là bóng tối.
  const top = 4 + Math.floor(hashNoise(x >> 2, 0, 21) * 10);
  if (y < top) return C.ink;
  const mortar = y % 8 === 0 || (x + ((y >> 3) % 2) * 8) % 16 === 0;
  if (mortar) return C.stoneDark;
  return y === top ? C.stoneLight : C.stone;
}

function foundation(x, y) {
  const seam = x % 16 === 0 || y % 16 === 0;
  if (seam) return C.ash;
  return hashNoise(x, y, 31) > 0.93 ? C.stoneDark : mixRgb(C.stoneDark, C.ash, 0.3);
}

function carpet(x, y) {
  if (x < 3 || x > SIZE - 4) return x === 1 || x === SIZE - 2 ? C.candle : C.ink;
  return y % 8 === 0 ? mixRgb(C.blood, C.ink, 0.35) : C.blood;
}

function grave(x, y) {
  const inStone = x >= 10 && x <= 21 && y >= 7 && y <= 27 && Math.hypot(x - 15.5, y - 12) < 7.5 + (y > 12 ? 20 : 0);
  if (inStone) {
    const cross = (x >= 15 && x <= 16 && y >= 11 && y <= 21) || (y >= 14 && y <= 15 && x >= 12 && x <= 19);
    if (cross) return C.stoneDark;
    return x < 13 ? C.stoneLight : C.stone;
  }
  if (y >= 26 && y <= 30 && x >= 6 && x <= 25) return C.mud; // ụ đất
  return null;
}

function lavaCrack(x, y) {
  const path = CENTER + Math.sin(y / 3.5) * 5 + (hashNoise(0, y >> 2, 41) - 0.5) * 4;
  const distance = Math.abs(x - path);
  if (distance < 1.2) return C.candle;
  if (distance < 2.6) return C.ember;
  if (distance < 4) return mixRgb(C.blood, C.ink, 0.3);
  return hashNoise(x, y, 42) > 0.88 ? C.stoneDark : C.ash;
}

function forge(x, y) {
  if (y < 6) return null;
  const mouth = x >= 9 && x <= 22 && y >= 14 && y <= 24;
  if (mouth) return y > 20 ? C.candle : mixRgb(C.ember, C.blood, (24 - y) / 12);
  const mortar = y % 6 === 0 || (x + ((Math.floor(y / 6)) % 2) * 5) % 10 === 0;
  return mortar ? C.stoneDark : C.stone;
}

function candles(x, y) {
  for (const [cx, height] of [[9, 10], [16, 14], [23, 8]]) {
    const baseY = 28;
    if (x >= cx - 1 && x <= cx + 1 && y <= baseY && y > baseY - height) return x === cx - 1 ? C.bone : mixRgb(C.bone, C.ash, 0.25);
    const flameY = baseY - height - 2;
    if (Math.abs(x - cx) <= (y === flameY ? 1 : 0) && y >= flameY - 1 && y <= flameY + 1) return y === flameY - 1 ? C.light : C.candle;
  }
  return null;
}

function rubble(x, y) {
  for (const [cx, cy, radius] of [[8, 22, 3.2], [19, 25, 4], [25, 18, 2.4], [13, 27, 2]]) {
    const distance = Math.hypot(x - cx, y - cy);
    if (distance < radius) return distance < radius - 1.2 && x < cx ? C.stoneLight : C.stone;
  }
  return null;
}

function bones(x, y) {
  const longBone = Math.abs((y - 20) - (x - 16) * 0.5) < 1 && x >= 7 && x <= 25;
  const knob = [[7, 15.5], [25, 24.5]].some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 2);
  const skull = Math.hypot(x - 22, y - 12) < 4 && !(Math.hypot(x - 21, y - 12) < 1.1 || Math.hypot(x - 24, y - 12) < 1.1);
  if (longBone || knob || skull) return C.bone;
  return null;
}

function runeGate(x, y) {
  const distance = Math.hypot(x - CENTER, y - CENTER);
  if (distance > 10 && distance < 12.5) return hashNoise(x, y, 51) > 0.3 ? C.ember : C.blood;
  if (distance < 3) return C.abyss;
  return foundation(x, y);
}

export const DRAWN_TILES = {
  mud: () => paint(SIZE, mud),
  ruin_wall: () => paint(SIZE, ruinWall),
  foundation: () => paint(SIZE, foundation),
  carpet: () => paint(SIZE, carpet),
  grave: () => paint(SIZE, grave),
  lava_crack: () => paint(SIZE, lavaCrack),
  forge: () => paint(SIZE, forge),
  candles: () => paint(SIZE, candles),
  rubble: () => paint(SIZE, rubble),
  bones: () => paint(SIZE, bones),
  rune_gate: () => paint(SIZE, runeGate),
};

/** Cỏ phủ sương đỏ (Làng Sương Sớm): giữ hoạ tiết cỏ DCSS, nhuộm về Máu thánh, thêm mảng sương sáng. */
export function mistify(image, seed) {
  return mapPixels(image, ([red, green, blue, alpha], x, y) => {
    const tinted = mixRgb([red, green, blue], mixRgb(C.blood, C.ink, 0.4), 0.45);
    const mist = hashNoise(x >> 3, y >> 3, seed) * 0.25;
    return [...mixRgb(tinted, mixRgb(C.blood, C.bone, 0.35), mist), alpha];
  });
}

/** Mặt đứng của tường: tối dần xuống chân tường để đọc ra độ cao trong góc nhìn 3/4. */
export function wallFace(image) {
  return mapPixels(image, ([red, green, blue, alpha], _x, y) => {
    return [...mixRgb([red, green, blue], C.ink, 0.25 + (y / image.height) * 0.35), alpha];
  });
}
