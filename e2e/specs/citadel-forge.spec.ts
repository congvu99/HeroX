import { forgeLevelInfo, BASE_FORGE_LEVEL } from '../../shared/src/data/citadel-catalog.js';
import { openBuilding } from '../support/citadel-flow.js';
import { attachScreenshot, expect, HEROX_API_PREFIX, signInAs, test } from '../support/herox-test.js';

const UPGRADE_PATH = `${HEROX_API_PREFIX}citadel/upgrade`;
const NEXT_FORGE_LEVEL = BASE_FORGE_LEVEL + 1;

test.describe('Lò rèn ở Lexhold', () => {
  test.use({ purpose: 'forge' });

  test('nâng lò rèn, tải lại trang vẫn giữ cấp mới và số vàng đã trừ', async ({ page, persona }) => {
    const upgradeCost = forgeLevelInfo(NEXT_FORGE_LEVEL)?.goldCost;
    if (upgradeCost === undefined) throw new Error('Thiếu cấu hình giá nâng lò rèn');
    const goldAfterUpgrade = persona.startGold - upgradeCost;

    await signInAs(page, persona);
    await page.goto('./');
    const forge = await openBuilding(page, 'forge');
    await expect(forge.getByText(`Lò rèn cấp ${BASE_FORGE_LEVEL}`, { exact: true })).toBeVisible();
    await expect(forge.getByText(`Vàng ${persona.startGold}`, { exact: true })).toBeVisible();
    await attachScreenshot(page, 'lo-ren-truoc-nang-cap');

    const upgradeResponse = page.waitForResponse((response) => new URL(response.url()).pathname === UPGRADE_PATH);
    await forge.getByRole('button', { name: new RegExp(`^Nâng lò rèn lên cấp ${NEXT_FORGE_LEVEL}`) }).click();
    expect((await upgradeResponse).status()).toBe(200);
    await expect(forge.getByText(`Lò rèn cấp ${NEXT_FORGE_LEVEL}`, { exact: true })).toBeVisible();
    await attachScreenshot(page, 'lo-ren-sau-nang-cap');

    await page.reload();
    const forgeAfterReload = await openBuilding(page, 'forge');
    await expect(forgeAfterReload.getByText(`Lò rèn cấp ${NEXT_FORGE_LEVEL}`, { exact: true })).toBeVisible();
    await expect(forgeAfterReload.getByText(`Vàng ${goldAfterUpgrade}`, { exact: true })).toBeVisible();
    await attachScreenshot(page, 'lo-ren-sau-tai-lai');
  });
});
