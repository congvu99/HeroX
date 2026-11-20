import type Phaser from 'phaser';
import type { CellRect } from './golden-hour-layout';
import type { LightingPreset } from './lighting-presets';

const rgba = (rgb: string, alpha: number): string => `rgba(${rgb}, ${alpha})`;

/** Tia sáng chéo: số tia, bề rộng (px), cường độ; màu và góc lấy từ preset. */
const SHAFT_COUNT = 7;
const SHAFT_WIDTH = { min: 10, max: 38 } as const;
const SHAFT_STRENGTH = { min: 0.45, max: 0.95 } as const;
/** Bề rộng ô lặp của texture tia nắng; TileSprite lặp ngang khi cuộn. */
export const SHAFT_TILE_WIDTH = 512;
/** Tia nhạt dần về phía dưới: alpha = clamp(bắt đầu − y/cao, sàn, 1), trần alpha tránh cháy sáng. */
const SHAFT_FADE_START = 1.15;
const SHAFT_FADE_FLOOR = 0.3;
const SHAFT_MAX_ALPHA = 0.95;
/** Tính tia ở 1/4 độ phân giải rồi phóng có làm mịn: tia vốn mờ nên không thấy khác, rẻ hơn 16 lần. */
const SHAFT_DOWNSCALE = 4;
/** Hạt giống cố định: tia nắng giống nhau mỗi lần mở game. */
const SHAFT_SEED = 11;

/** Vẽ bóng ở độ phân giải thấp rồi phóng có làm mịn để mờ viền (Safari cũ không có `context.filter`). */
const SHADOW_DOWNSCALE = 6;

const RGBA_CHANNELS = 4;
const OPAQUE = 255;

function canvasTexture(scene: Phaser.Scene, key: string, width: number, height: number): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Không tạo được texture ${key}`);
  return texture;
}

/** Dải màu nhân toàn màn hình (vẽ một lần). */
export function createToneTexture(scene: Phaser.Scene, key: string, width: number, height: number, preset: LightingPreset): void {
  if (scene.textures.exists(key)) return;
  const texture = canvasTexture(scene, key, width, height);
  const context = texture.getContext();
  const gradient = context.createLinearGradient(width, 0, 0, height);
  gradient.addColorStop(0, preset.toneLight);
  gradient.addColorStop(1, preset.toneDark);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  texture.refresh();
}

/** Quầng sáng cộng thêm ở góc trên phải: đậm nhất ở góc rồi tắt hẳn. */
export function createSunWashTexture(scene: Phaser.Scene, key: string, width: number, height: number, preset: LightingPreset): void {
  if (scene.textures.exists(key)) return;
  const texture = canvasTexture(scene, key, width, height);
  const context = texture.getContext();
  const radius = Math.hypot(width, height);
  const gradient = context.createRadialGradient(width, 0, 0, width, 0, radius);
  gradient.addColorStop(0, rgba(preset.washRgb, preset.washAlpha));
  gradient.addColorStop(1, rgba(preset.washRgb, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  texture.refresh();
}

/** Bộ sinh số giả ngẫu nhiên tất định (mulberry32). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface Shaft {
  readonly center: number;
  readonly width: number;
  readonly strength: number;
}

/** Ảnh lặp ngang liền mạch khi chu kỳ theo phương vuông góc tia = bề rộng ô × cos(góc). */
function randomShafts(period: number): Shaft[] {
  const random = seededRandom(SHAFT_SEED);
  return Array.from({ length: SHAFT_COUNT }, () => ({
    center: random() * period,
    width: SHAFT_WIDTH.min + random() * (SHAFT_WIDTH.max - SHAFT_WIDTH.min),
    strength: SHAFT_STRENGTH.min + random() * (SHAFT_STRENGTH.max - SHAFT_STRENGTH.min),
  }));
}

/** Cường độ tại điểm (x, y) theo px ảnh đầy đủ. */
function shaftIntensity(shafts: readonly Shaft[], angleRad: number, x: number, y: number): number {
  const period = SHAFT_TILE_WIDTH * Math.cos(angleRad);
  const across = x * Math.cos(angleRad) + y * Math.sin(angleRad);
  let intensity = 0;
  for (const shaft of shafts) {
    // Khoảng cách tới tia theo chu kỳ để ảnh lặp ngang liền mạch.
    const raw = (((across - shaft.center) % period) + period) % period;
    const distance = Math.min(raw, period - raw);
    intensity += shaft.strength * Math.exp(-(distance * distance) / (2 * shaft.width * shaft.width));
  }
  return intensity;
}

/** Ảnh tia ở độ phân giải thấp; mỗi điểm lấy mẫu tại tâm ô tương ứng trên ảnh đầy đủ. */
function smallShaftImage(context: CanvasRenderingContext2D, size: { width: number; height: number }, fullHeight: number, preset: LightingPreset): ImageData {
  const { width, height } = size;
  const angleRad = (preset.shaftAngleDeg * Math.PI) / 180;
  const shafts = randomShafts(SHAFT_TILE_WIDTH * Math.cos(angleRad));
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const fullY = (y + 0.5) * SHAFT_DOWNSCALE;
    const fade = Math.min(1, Math.max(SHAFT_FADE_FLOOR, SHAFT_FADE_START - fullY / fullHeight));
    for (let x = 0; x < width; x++) {
      const intensity = shaftIntensity(shafts, angleRad, (x + 0.5) * SHAFT_DOWNSCALE, fullY);
      const offset = (y * width + x) * RGBA_CHANNELS;
      image.data[offset] = preset.shaftRgb[0];
      image.data[offset + 1] = preset.shaftRgb[1];
      image.data[offset + 2] = preset.shaftRgb[2];
      image.data[offset + 3] = Math.round(Math.min(SHAFT_MAX_ALPHA, intensity * fade) * OPAQUE);
    }
  }
  return image;
}

/**
 * Tia nắng chéo lặp ngang được (tia gần mép phải lặp lại ở mép trái), alpha là cường độ; nhạt dần về phía dưới.
 */
export function createShaftTexture(scene: Phaser.Scene, key: string, height: number, preset: LightingPreset): void {
  if (scene.textures.exists(key)) return;
  const small = document.createElement('canvas');
  // Bề rộng ô lặp chia hết cho hệ số thu nhỏ nên ảnh nhỏ vẫn lặp ngang liền mạch.
  small.width = SHAFT_TILE_WIDTH / SHAFT_DOWNSCALE;
  small.height = Math.max(1, Math.ceil(height / SHAFT_DOWNSCALE));
  const smallContext = small.getContext('2d');
  if (smallContext === null) throw new Error(`Không tạo được canvas cho texture ${key}`);
  smallContext.putImageData(smallShaftImage(smallContext, small, height, preset), 0, 0);
  const texture = canvasTexture(scene, key, SHAFT_TILE_WIDTH, height);
  const context = texture.getContext();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(small, 0, 0, SHAFT_TILE_WIDTH, small.height * SHAFT_DOWNSCALE);
  texture.refresh();
}

/**
 * Bóng đổ của mọi ô chắn (nhà, tường, cây) trên cả level, vẽ một lần: dời, làm mờ viền, rồi xoá phần nằm trên chính
 * ô chắn để mái nhà không tự tối. Trả về false khi trình duyệt không cấp được canvas.
 */
export function createShadowTexture(
  scene: Phaser.Scene,
  key: string,
  size: { readonly width: number; readonly height: number },
  solids: readonly CellRect[],
  preset: LightingPreset,
): boolean {
  const { width, height } = size;
  const small = document.createElement('canvas');
  small.width = Math.ceil(width / SHADOW_DOWNSCALE);
  small.height = Math.ceil(height / SHADOW_DOWNSCALE);
  const smallContext = small.getContext('2d');
  if (smallContext === null) return false;
  smallContext.fillStyle = preset.shadowColor;
  for (const rect of solids) {
    smallContext.fillRect(
      (rect.x + preset.shadowOffset.x) / SHADOW_DOWNSCALE,
      (rect.y + preset.shadowOffset.y) / SHADOW_DOWNSCALE,
      rect.width / SHADOW_DOWNSCALE,
      rect.height / SHADOW_DOWNSCALE,
    );
  }
  const texture = canvasTexture(scene, key, width, height);
  const context = texture.getContext();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(small, 0, 0, width, height);
  context.globalCompositeOperation = 'destination-out';
  for (const rect of solids) context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.globalCompositeOperation = 'source-over';
  texture.refresh();
  return true;
}
