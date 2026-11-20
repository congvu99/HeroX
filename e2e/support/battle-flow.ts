import type { Locator, Page, Response } from '@playwright/test';
import type { BattleInputMode } from '../../client/src/config/game-settings.js';
import { SCENE_KEYS } from '../../client/src/scenes/scene-keys.js';
import { E2E_ENCOUNTER_ID } from '../fixtures/e2e-fixture.js';
import { readBattle, waitForReadyPrompt, waitForSceneInactive, waitForWorldLevel, waitForWorldResumed } from './game-driver.js';
import { usePortal, walkIntoBattle } from './story-flow.js';

/** Level hero xuất hiện khi vào game (Lexhold, có các công trình) và level chứa vùng trận E2E. */
export const START_LEVEL_ID = 'Lexhold';
const BATTLE_LEVEL_ID = 'Misty_Fields';
/** Chặn vòng lặp vô hạn nếu trận không kết thúc (setup hỏng); trận thật cần ít đề hơn nhiều. */
const MAX_PROMPTS_PER_BATTLE = 200;
const TYPING_INPUT_LABEL = 'Gõ từ tiếng Anh';
const BATTLE_RESULT_PATH = /\/herox\/api\/battles\/[^/]+\/result$/;

export interface BattlePlayer {
  readonly page: Page;
  readonly mode: BattleInputMode;
  /** Thiết bị cảm ứng (iPhone): chạm vào vòng từ thay vì bấm chuột. */
  readonly useTouch: boolean;
}

export interface BattleResultBody {
  readonly outcome: string;
  readonly goldEarned: number;
  readonly missedWordIds: readonly string[];
}

/**
 * Từ Lexhold đi qua cổng nam xuống cánh đồng, bước vào vùng trận, chờ màn trận mở.
 * Gọi `waitForBattleResult` trước để không lỡ response.
 */
export async function enterBattle(page: Page): Promise<void> {
  await waitForWorldLevel(page, START_LEVEL_ID);
  await usePortal(page, START_LEVEL_ID, BATTLE_LEVEL_ID, 'down');
  await walkIntoBattle(page, BATTLE_LEVEL_ID, E2E_ENCOUNTER_ID, 'right');
}

/** Response server trả khi client gửi log trận cuối trận. */
export function waitForBattleResult(page: Page): Promise<Response> {
  // Chờ suốt trận (dài hơn actionTimeout); giới hạn bởi timeout của test.
  return page.waitForResponse((response) => BATTLE_RESULT_PATH.test(new URL(response.url()).pathname), { timeout: 0 });
}

const EXIT_BUTTON_LABEL = 'Về bản đồ';

/** Bấm (chuột) hoặc chạm (cảm ứng) vào một nút DOM của HUD trận. */
async function pressButton(player: BattlePlayer, button: Locator): Promise<void> {
  if (player.useTouch) await button.tap();
  else await button.click();
}

/**
 * Trả lời đúng đề kế tiếp (khác đề có `previousShownAtMs`) bằng kiểu nhập của người chơi.
 * Trả mốc hiện đề vừa trả lời, hoặc `null` khi trận đã kết thúc.
 */
export async function answerNextPrompt(player: BattlePlayer, previousShownAtMs: number | null): Promise<number | null> {
  const { page } = player;
  const prompt = await waitForReadyPrompt(page, previousShownAtMs);
  if (prompt === null) return null;
  if (player.mode === 'typing') {
    const input = page.getByLabel(TYPING_INPUT_LABEL);
    await input.fill(prompt.word);
    await input.press('Enter');
  } else {
    await pressButton(player, page.locator(`[data-word-id="${prompt.wordId}"]`));
  }
  return prompt.shownAtMs;
}

/** Trả lời đúng tới hết trận; trả kết quả trận phía client và số đề đã trả lời thêm. */
export async function playUntilBattleEnds(player: BattlePlayer, previousShownAtMs: number | null): Promise<{ outcome: string; answered: number }> {
  let previous = previousShownAtMs;
  let answered = 0;
  while (answered < MAX_PROMPTS_PER_BATTLE) {
    const shownAtMs = await answerNextPrompt(player, previous);
    if (shownAtMs === null) break;
    previous = shownAtMs;
    answered += 1;
  }
  return { outcome: (await readBattle(player.page)).outcome, answered };
}

/**
 * Trả lời đúng tới hết trận (phải thắng), bấm `Về bản đồ`, chờ màn trận đóng.
 * Không chờ bản đồ chạy lại: thắng trùm thì thoại kết chương mở ngay và tạm dừng bản đồ.
 */
export async function winBattleAndExit(player: BattlePlayer): Promise<void> {
  const ending = await playUntilBattleEnds(player, null);
  if (ending.outcome !== 'victory') throw new Error(`Trận kết thúc với kết quả ${ending.outcome}`);
  await pressButton(player, player.page.getByRole('button', { name: EXIT_BUTTON_LABEL }));
  await waitForSceneInactive(player.page, SCENE_KEYS.battle);
}

/** Thắng trận, về bản đồ và chờ bản đồ chạy lại. */
export async function winBattleAndReturn(player: BattlePlayer): Promise<void> {
  await winBattleAndExit(player);
  await waitForWorldResumed(player.page);
}
