import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { SCENE_KEYS, START_MAP_PATH } from '../../client/src/scenes/scene-keys.js';
import { buildingDoorRect, interactionRect } from '../../client/src/world/trigger-zones.js';

/**
 * Điều khiển game qua hook dev `window.__HEROX_GAME__` (chỉ có ở bản dev của client).
 * Chỉ đặt hero vào vùng kích hoạt và đọc trạng thái; vào trận, mở công trình, chấm điểm vẫn đi đúng luồng của game.
 * Cấu trúc scene bên dưới là chi tiết nội bộ: đổi tên trường trong scene thì sửa ở file này.
 */

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Hình dạng tối thiểu của game Phaser mà driver dùng; mọi truy cập trường nội bộ gom ở đây. */
interface GameHandle {
  readonly canvas: HTMLCanvasElement;
  readonly scale: { readonly width: number };
  readonly scene: {
    isActive(key: string): boolean;
    getScene(key: string): unknown;
  };
}

interface ArcadeBody {
  readonly center: { readonly x: number; readonly y: number };
  reset(x: number, y: number): void;
}

interface WorldSceneHandle {
  readonly hero: { readonly x: number; readonly y: number; readonly body: ArcadeBody } | null;
  readonly levelRef: { readonly identifier: string };
  readonly transitioning: boolean;
}

interface BattleSessionHandle {
  readonly current: {
    readonly prompt: { readonly wordId: string; readonly shownAtMs: number } | null;
    readonly combo: { readonly count: number };
    readonly outcome: string;
  };
  readonly isOver: boolean;
  readonly isInputLocked: boolean;
  wordById(wordId: string): { readonly word: string } | undefined;
}

interface BattleSceneHandle {
  readonly session: BattleSessionHandle | null;
  readonly ring: {
    readonly slots: readonly { readonly wordId: string | null; readonly container: { readonly x: number; readonly y: number } }[];
  };
  /** Nút hiện khi trận kết thúc (`Về bản đồ`, có thể kèm `Thử lại`); nút về bản đồ thêm vào đầu tiên. */
  readonly endButtons: readonly { readonly x: number; readonly y: number }[];
}

export type HeroxWindow = Window & { __HEROX_GAME__?: GameHandle };

/** Trạng thái đề hiện tại khi đã nhận input: từ cần trả lời và mốc hiện đề (để phân biệt đề mới). */
export interface ReadyPrompt {
  readonly wordId: string;
  readonly word: string;
  readonly shownAtMs: number;
}

// Level tách file nằm trong thư mục cùng tên file project LDtk của map khởi đầu.
const MAP_DIRECTORY = new URL(`../../assets/${START_MAP_PATH.replace(/\.ldtk$/, '')}/`, import.meta.url);

interface LdtkEntity {
  readonly __identifier: string;
  readonly px: readonly [number, number];
  readonly width: number;
  readonly height: number;
  readonly fieldInstances: readonly { readonly __identifier: string; readonly __value: unknown }[];
}

/** Đọc vị trí entity trong file level LDtk (tách file) theo loại và giá trị một trường, ví dụ BattleTrigger có encounterId. */
export function findMapEntity(levelId: string, identifier: string, field: string, value: string): Rect {
  const level = JSON.parse(readFileSync(new URL(`${levelId}.ldtkl`, MAP_DIRECTORY), 'utf8')) as {
    readonly layerInstances: readonly { readonly entityInstances?: readonly LdtkEntity[] }[];
  };
  const entity = level.layerInstances
    .flatMap((layer) => layer.entityInstances ?? [])
    .find((candidate) => candidate.__identifier === identifier && candidate.fieldInstances.some((f) => f.__identifier === field && f.__value === value));
  if (entity === undefined) throw new Error(`Không thấy ${identifier} ${field}=${value} trong level ${levelId}`);
  return { x: entity.px[0], y: entity.px[1], width: entity.width, height: entity.height };
}

/** Vùng nói chuyện với NPC `dialogId` (đúng hàm tính vùng của client). */
export function npcZone(levelId: string, dialogId: string): Rect {
  return interactionRect(findMapEntity(levelId, 'Npc', 'dialogId', dialogId));
}

/** Vùng nhặt rương chứa `itemId`. */
export function chestZone(levelId: string, itemId: string): Rect {
  return interactionRect(findMapEntity(levelId, 'Chest', 'itemId', itemId));
}

/** Cửa công trình: dùng đúng hàm tính cửa của client. */
export function buildingDoor(levelId: string, buildingId: string): Rect {
  return buildingDoorRect(findMapEntity(levelId, 'Building', 'buildingId', buildingId));
}

export async function waitForSceneActive(page: Page, sceneKey: string): Promise<void> {
  await page.waitForFunction((key) => (window as HeroxWindow).__HEROX_GAME__?.scene.isActive(key) === true, sceneKey);
}

export async function isSceneActive(page: Page, sceneKey: string): Promise<boolean> {
  return page.evaluate((key) => (window as HeroxWindow).__HEROX_GAME__?.scene.isActive(key) === true, sceneKey);
}

/** Chờ bản đồ đứng ở level `levelId`, hero đã tạo và không đang chuyển cảnh. */
export async function waitForWorldLevel(page: Page, levelId: string): Promise<void> {
  await page.waitForFunction(
    ({ key, level }) => {
      const game = (window as HeroxWindow).__HEROX_GAME__;
      if (game?.scene.isActive(key) !== true) return false;
      const world = game.scene.getScene(key) as WorldSceneHandle;
      return world.levelRef.identifier === level && world.hero !== null && !world.transitioning;
    },
    { key: SCENE_KEYS.world, level: levelId },
  );
  // Vùng kích hoạt chỉ "lên cò" sau một khung hero đứng ngoài vùng: chờ vài khung để update đã chạy.
  await page.evaluate(() => new Promise<void>((resolve) => {
    let framesLeft = 3;
    const step = (): void => {
      framesLeft -= 1;
      if (framesLeft <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
}

/** Chờ màn trận đóng và bản đồ chạy tiếp (scene Phaser đang dừng thì `isActive` trả false). */
export async function waitForWorldResumed(page: Page): Promise<void> {
  await page.waitForFunction(
    ({ world, battle }) => {
      const game = (window as HeroxWindow).__HEROX_GAME__;
      return game?.scene.isActive(world) === true && !game.scene.isActive(battle);
    },
    { world: SCENE_KEYS.world, battle: SCENE_KEYS.battle },
  );
}

/** Đặt tâm hitbox chân hero tại điểm `target` (toạ độ bản đồ). */
async function placeHeroBodyCenter(page: Page, target: { x: number; y: number }): Promise<void> {
  await page.evaluate(
    ({ key, point }) => {
      const world = (window as HeroxWindow).__HEROX_GAME__?.scene.getScene(key) as WorldSceneHandle | undefined;
      const hero = world?.hero;
      if (!hero) throw new Error('Bản đồ chưa có hero');
      // Lấy độ lệch tâm hitbox so với sprite từ trạng thái bước vật lý trước; ngay sau `reset` body chưa đồng bộ.
      const offsetX = hero.body.center.x - hero.x;
      const offsetY = hero.body.center.y - hero.y;
      hero.body.reset(point.x - offsetX, point.y - offsetY);
    },
    { key: SCENE_KEYS.world, point: target },
  );
}

/** Hướng hero đi vào vùng kích hoạt (cửa công trình ở phía trên, cổng ở mép bản đồ...). */
export type WalkDirection = 'up' | 'down' | 'left' | 'right';
const WALK_KEYS: Readonly<Record<WalkDirection, string>> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/** Điểm đứng ngay ngoài vùng `rect`, phía ngược hướng đi. */
function approachPoint(rect: Rect, direction: WalkDirection): { x: number; y: number } {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  switch (direction) {
    case 'up':
      return { x: centerX, y: rect.y + rect.height + APPROACH_GAP_PX };
    case 'down':
      return { x: centerX, y: rect.y - APPROACH_GAP_PX };
    case 'left':
      return { x: rect.x + rect.width + APPROACH_GAP_PX, y: centerY };
    case 'right':
      return { x: rect.x - APPROACH_GAP_PX, y: centerY };
  }
}
/** Khoảng cách từ mép vùng tới tâm hitbox khi đặt hero, đủ để đứng ngoài vùng. */
const APPROACH_GAP_PX = 20;

/**
 * Đặt hero ngay ngoài vùng `rect` rồi giữ phím mũi tên đi vào, như người chơi đi bộ tới.
 * Không đặt thẳng vào vùng: vùng sát tường thì va chạm sẽ đẩy hero ra trước khi game kiểm vùng.
 * Nhả phím khi `arrived` xong (scene mới đã mở).
 */
export async function walkInto(page: Page, rect: Rect, direction: WalkDirection, arrived: () => Promise<void>): Promise<void> {
  await placeHeroBodyCenter(page, approachPoint(rect, direction));
  const key = WALK_KEYS[direction];
  await page.keyboard.down(key);
  try {
    await arrived();
  } finally {
    await page.keyboard.up(key);
  }
}

/** Chờ đề mới (khác `previousShownAtMs`) đã qua thời gian khoá input; trả `null` khi trận đã kết thúc. */
export async function waitForReadyPrompt(page: Page, previousShownAtMs: number | null): Promise<ReadyPrompt | null> {
  const handle = await page.waitForFunction(
    ({ key, previous }) => {
      const battle = (window as HeroxWindow).__HEROX_GAME__?.scene.getScene(key) as BattleSceneHandle | undefined;
      const session = battle?.session;
      if (!session) return false;
      if (session.isOver) return { over: true } as const;
      const prompt = session.current.prompt;
      if (prompt === null || prompt.shownAtMs === previous || session.isInputLocked) return false;
      const word = session.wordById(prompt.wordId)?.word;
      return word === undefined ? false : ({ over: false, wordId: prompt.wordId, word, shownAtMs: prompt.shownAtMs } as const);
    },
    { key: SCENE_KEYS.battle, previous: previousShownAtMs },
  );
  const value = await handle.jsonValue();
  if (value === false || value.over) return null;
  return { wordId: value.wordId, word: value.word, shownAtMs: value.shownAtMs };
}

export interface BattleSnapshot {
  readonly comboCount: number;
  readonly outcome: string;
}

export async function readBattle(page: Page): Promise<BattleSnapshot> {
  return page.evaluate((key) => {
    const session = ((window as HeroxWindow).__HEROX_GAME__?.scene.getScene(key) as BattleSceneHandle | undefined)?.session;
    if (!session) throw new Error('Trận chưa bắt đầu');
    return { comboCount: session.current.combo.count, outcome: session.current.outcome };
  }, SCENE_KEYS.battle);
}

/** Chờ combo đạt ít nhất `count` (combo cập nhật ở khung kế tiếp sau khi trả lời). */
export async function waitForCombo(page: Page, count: number): Promise<void> {
  await page.waitForFunction(
    ({ key, expected }) => {
      const session = ((window as HeroxWindow).__HEROX_GAME__?.scene.getScene(key) as BattleSceneHandle | undefined)?.session;
      return (session?.current.combo.count ?? 0) >= expected;
    },
    { key: SCENE_KEYS.battle, expected: count },
  );
}

/** Toạ độ trên trang của nút `Về bản đồ` ở màn kết thúc trận; chờ tới khi nút hiện. */
export async function battleExitPosition(page: Page): Promise<{ x: number; y: number }> {
  const handle = await page.waitForFunction((key) => {
    const game = (window as HeroxWindow).__HEROX_GAME__;
    const battle = game?.scene.getScene(key) as BattleSceneHandle | undefined;
    const button = battle?.endButtons[0];
    if (!game || button === undefined) return false;
    const bounds = game.canvas.getBoundingClientRect();
    const ratio = bounds.width / game.scale.width;
    return { x: bounds.left + button.x * ratio, y: bounds.top + button.y * ratio };
  }, SCENE_KEYS.battle);
  const position = await handle.jsonValue();
  if (position === false) throw new Error('Không thấy nút về bản đồ');
  return position;
}

/** Toạ độ trên trang của ô vòng từ đang chứa `wordId` (đổi từ toạ độ logic của game qua kích thước canvas). */
export async function ringOptionPosition(page: Page, wordId: string): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ key, target }) => {
      const game = (window as HeroxWindow).__HEROX_GAME__;
      const battle = game?.scene.getScene(key) as BattleSceneHandle | undefined;
      const slot = battle?.ring.slots.find((candidate) => candidate.wordId === target);
      if (!game || !slot) throw new Error(`Vòng từ không có ô ${target}`);
      const bounds = game.canvas.getBoundingClientRect();
      const ratio = bounds.width / game.scale.width;
      return { x: bounds.left + slot.container.x * ratio, y: bounds.top + slot.container.y * ratio };
    },
    { key: SCENE_KEYS.battle, target: wordId },
  );
}
