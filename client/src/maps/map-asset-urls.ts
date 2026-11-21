/**
 * Bảng đường dẫn asset map (tính từ thư mục `assets/` ở gốc repo) → URL đã băm của Vite.
 * Vite chỉ phát URL, không nhúng nội dung: client chỉ tải level đang chơi và tileset nó dùng.
 */
const ASSET_ROOT_PREFIX = /^(?:\.\.\/)+assets\//;

const globbedUrls = import.meta.glob<string>('../../../assets/{maps,tilesets}/**/*.{ldtk,ldtkl,png}', {
  query: '?url',
  import: 'default',
  eager: true,
});

const urlsByAssetPath = new Map(
  Object.entries(globbedUrls).map(([globKey, url]) => [globKey.replace(ASSET_ROOT_PREFIX, ''), url]),
);

/** Ví dụ `mapAssetUrl('maps/test-room.ldtk')`. Ném lỗi khi asset không có trong bản build. */
export function mapAssetUrl(assetPath: string): string {
  const url = urlsByAssetPath.get(assetPath);
  if (url === undefined) throw new Error(`Không có asset map "${assetPath}" trong bản build`);
  return url;
}

/** Kiểm tra asset map có trong bản build hay không, để chọn chương mà không làm `mapAssetUrl` ném lỗi. */
export function hasMapAsset(assetPath: string): boolean {
  return urlsByAssetPath.has(assetPath);
}
