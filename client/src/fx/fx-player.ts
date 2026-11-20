import Phaser from 'phaser';
import { fxFrameName, FxIndexFormatError, fxOrigin, parseFxIndex, type FxIndex, type FxInfo } from './fx-index';

/** Atlas nằm ở `client/public/fx/`, Vite phục vụ dưới base `/herox/`. */
const FX_BASE_URL = `${import.meta.env.BASE_URL}fx/`;
const FX_INDEX_CACHE_KEY = 'fx-index';

const FX_KEY_PREFIX = 'fx';

/** Khoá loader/cache của hiệu ứng (chỉ mục và atlas), để scene phân biệt lỗi tải hiệu ứng với lỗi tải bản đồ. */
export function isFxAssetKey(key: string): boolean {
  return key.startsWith(FX_KEY_PREFIX);
}

function textureKey(name: string): string {
  return `fx:${name}`;
}

function animationKey(name: string): string {
  return `fx-anim:${name}`;
}

export interface FxPlayOptions {
  readonly scale?: number;
  readonly depth?: number;
  readonly flipX?: boolean;
  /** Xoay hiệu ứng (độ). Khung dọc: hiệu ứng pixelfx vẽ hướng phải, xoay -90° để hướng lên (về phía quái). */
  readonly angle?: number;
  /** Tốc độ phát (1 = đúng fps gốc); < 1 phát chậm để người chơi kịp xem. */
  readonly timeScale?: number;
}

/**
 * Xếp hàng nạp chỉ mục và mọi atlas hiệu ứng trong `preload` của scene. Atlas chỉ biết sau khi chỉ mục về;
 * loader vẫn chạy tiếp hàng đợi mới thêm. Atlas đã có (scene chạy lại) thì bỏ qua. `onlyNames`: chỉ nạp các hiệu ứng
 * này (bản đồ chỉ cần hiệu ứng kỹ năng di chuyển, không tải cả bộ hiệu ứng trận).
 */
export function queueFxAssets(scene: Phaser.Scene, onlyNames?: readonly string[]): void {
  const queueAtlases = (): void => {
    for (const name of readFxIndex(scene).keys()) {
      if (onlyNames !== undefined && !onlyNames.includes(name)) continue;
      if (!scene.textures.exists(textureKey(name))) {
        scene.load.atlas(textureKey(name), `${FX_BASE_URL}${name}.png`, `${FX_BASE_URL}${name}.json`);
      }
    }
  };
  if (scene.cache.json.exists(FX_INDEX_CACHE_KEY)) {
    queueAtlases();
    return;
  }
  scene.load.once(`${Phaser.Loader.Events.FILE_KEY_COMPLETE}json-${FX_INDEX_CACHE_KEY}`, queueAtlases);
  scene.load.json(FX_INDEX_CACHE_KEY, `${FX_BASE_URL}fx-index.json`);
}

/** Chỉ mục hỏng hoặc chưa tải được thì trận vẫn chơi được, chỉ mất hiệu ứng. */
function readFxIndex(scene: Phaser.Scene): FxIndex {
  try {
    return parseFxIndex(scene.cache.json.get(FX_INDEX_CACHE_KEY));
  } catch (error) {
    if (error instanceof FxIndexFormatError) return new Map();
    throw error;
  }
}

/**
 * Phát hiệu ứng pixelfx theo `meta.pixelfx` (fps, pivot). Sprite được tái dùng qua pool nên một trận dài không tạo
 * đối tượng mới mỗi lần tung chiêu (tránh GC giật khung).
 */
export class FxPlayer {
  private readonly pool: Phaser.GameObjects.Sprite[] = [];
  private readonly index: FxIndex;

  constructor(private readonly scene: Phaser.Scene) {
    this.index = readFxIndex(scene);
    for (const [name, info] of this.index) this.ensureAnimation(name, info);
  }

  has(name: string): boolean {
    return this.index.has(name) && this.scene.textures.exists(textureKey(name));
  }

  /** Phát một lần tại (x, y) theo pivot của hiệu ứng; trả `false` khi hiệu ứng không có (atlas lỗi). */
  play(name: string, x: number, y: number, options: FxPlayOptions = {}): boolean {
    const info = this.index.get(name);
    if (info === undefined || !this.has(name)) return false;
    const sprite = this.acquire();
    const origin = fxOrigin(info);
    sprite
      .setTexture(textureKey(name), fxFrameName(info, 0))
      .setOrigin(options.flipX === true ? 1 - origin.x : origin.x, origin.y)
      .setFlipX(options.flipX === true)
      .setAngle(options.angle ?? 0)
      .setScale(options.scale ?? 1)
      .setDepth(options.depth ?? 0)
      .setPosition(x, y)
      .setActive(true)
      .setVisible(true);
    sprite.play(animationKey(name));
    sprite.anims.timeScale = options.timeScale ?? 1;
    return true;
  }

  private ensureAnimation(name: string, info: FxInfo): void {
    const key = animationKey(name);
    if (this.scene.anims.exists(key) || !this.scene.textures.exists(textureKey(name))) return;
    const frames = Array.from({ length: info.frames }, (_, frameIndex) => ({ key: textureKey(name), frame: fxFrameName(info, frameIndex) }));
    // Hiệu ứng lặp (khiên, tụ phép) cũng chỉ phát một vòng: trận cần nhịp nhanh, không giữ hiệu ứng trên màn.
    this.scene.anims.create({ key, frames, frameRate: info.fps, repeat: 0 });
  }

  private acquire(): Phaser.GameObjects.Sprite {
    const idle = this.pool.find((sprite) => !sprite.active);
    if (idle !== undefined) return idle;
    const sprite = this.scene.add.sprite(0, 0, '__DEFAULT');
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.setActive(false).setVisible(false));
    this.pool.push(sprite);
    return sprite;
  }
}
