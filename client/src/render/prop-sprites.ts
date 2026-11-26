import type Phaser from 'phaser';
import { monsterTextureKeyForFile } from './battle-actors';
import { NPC_SPRITE_PATHS } from './npc-sprite-paths';
import { TEXTURE_KEYS } from './placeholder-textures';
import { spriteAssetUrl } from './sprite-asset-urls';

const MONSTER_DIR = 'sprites/monsters/';

const CHEST_CLOSED_PATH = 'sprites/props/chest-closed.png';
const CHEST_OPEN_PATH = 'sprites/props/chest-open.png';

function textureKeyFor(path: string): string {
  // Ảnh quái (vd trùm làm NPC trên map) dùng chung khoá texture với trận để chỉ nạp một bản lên GPU.
  if (path.startsWith(MONSTER_DIR)) return monsterTextureKeyForFile(path.slice(MONSTER_DIR.length).replace(/\.png$/, ''));
  return `prop:${path}`;
}

/** Xếp hình NPC, rương vào hàng đợi tải; thiếu file thì nơi dùng rơi về hình tạm. */
export function queuePropSprites(scene: Phaser.Scene): void {
  for (const path of [...Object.values(NPC_SPRITE_PATHS), CHEST_CLOSED_PATH, CHEST_OPEN_PATH]) {
    const url = spriteAssetUrl(path);
    const key = textureKeyFor(path);
    if (url !== undefined && !scene.textures.exists(key)) scene.load.image(key, url);
  }
}

function loadedOr(scene: Phaser.Scene, path: string | undefined, fallback: string): string {
  if (path === undefined) return fallback;
  const key = textureKeyFor(path);
  return scene.textures.exists(key) ? key : fallback;
}

export function npcTextureKey(scene: Phaser.Scene, dialogId: string): string {
  return loadedOr(scene, NPC_SPRITE_PATHS[dialogId], TEXTURE_KEYS.npc);
}

export function chestTextureKey(scene: Phaser.Scene, opened: boolean): string {
  return loadedOr(scene, opened ? CHEST_OPEN_PATH : CHEST_CLOSED_PATH, TEXTURE_KEYS.chest);
}
