import type Phaser from 'phaser';
import { TEXTURE_KEYS } from './placeholder-textures';
import { spriteAssetUrl } from './sprite-asset-urls';

/** Hình NPC theo `dialogId` trên map (cánh cửa, bàn thờ nhà nguyện cũng là "NPC" vì có hội thoại). */
const NPC_SPRITES: Readonly<Record<string, string>> = {
  keeper: 'sprites/npc/keeper.png',
  smith: 'sprites/npc/smith.png',
  'hollow-villager': 'sprites/npc/villager.png',
  'chapel-door': 'sprites/props/chapel-door.png',
  'chapel-altar': 'sprites/props/altar.png',
  scarecrow: 'sprites/monsters/scarecrow-demon.png',
};
const CHEST_CLOSED_PATH = 'sprites/props/chest-closed.png';
const CHEST_OPEN_PATH = 'sprites/props/chest-open.png';

function textureKeyFor(path: string): string {
  return `prop:${path}`;
}

/** Xếp hình NPC, rương vào hàng đợi tải; thiếu file thì nơi dùng rơi về hình tạm. */
export function queuePropSprites(scene: Phaser.Scene): void {
  for (const path of [...Object.values(NPC_SPRITES), CHEST_CLOSED_PATH, CHEST_OPEN_PATH]) {
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
  return loadedOr(scene, NPC_SPRITES[dialogId], TEXTURE_KEYS.npc);
}

export function chestTextureKey(scene: Phaser.Scene, opened: boolean): string {
  return loadedOr(scene, opened ? CHEST_OPEN_PATH : CHEST_CLOSED_PATH, TEXTURE_KEYS.chest);
}
