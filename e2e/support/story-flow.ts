import type { Locator, Page, Response } from '@playwright/test';
import { SCENE_KEYS } from '../../client/src/scenes/scene-keys.js';
import { chestZone, findMapEntity, npcZone, waitForSceneActive, waitForWorldLevel, walkInto, type HeroxWindow, type WalkDirection } from './game-driver.js';

/** Đường dẫn ghi mốc truyện (`POST /herox/api/story/beat`). */
const STORY_BEAT_PATH = '/herox/api/story/beat';
const SKIP_BUTTON_NAME = 'Bỏ qua';
const CHALLENGE_INPUT_LABEL = 'Chữ tiếng Anh';

/** Hộp thoại truyện (DOM phủ trên canvas); panel công trình cũng là `dialog` nhưng có tên. */
export function storyDialog(page: Page): Locator {
  return page.locator('.story-overlay[role="dialog"]');
}

/**
 * Chờ server nhận mốc `beat` (response 200). Gọi trước hành động gây ra mốc để không lỡ response.
 * Không giới hạn riêng: giới hạn bởi timeout của test.
 */
export function waitForStoryBeat(page: Page, beat: string): Promise<Response> {
  return page.waitForResponse(
    (response) => {
      const request = response.request();
      if (request.method() !== 'POST' || new URL(response.url()).pathname !== STORY_BEAT_PATH) return false;
      return (request.postDataJSON() as { beat?: unknown } | null)?.beat === beat;
    },
    { timeout: 0 },
  );
}

/** Bấm "Bỏ qua" ở hộp thoại đang mở: thoại không có thử thách chữ thì đóng luôn. */
export async function skipDialog(page: Page): Promise<void> {
  await storyDialog(page).getByRole('button', { name: SKIP_BUTTON_NAME }).click();
}

/** Bỏ qua thoại rồi khắc chữ thánh (thử thách gõ lại chữ) bằng bàn phím. */
export async function skipDialogAndAnswer(page: Page, word: string): Promise<void> {
  await skipDialog(page);
  const input = storyDialog(page).getByLabel(CHALLENGE_INPUT_LABEL);
  await input.fill(word);
  await input.press('Enter');
}

/** Bước tới NPC `dialogId` ở level hiện tại, chờ hộp thoại mở. */
export async function talkTo(page: Page, levelId: string, dialogId: string, direction: WalkDirection): Promise<void> {
  await walkInto(page, npcZone(levelId, dialogId), direction, () => storyDialog(page).waitFor());
}

/** Bước tới rương chứa `itemId`; nhặt xong khi server nhận mốc của rương. */
export async function openChest(page: Page, levelId: string, itemId: string, beat: string, direction: WalkDirection): Promise<Response> {
  const beatResponse = waitForStoryBeat(page, beat);
  await walkInto(page, chestZone(levelId, itemId), direction, async () => {
    await beatResponse;
  });
  return beatResponse;
}

/** Đi qua cổng tới `targetLevel` ở level hiện tại, chờ level mới sẵn sàng. */
export async function usePortal(page: Page, levelId: string, targetLevel: string, direction: WalkDirection): Promise<void> {
  const portal = findMapEntity(levelId, 'Portal', 'targetLevel', targetLevel);
  await walkInto(page, portal, direction, () => waitForWorldLevel(page, targetLevel));
}

/** Bước vào vùng trận `encounterId` ở level hiện tại, chờ màn trận mở. */
export async function walkIntoBattle(page: Page, levelId: string, encounterId: string, direction: WalkDirection): Promise<void> {
  const trigger = findMapEntity(levelId, 'BattleTrigger', 'encounterId', encounterId);
  await walkInto(page, trigger, direction, () => waitForSceneActive(page, SCENE_KEYS.battle));
}

/** Tiền tố texture quái (giống `MONSTER_KEY_PREFIX` của client). */
const MONSTER_TEXTURE_PREFIX = 'monster:';

/** Đi bộ chạm vào một con quái lang thang ở level hiện tại, chờ màn trận mở. */
export async function touchRoamingMonster(page: Page): Promise<void> {
  const target = await page.evaluate(
    ({ key, prefix }) => {
      const world = (window as HeroxWindow).__HEROX_GAME__?.scene.getScene(key) as
        | { children: { list: { texture?: { key: string }; x: number; y: number; active: boolean }[] } }
        | undefined;
      const monster = world?.children.list.find((child) => child.active && child.texture?.key.startsWith(prefix) === true);
      return monster === undefined ? null : { x: monster.x - 10, y: monster.y - 14, width: 20, height: 14 };
    },
    { key: SCENE_KEYS.world, prefix: MONSTER_TEXTURE_PREFIX },
  );
  if (target === null) throw new Error('Không thấy quái lang thang trên bản đồ');
  await walkInto(page, target, 'left', () => waitForSceneActive(page, SCENE_KEYS.battle));
}
