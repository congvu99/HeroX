// Đọc/ghi PNG bằng node:zlib, không thêm dependency npm. Ảnh trong bộ nhớ luôn là RGBA 8 bit.
// Hỗ trợ đọc: 8 bit RGBA/RGB/xám(+alpha), palette 1/2/4/8 bit (có tRNS), có hoặc không interlace Adam7.
// Loại khác (16 bit) báo lỗi rõ thay vì đọc sai âm thầm.
import { readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RGBA_CHANNELS = 4;
const COLOR_TYPE = { gray: 0, rgb: 2, palette: 3, grayAlpha: 4, rgba: 6 };
const CHANNELS_BY_COLOR_TYPE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const FILTER = { none: 0, sub: 1, up: 2, average: 3, paeth: 4 };
const OPAQUE = 255;
const BITS_PER_BYTE = 8;
const CHUNK_HEADER_BYTES = 8;
const CHUNK_CRC_BYTES = 4;
const INTERLACE_NONE = 0;
const INTERLACE_ADAM7 = 1;
// Adam7 (PNG spec mục 8.2): [xStart, yStart, xStep, yStep] của 7 lượt; nhiều tile DCSS lưu kiểu này.
const ADAM7_PASSES = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
const NO_INTERLACE_GRID = { xStart: 0, yStart: 0, xStep: 1, yStep: 1 };

export class PngFormatError extends Error {
  name = 'PngFormatError';
}

/** Ảnh RGBA trống (trong suốt). */
export function createImage(width, height) {
  return { width, height, rgba: Buffer.alloc(width * height * RGBA_CHANNELS), text: {} };
}

function readChunks(buffer, label) {
  if (buffer.length < SIGNATURE.length || !buffer.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    throw new PngFormatError(`${label}: không phải file PNG`);
  }
  const chunks = [];
  let offset = SIGNATURE.length;
  while (offset + CHUNK_HEADER_BYTES <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + CHUNK_HEADER_BYTES);
    const data = buffer.subarray(offset + CHUNK_HEADER_BYTES, offset + CHUNK_HEADER_BYTES + length);
    if (data.length !== length) throw new PngFormatError(`${label}: chunk ${type} bị cắt cụt`);
    chunks.push({ type, data });
    offset += CHUNK_HEADER_BYTES + length + CHUNK_CRC_BYTES;
    if (type === 'IEND') break;
  }
  return chunks;
}

function readHeader(chunk, label) {
  if (chunk?.type !== 'IHDR') throw new PngFormatError(`${label}: thiếu IHDR`);
  const data = chunk.data;
  const header = {
    width: data.readUInt32BE(0),
    height: data.readUInt32BE(4),
    bitDepth: data[8],
    colorType: data[9],
    interlace: data[12],
  };
  const channels = CHANNELS_BY_COLOR_TYPE[header.colorType];
  if (channels === undefined) throw new PngFormatError(`${label}: color type ${header.colorType} không hợp lệ`);
  if (header.interlace !== INTERLACE_NONE && header.interlace !== INTERLACE_ADAM7) {
    throw new PngFormatError(`${label}: kiểu interlace ${header.interlace} không hợp lệ`);
  }
  const lowBitAllowed = header.colorType === COLOR_TYPE.palette || header.colorType === COLOR_TYPE.gray;
  if (header.bitDepth !== BITS_PER_BYTE && !(lowBitAllowed && header.bitDepth < BITS_PER_BYTE)) {
    throw new PngFormatError(`${label}: ${header.bitDepth} bit/kênh (color type ${header.colorType}) chưa hỗ trợ`);
  }
  return { ...header, channels };
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distLeft = Math.abs(estimate - left);
  const distUp = Math.abs(estimate - up);
  const distUpLeft = Math.abs(estimate - upLeft);
  if (distLeft <= distUp && distLeft <= distUpLeft) return left;
  return distUp <= distUpLeft ? up : upLeft;
}

function strideOf(header, width) {
  return Math.ceil((width * header.channels * header.bitDepth) / BITS_PER_BYTE);
}

/** Bỏ bộ lọc từng dòng (PNG spec mục 9) của ảnh, hoặc một lượt Adam7, kích thước `size`. */
function unfilter(inflated, header, size, label) {
  const bytesPerPixel = Math.max(1, (header.channels * header.bitDepth) / BITS_PER_BYTE);
  const stride = strideOf(header, size.width);
  if (inflated.length < (stride + 1) * size.height) throw new PngFormatError(`${label}: dữ liệu ảnh thiếu`);
  const raw = Buffer.alloc(stride * size.height);
  for (let y = 0; y < size.height; y++) {
    const filter = inflated[y * (stride + 1)];
    const source = inflated.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? raw[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[rowStart - stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? raw[rowStart - stride + x - bytesPerPixel] : 0;
      raw[rowStart + x] = (source[x] + predict(filter, left, up, upLeft, label)) & OPAQUE;
    }
  }
  return { raw, stride };
}

function predict(filter, left, up, upLeft, label) {
  switch (filter) {
    case FILTER.none: return 0;
    case FILTER.sub: return left;
    case FILTER.up: return up;
    case FILTER.average: return (left + up) >> 1;
    case FILTER.paeth: return paeth(left, up, upLeft);
    default: throw new PngFormatError(`${label}: bộ lọc dòng ${filter} không hợp lệ`);
  }
}

/** Đọc mẫu thứ `index` trên dòng (hỗ trợ 1/2/4/8 bit mỗi mẫu). */
function sampleAt(raw, rowStart, index, bitDepth) {
  if (bitDepth === BITS_PER_BYTE) return raw[rowStart + index];
  const bitOffset = index * bitDepth;
  const byte = raw[rowStart + (bitOffset >> 3)];
  const shift = BITS_PER_BYTE - bitDepth - (bitOffset & 7);
  return (byte >> shift) & ((1 << bitDepth) - 1);
}

function paletteOf(chunks) {
  const plte = chunks.find((chunk) => chunk.type === 'PLTE')?.data;
  const trns = chunks.find((chunk) => chunk.type === 'tRNS')?.data;
  return { plte, trns };
}

function pixelToRgba(samples, header, palette, label) {
  const { colorType, bitDepth } = header;
  if (colorType === COLOR_TYPE.palette) {
    const index = samples[0];
    if (!palette.plte || index * 3 + 2 >= palette.plte.length) throw new PngFormatError(`${label}: chỉ số palette ${index} ngoài bảng`);
    const alpha = palette.trns && index < palette.trns.length ? palette.trns[index] : OPAQUE;
    return [palette.plte[index * 3], palette.plte[index * 3 + 1], palette.plte[index * 3 + 2], alpha];
  }
  if (colorType === COLOR_TYPE.gray || colorType === COLOR_TYPE.grayAlpha) {
    // Mở rộng xám ít bit lên 8 bit (vd 1 bit: 0 → 0, 1 → 255).
    const gray = Math.round((samples[0] * OPAQUE) / ((1 << bitDepth) - 1));
    return [gray, gray, gray, colorType === COLOR_TYPE.grayAlpha ? samples[1] : OPAQUE];
  }
  return [samples[0], samples[1], samples[2], colorType === COLOR_TYPE.rgba ? samples[3] : OPAQUE];
}

function readTextChunks(chunks) {
  const text = {};
  for (const chunk of chunks.filter((candidate) => candidate.type === 'tEXt')) {
    const separator = chunk.data.indexOf(0);
    if (separator > 0) text[chunk.data.toString('latin1', 0, separator)] = chunk.data.toString('latin1', separator + 1);
  }
  return text;
}

/** Giải mã PNG thành `{ width, height, rgba, text }` (`text`: các chunk tEXt). */
export function decodePng(buffer, label = 'PNG') {
  const chunks = readChunks(buffer, label);
  const header = readHeader(chunks[0], label);
  const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data));
  const inflated = inflateSync(compressed);
  const image = createImage(header.width, header.height);
  const context = { header, palette: paletteOf(chunks), image, label };
  if (header.interlace === INTERLACE_ADAM7) {
    let offset = 0;
    for (const [xStart, yStart, xStep, yStep] of ADAM7_PASSES) {
      const size = { width: Math.ceil((header.width - xStart) / xStep), height: Math.ceil((header.height - yStart) / yStep) };
      if (size.width <= 0 || size.height <= 0) continue;
      const passBytes = (strideOf(header, size.width) + 1) * size.height;
      placePixels(context, inflated.subarray(offset, offset + passBytes), size, { xStart, yStart, xStep, yStep });
      offset += passBytes;
    }
  } else {
    placePixels(context, inflated, { width: header.width, height: header.height }, NO_INTERLACE_GRID);
  }
  image.text = readTextChunks(chunks);
  return image;
}

/** Giải lọc một ảnh con rồi rải pixel về vị trí thật trong ảnh (ảnh không interlace: lưới bước 1). */
function placePixels({ header, palette, image, label }, data, size, grid) {
  const { raw, stride } = unfilter(data, header, size, label);
  const samples = new Array(header.channels);
  for (let y = 0; y < size.height; y++) {
    for (let x = 0; x < size.width; x++) {
      for (let channel = 0; channel < header.channels; channel++) {
        samples[channel] = sampleAt(raw, y * stride, x * header.channels + channel, header.bitDepth);
      }
      const offset = ((grid.yStart + y * grid.yStep) * image.width + grid.xStart + x * grid.xStep) * RGBA_CHANNELS;
      image.rgba.set(pixelToRgba(samples, header, palette, label), offset);
    }
  }
}

function encodeChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Mã hoá RGBA 8 bit, bộ lọc none; thứ tự chunk tEXt theo khoá để file tất định. */
export function encodePng(image) {
  const { width, height, rgba } = image;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = BITS_PER_BYTE;
  header[9] = COLOR_TYPE.rgba;
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([FILTER.none]), rgba.subarray(y * width * RGBA_CHANNELS, (y + 1) * width * RGBA_CHANNELS));
  }
  const textChunks = Object.keys(image.text ?? {}).sort().map((key) =>
    encodeChunk('tEXt', Buffer.from(`${key}\0${image.text[key]}`, 'latin1')));
  return Buffer.concat([
    SIGNATURE,
    encodeChunk('IHDR', header),
    ...textChunks,
    encodeChunk('IDAT', deflateSync(Buffer.concat(rows))),
    encodeChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function readPng(path) {
  return decodePng(readFileSync(path), path);
}

export function writePng(path, image) {
  writeFileSync(path, encodePng(image));
}

/** Chép vùng `source` (mặc định cả ảnh) vào `target` tại (x, y), trộn alpha "source-over". */
export function blit(target, source, x, y, region = { x: 0, y: 0, width: source.width, height: source.height }) {
  for (let row = 0; row < region.height; row++) {
    for (let col = 0; col < region.width; col++) {
      const targetX = x + col;
      const targetY = y + row;
      if (targetX < 0 || targetY < 0 || targetX >= target.width || targetY >= target.height) continue;
      const from = ((region.y + row) * source.width + region.x + col) * RGBA_CHANNELS;
      blendPixel(target, (targetY * target.width + targetX) * RGBA_CHANNELS, source.rgba.subarray(from, from + RGBA_CHANNELS));
    }
  }
}

function blendPixel(target, offset, [red, green, blue, alpha]) {
  if (alpha === 0) return;
  const destAlpha = target.rgba[offset + 3] / OPAQUE;
  const srcAlpha = alpha / OPAQUE;
  const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);
  const mix = (src, dest) => Math.round((src * srcAlpha + dest * destAlpha * (1 - srcAlpha)) / outAlpha);
  target.rgba[offset] = mix(red, target.rgba[offset]);
  target.rgba[offset + 1] = mix(green, target.rgba[offset + 1]);
  target.rgba[offset + 2] = mix(blue, target.rgba[offset + 2]);
  target.rgba[offset + 3] = Math.round(outAlpha * OPAQUE);
}

/** Hình chữ nhật nhỏ nhất chứa mọi pixel có alpha > 0; `null` khi ảnh trong suốt hoàn toàn. */
export function opaqueBounds(image, region = { x: 0, y: 0, width: image.width, height: image.height }) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      if (image.rgba[(y * image.width + x) * RGBA_CHANNELS + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
