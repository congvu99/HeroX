import type { BattleInputMode } from '../../client/src/config/game-settings.js';
import type { PersonaPurpose } from '../fixtures/e2e-fixture.js';
import { answerNextPrompt, enterBattle, playUntilBattleEnds, waitForBattleResult, type BattleResultBody } from '../support/battle-flow.js';
import { waitForCombo } from '../support/game-driver.js';
import { attachScreenshot, expect, signInAs, test, useBattleInputMode } from '../support/herox-test.js';

/** Tiêu chí nghiệm thu: ba đòn đúng liên tiếp tạo combo 3. */
const COMBO_TARGET = 3;

const BATTLE_CASES: readonly { title: string; purpose: PersonaPurpose; mode: BattleInputMode }[] = [
  { title: 'Trận gõ từ', purpose: 'typing', mode: 'typing' },
  { title: 'Trận vòng từ', purpose: 'ring', mode: 'ring' },
];

for (const battleCase of BATTLE_CASES) {
  test.describe(battleCase.title, () => {
    test.use({ purpose: battleCase.purpose });

    test('trả lời đúng lên combo 3, thắng trận, server chạy lại log và ghi thưởng', async ({ page, persona }, testInfo) => {
      await signInAs(page, persona);
      await useBattleInputMode(page, battleCase.mode);
      await page.goto('./');
      const resultResponse = waitForBattleResult(page);
      await enterBattle(page);

      const player = { page, mode: battleCase.mode, useTouch: testInfo.project.use.hasTouch === true };
      let previous: number | null = null;
      for (let answer = 0; answer < COMBO_TARGET; answer += 1) {
        previous = await answerNextPrompt(player, previous);
        expect(previous, 'Trận kết thúc trước khi đủ combo').not.toBeNull();
      }
      await waitForCombo(page, COMBO_TARGET);
      // Thẻ đề: kiểu gõ ở dải đáy, vòng từ ở đỉnh khung (cung bao quanh hiệp sĩ không che đề).
      const prompt = page.locator('.battle-prompt');
      await expect(prompt).toBeVisible();
      await prompt.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      await attachScreenshot(page, `${battleCase.mode}-de-bai`);
      await attachScreenshot(page, `${battleCase.mode}-combo-3`);

      const ending = await playUntilBattleEnds(player, previous);
      expect(ending.outcome).toBe('victory');
      const response = await resultResponse;
      expect(response.status()).toBe(200);
      const result = (await response.json()) as BattleResultBody;
      expect(result.outcome).toBe('victory');
      expect(result.goldEarned).toBeGreaterThan(0);
      expect(result.missedWordIds).toEqual([]);
      await attachScreenshot(page, `${battleCase.mode}-ket-thuc-tran`);
    });
  });
}
