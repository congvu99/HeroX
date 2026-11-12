import { enterBattle, playUntilBattleEnds, waitForBattleResult } from '../support/battle-flow.js';
import { openBuilding } from '../support/citadel-flow.js';
import { expect, signInAs, test, useBattleInputMode } from '../support/herox-test.js';

/**
 * HeroX chỉ được đọc dữ liệu LingoBrain (qua DB với quyền SELECT, và GET phát âm); mọi request ghi phải vào `/herox/api/`.
 * Fixture `requestLog` kiểm điều này ở cuối mọi test; spec này đi hết các luồng có ghi để chứng minh bộ lọc thấy request ghi.
 */
test.describe('Không ghi vào API LingoBrain', () => {
  test.use({ purpose: 'isolation' });

  test('vào game, đánh một trận, mở thành trì: chỉ ghi vào API HeroX', async ({ page, persona, requestLog }) => {
    await signInAs(page, persona);
    await useBattleInputMode(page, 'typing');
    await page.goto('./');

    const resultResponse = waitForBattleResult(page);
    await enterBattle(page);
    await playUntilBattleEnds({ page, mode: 'typing', useTouch: false }, null);
    expect((await resultResponse).status()).toBe(200);

    await page.reload();
    const forge = await openBuilding(page, 'forge');
    await expect(forge).toBeVisible();

    expect(requestLog.heroxWrites).toEqual(expect.arrayContaining([expect.stringMatching(/^POST \/herox\/api\/battles$/)]));
    expect(requestLog.foreignWrites).toEqual([]);
  });
});
