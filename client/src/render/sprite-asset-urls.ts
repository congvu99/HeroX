/**
 * Bảng đường dẫn sprite (tính từ thư mục `assets/`) → URL đã băm của Vite.
 * Khác `mapAssetUrl`: thiếu sprite không làm hỏng game, nơi gọi tự dùng hình tạm vẽ bằng canvas.
 */
const ASSET_ROOT_PREFIX = /^(?:\.\.\/)+assets\//;

const globbedUrls = import.meta.glob<string>('../../../assets/sprites/**/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
});

const urlsByAssetPath = new Map(
  Object.entries(globbedUrls).map(([globKey, url]) => [globKey.replace(ASSET_ROOT_PREFIX, ''), url]),
);

/** Ví dụ `spriteAssetUrl('sprites/npc/keeper.png')`; `undefined` khi chưa có file. */
export function spriteAssetUrl(assetPath: string): string | undefined {
  return urlsByAssetPath.get(assetPath);
}
