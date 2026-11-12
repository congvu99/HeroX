import type Phaser from 'phaser';
import { HERO_FRAME_SIZE } from '../config/display';
import type { Facing } from '../input/movement-vector';
import { TEXTURE_KEYS } from './placeholder-textures';
import { spriteAssetUrl } from './sprite-asset-urls';

/** Sheet đi bộ LPC bản ô lớn (192 px, nhân vật 64 px ở giữa): 9 cột, hàng lên/trái/xuống/phải. */
const LPC_WALK_PATH = 'sprites/hero/hero_walk.png';
const LPC_TEXTURE_KEY = 'hero-lpc-walk';
const LPC_CELL_SIZE = 192;
const LPC_WALK_COLUMNS = 9;
/** Chân nhân vật trong ô 192 (đo trên sheet: đáy vùng có pixel ở hàng 128). */
const LPC_FEET_Y = 128;
/** Cột 0 là dáng đứng, cột 1–8 là chu kỳ bước. */
const LPC_FIRST_STEP_COLUMN = 1;
const WALK_FRAME_RATE = 10;
const LPC_ROW_BY_FACING: Readonly<Record<Facing, number>> = { up: 0, left: 1, down: 2, right: 3 };
/** Khung hình tạm: chân cách đáy khung 64 px 2 px. */
const PLACEHOLDER_FEET_PADDING = 2;

/** Hình hero đang dùng: sheet LPC nếu có trong bản build, không thì hình tạm vẽ bằng canvas. */
export interface HeroLook {
  readonly textureKey: string;
  readonly frameSize: number;
  /** Toạ độ y của chân trong khung, để đặt origin và hitbox. */
  readonly feetY: number;
  /** Có hoạt ảnh đi bộ `walkAnimationKey(facing)`. */
  readonly animated: boolean;
}

export function walkAnimationKey(facing: Facing): string {
  return `hero-walk-${facing}`;
}

/** Xếp sheet LPC vào hàng đợi tải (gọi ở `preload`); thiếu file thì bỏ qua. */
export function queueHeroSheet(scene: Phaser.Scene): void {
  const url = spriteAssetUrl(LPC_WALK_PATH);
  if (url === undefined || scene.textures.exists(LPC_TEXTURE_KEY)) return;
  scene.load.spritesheet(LPC_TEXTURE_KEY, url, { frameWidth: LPC_CELL_SIZE, frameHeight: LPC_CELL_SIZE });
}

/**
 * Chuẩn bị hình hero sau khi tải xong: thêm khung đặt tên theo hướng (dáng đứng) để mọi chỗ gọi
 * `setFrame('down')` dùng chung cho sheet LPC lẫn hình tạm, và tạo hoạt ảnh đi bộ 4 hướng.
 */
export function prepareHeroLook(scene: Phaser.Scene): HeroLook {
  if (!scene.textures.exists(LPC_TEXTURE_KEY)) {
    return { textureKey: TEXTURE_KEYS.hero, frameSize: HERO_FRAME_SIZE, feetY: HERO_FRAME_SIZE - PLACEHOLDER_FEET_PADDING, animated: false };
  }
  const texture = scene.textures.get(LPC_TEXTURE_KEY);
  for (const [facing, row] of Object.entries(LPC_ROW_BY_FACING) as [Facing, number][]) {
    if (!texture.has(facing)) texture.add(facing, 0, 0, row * LPC_CELL_SIZE, LPC_CELL_SIZE, LPC_CELL_SIZE);
    const key = walkAnimationKey(facing);
    if (scene.anims.exists(key)) continue;
    const start = row * LPC_WALK_COLUMNS + LPC_FIRST_STEP_COLUMN;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(LPC_TEXTURE_KEY, { start, end: row * LPC_WALK_COLUMNS + LPC_WALK_COLUMNS - 1 }),
      frameRate: WALK_FRAME_RATE,
      repeat: -1,
    });
  }
  return { textureKey: LPC_TEXTURE_KEY, frameSize: LPC_CELL_SIZE, feetY: LPC_FEET_Y, animated: true };
}
