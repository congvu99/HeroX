// Phép biến đổi ảnh RGBA (định dạng của png.mjs) dùng chung cho script dựng asset tạm và sinh map.
import { blit, createImage, opaqueBounds } from './png.mjs';

const RGBA_CHANNELS = 4;
const OPAQUE = 255;

export class ImageFitError extends Error {
  name = 'ImageFitError';
}

/** Cắt vùng chữ nhật thành ảnh mới. */
export function crop(image, region) {
  const out = createImage(region.width, region.height);
  for (let row = 0; row < region.height; row++) {
    const from = ((region.y + row) * image.width + region.x) * RGBA_CHANNELS;
    image.rgba.copy(out.rgba, row * region.width * RGBA_CHANNELS, from, from + region.width * RGBA_CHANNELS);
  }
  return out;
}

/** Phóng nguyên lần bằng nearest-neighbour để giữ nét pixel art. */
export function scaleNearest(image, factor) {
  const out = createImage(image.width * factor, image.height * factor);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const from = (Math.floor(y / factor) * image.width + Math.floor(x / factor)) * RGBA_CHANNELS;
      image.rgba.copy(out.rgba, (y * out.width + x) * RGBA_CHANNELS, from, from + RGBA_CHANNELS);
    }
  }
  return out;
}

/** Chồng các ảnh cùng kích thước theo thứ tự (ảnh đầu ở dưới cùng). */
export function composite(layers) {
  const [first] = layers;
  const out = createImage(first.width, first.height);
  for (const layer of layers) blit(out, layer, 0, 0);
  return out;
}

/**
 * Cắt sát vùng có pixel, phóng `scale` lần rồi đặt vào khung `frameSize`: chân chạm hàng pixel dưới cùng,
 * canh giữa ngang. Client đặt origin (0.5, 1) là nhân vật đứng đúng ô.
 */
export function fitBottomCenter(image, frameSize, scale = 1) {
  const bounds = opaqueBounds(image);
  if (!bounds) throw new ImageFitError('Ảnh trong suốt hoàn toàn, không có gì để đặt vào khung');
  const sprite = scaleNearest(crop(image, bounds), scale);
  if (sprite.width > frameSize || sprite.height > frameSize) {
    throw new ImageFitError(`Hình ${sprite.width}x${sprite.height} vượt khung ${frameSize}`);
  }
  const frame = createImage(frameSize, frameSize);
  blit(frame, sprite, Math.floor((frameSize - sprite.width) / 2), frameSize - sprite.height);
  return frame;
}

/** Áp `transform([r, g, b, a], x, y) → [r, g, b, a]` cho mọi pixel không trong suốt, trả ảnh mới. */
export function mapPixels(image, transform) {
  const out = createImage(image.width, image.height);
  out.text = { ...image.text };
  for (let offset = 0; offset < image.rgba.length; offset += RGBA_CHANNELS) {
    const pixel = [...image.rgba.subarray(offset, offset + RGBA_CHANNELS)];
    const index = offset / RGBA_CHANNELS;
    out.rgba.set(pixel[3] === 0 ? pixel : transform(pixel, index % image.width, Math.floor(index / image.width)), offset);
  }
  return out;
}

/** Ảnh vuông `size` vẽ theo hàm `painter(x, y) → [r, g, b, a] | null` (null = trong suốt). */
export function paint(size, painter) {
  const out = createImage(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = painter(x, y);
      if (color) out.rgba.set(color.length === 3 ? [...color, OPAQUE] : color, (y * size + x) * RGBA_CHANNELS);
    }
  }
  return out;
}

/** Tô hình chữ nhật đặc (ghi đè, không trộn alpha); phần ngoài ảnh bị bỏ qua. */
export function fillRect(image, { x, y, width, height }, rgba) {
  for (let row = Math.max(0, y); row < Math.min(image.height, y + height); row++) {
    for (let col = Math.max(0, x); col < Math.min(image.width, x + width); col++) {
      image.rgba.set(rgba.length === 3 ? [...rgba, OPAQUE] : rgba, (row * image.width + col) * RGBA_CHANNELS);
    }
  }
}

/** Có pixel nào trong suốt một phần không (tile đối tượng vẽ chồng lên sàn thay vì thay sàn). */
export function hasTransparency(image) {
  for (let offset = 3; offset < image.rgba.length; offset += RGBA_CHANNELS) {
    if (image.rgba[offset] < OPAQUE) return true;
  }
  return false;
}

export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & OPAQUE, (value >> 8) & OPAQUE, value & OPAQUE];
}

export function mixRgb(from, to, amount) {
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount));
}

/** Độ sáng cảm nhận 0..1 (hệ số Rec. 601). */
export function luminance([red, green, blue]) {
  return (0.299 * red + 0.587 * green + 0.114 * blue) / OPAQUE;
}

/** Nhiễu tất định 0..1 theo toạ độ và hạt giống, để hoạ tiết vẽ bằng script sinh lại không đổi. */
export function hashNoise(x, y, seed = 0) {
  let value = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}
