import Phaser from 'phaser';
import { mapProjectCacheKey, type LoadedMapProject } from '../scenes/scene-keys';
import { resolveChapterMapPath, setActiveChapter } from './chapter-maps';
import { parseLdtkProject } from './ldtk-loader';
import { mapAssetUrl } from './map-asset-urls';

/**
 * Nạp project LDtk của chương bằng loader của scene đang chạy (ngoài `preload`), rồi đặt chương đang chơi.
 * World tự nạp file level và tileset theo project trong registry, nên đổi chương chỉ cần project mới.
 * Lỗi tải hoặc parse thì reject để nơi gọi báo lỗi thay vì kẹt màn.
 */
export function loadChapterProject(scene: Phaser.Scene, chapter: number): Promise<LoadedMapProject> {
  const sourcePath = resolveChapterMapPath(chapter);
  const cacheKey = mapProjectCacheKey(sourcePath);
  const parse = (): LoadedMapProject => {
    const loaded = { sourcePath, project: parseLdtkProject(scene.cache.json.get(cacheKey)) };
    setActiveChapter(chapter);
    return loaded;
  };
  if (scene.cache.json.exists(cacheKey)) return Promise.resolve().then(parse);

  return new Promise((resolve, reject) => {
    const onError = (file: Phaser.Loader.File): void => {
      if (file.key === cacheKey) reject(new Error(`Không tải được bản đồ chương ${chapter}`));
    };
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      try {
        resolve(parse());
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    scene.load.json(cacheKey, mapAssetUrl(sourcePath));
    scene.load.start();
  });
}
