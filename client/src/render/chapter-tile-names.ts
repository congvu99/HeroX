// Bảng `tên tile → chỉ số` sinh bởi client/scripts/generate-chapter-*.mjs, nằm ngoài thư mục client nên đọc qua glob của Vite.
const tileIndexFiles = import.meta.glob<Record<string, number>>('../../../assets/tilesets/chapter-*-tiles.json', {
  eager: true,
  import: 'default',
});

const TILE_INDEX_FILE_SUFFIX = '-tiles.json';
const ATLAS_FILE_SUFFIX = '.png';

/** `.../chapter-2-tiles.json` → `chapter-2.png` (ảnh atlas mà bảng tên mô tả). */
function atlasFileOf(tileIndexPath: string): string {
  const fileName = tileIndexPath.slice(tileIndexPath.lastIndexOf('/') + 1);
  return fileName.slice(0, -TILE_INDEX_FILE_SUFFIX.length) + ATLAS_FILE_SUFFIX;
}

const TILE_INDEX_BY_ATLAS: ReadonlyMap<string, Readonly<Record<string, number>>> = new Map(
  Object.entries(tileIndexFiles).map(([path, table]) => [atlasFileOf(path), table]),
);

/**
 * Bảng `tên tile → chỉ số atlas` của tileset có đường dẫn `relPath` (theo tên file ảnh `chapter-N.png`).
 * Tileset không thuộc bộ atlas chương (placeholder, test-room) trả `undefined`.
 */
export function tileIndexForAtlas(relPath: string): Readonly<Record<string, number>> | undefined {
  // LDtk trên Windows có thể ghi `\` trong đường dẫn.
  const normalized = relPath.replace(/\\/g, '/');
  return TILE_INDEX_BY_ATLAS.get(normalized.slice(normalized.lastIndexOf('/') + 1));
}
