import type { TileGlowRect } from './golden-hour-layout';

/** Tên file ảnh atlas chương 1; dùng để chỉ thắp cửa sổ trên layer dùng đúng atlas này. */
export const CHAPTER_1_ATLAS_FILE = 'chapter-1.png';

// Dữ liệu sinh bởi client/scripts/generate-chapter-1.mjs, nằm ngoài thư mục client nên đọc qua glob của Vite.
const tileIndexFiles = import.meta.glob<Record<string, number>>('../../../assets/tilesets/chapter-1-tiles.json', {
  eager: true,
  import: 'default',
});
const glowFiles = import.meta.glob<Record<string, TileGlowRect>>('../../../assets/tilesets/chapter-1-glow.json', {
  eager: true,
  import: 'default',
});

/** Tên tile → chỉ số trong atlas chương 1. */
export const CHAPTER_1_TILE_INDEX: Readonly<Record<string, number>> = Object.values(tileIndexFiles)[0] ?? {};
/** Tên tile → vùng phát sáng trong ô (cửa sổ, cửa, cổng). */
export const CHAPTER_1_TILE_GLOW: Readonly<Record<string, TileGlowRect>> = Object.values(glowFiles)[0] ?? {};
