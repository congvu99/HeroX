import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface RgbaImage { width: number; height: number; rgba: Uint8Array }
interface OverrideTile { image: RgbaImage; glow?: { x: number; y: number; width: number; height: number; strength: number } }
interface OverrideEntry { path: string; tiles: (string | null)[][]; pixelScale?: number; clearBackground?: boolean; glowRects?: NonNullable<OverrideTile['glow']>[] }
interface OverridesModule {
  sliceOverride(entry: OverrideEntry, source: RgbaImage): Map<string, OverrideTile>;
  loadOverrideTiles(entries: OverrideEntry[], assetsDir: string): Map<string, OverrideTile>;
}
interface PngModule { createImage(width: number, height: number): RgbaImage; writePng(path: string, image: RgbaImage): void }

const ROOT = join(import.meta.dirname, '..', '..');
// Đường dẫn tính lúc chạy: script sinh map là .mjs không có kiểu, nên khai báo giao diện tối thiểu ở trên.
const importScript = async <T>(relPath: string): Promise<T> => (await import(pathToFileURL(join(ROOT, relPath)).href)) as T;

const GRID = 32;
const WINDOW_GLOW = { x: 1, y: 2, width: 3, height: 4, strength: 1 };

/** Ảnh 96x96, mỗi ô 32 px tô một màu riêng (đỏ = cột, xanh lá = hàng) để kiểm ô cắt đúng chỗ. */
function makeGridImage(png: PngModule): RgbaImage {
  const image = png.createImage(3 * GRID, 3 * GRID);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      image.rgba.set([Math.floor(x / GRID) * 100, Math.floor(y / GRID) * 100, (x + y) % 2 === 0 ? 0 : 255, 255], offset);
    }
  }
  return image;
}

const HOUSE: OverrideEntry = {
  path: 'tiles/pixellab/test-house.png',
  tiles: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', null, 'i']],
  // Cửa sổ trong ô g (hàng 3, cột 1) và một cửa vắt qua biên giữa ô e và ô f.
  glowRects: [
    { ...WINDOW_GLOW, y: 2 * GRID + WINDOW_GLOW.y },
    { x: 2 * GRID - 4, y: GRID + 10, width: 8, height: 12, strength: 0.8 },
  ],
};

describe('ô atlas ghi đè bằng ảnh PixelLab', () => {
  let overrides: OverridesModule;
  let png: PngModule;
  let assetsDir: string;

  beforeAll(async () => {
    overrides = await importScript<OverridesModule>('client/scripts/chapter-1/pixellab-tile-overrides.mjs');
    png = await importScript<PngModule>('tools/lib/png.mjs');
    assetsDir = mkdtempSync(join(tmpdir(), 'herox-overrides-'));
  });
  afterAll(() => rmSync(assetsDir, { recursive: true, force: true }));

  it('cắt ảnh 3x3 ô đúng vị trí, bỏ ô null, chia vùng sáng toạ độ ảnh về từng ô', () => {
    const tiles = overrides.sliceOverride(HOUSE, makeGridImage(png));
    expect([...tiles.keys()]).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'i']);
    const corner = tiles.get('f')?.image;
    expect(corner?.width).toBe(GRID);
    expect([...(corner?.rgba.subarray(0, 2) ?? [])]).toEqual([200, 100]);
    expect(tiles.get('g')?.glow).toEqual(WINDOW_GLOW);
    expect(tiles.get('a')?.glow).toBeUndefined();
    expect(tiles.get('e')?.glow).toEqual({ x: GRID - 4, y: 10, width: 4, height: 12, strength: 0.8 });
    expect(tiles.get('f')?.glow).toEqual({ x: 0, y: 10, width: 4, height: 12, strength: 0.8 });
  });

  it('pixelScale 2 cho khối 2x2 cùng màu (độ hạt như Kenney 16 px ×2)', () => {
    const tile = overrides.sliceOverride({ ...HOUSE, pixelScale: 2 }, makeGridImage(png)).get('a')?.image;
    const pixel = (x: number, y: number) => [...(tile?.rgba.subarray((y * GRID + x) * 4, (y * GRID + x) * 4 + 4) ?? [])];
    expect(pixel(0, 0)).toEqual(pixel(1, 1));
    expect(pixel(2, 0)).toEqual(pixel(3, 1));
  });

  it('clearBackground xoá nền đục liền mép, giữ vật thể và vùng cùng màu bị vật thể bao kín', () => {
    const BACKDROP = [249, 249, 249, 255];
    const image = png.createImage(GRID, GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const inWall = x >= 8 && x < 24 && y >= 8 && y < 24;
        const inHole = x >= 14 && x < 18 && y >= 14 && y < 18;
        image.rgba.set(inWall && !inHole ? [120, 110, 100, 255] : BACKDROP, (y * GRID + x) * 4);
      }
    }
    const tile = overrides.sliceOverride({ path: 'p.png', tiles: [['a']], clearBackground: true }, image).get('a')?.image;
    const alpha = (x: number, y: number) => tile?.rgba[(y * GRID + x) * 4 + 3];
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(10, 10)).toBe(255);
    expect(alpha(15, 15)).toBe(255);
  });

  it('báo lỗi rõ khi cỡ ảnh không khớp lưới', () => {
    expect(() => overrides.sliceOverride(HOUSE, png.createImage(64, 64))).toThrow(/cần 96x96/);
  });

  it('bỏ qua mục chưa có ảnh nguồn, nạp mục đã có', () => {
    expect(overrides.loadOverrideTiles([HOUSE], assetsDir).size).toBe(0);
    mkdirSync(join(assetsDir, 'tiles', 'pixellab'), { recursive: true });
    png.writePng(join(assetsDir, HOUSE.path), makeGridImage(png));
    expect(overrides.loadOverrideTiles([HOUSE], assetsDir).size).toBe(8);
  });
});
