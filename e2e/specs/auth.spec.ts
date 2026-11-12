import { SCENE_KEYS } from '../../client/src/scenes/scene-keys.js';
import { LEARNED_WORD_COUNT, MASTERED_WORD_COUNT } from '../fixtures/e2e-fixture.js';
import { START_LEVEL_ID } from '../support/battle-flow.js';
import { openBuilding } from '../support/citadel-flow.js';
import { isSceneActive, waitForSceneActive, waitForWorldLevel } from '../support/game-driver.js';
import { attachScreenshot, expect, HEROX_API_PREFIX, signInAs, test } from '../support/herox-test.js';

const ME_PATH = `${HEROX_API_PREFIX}me`;
/** Thời gian chờ để chắc màn mời đăng nhập không tự chuyển sang bản đồ. */
const LOGIN_SCREEN_SETTLE_MS = 1_500;

test.describe('Đăng nhập bằng phiên LingoBrain', () => {
  test.use({ purpose: 'auth' });

  test('token test vào được game, số từ khớp fixture', async ({ page, persona }) => {
    await signInAs(page, persona);
    const meResponse = page.waitForResponse((response) => new URL(response.url()).pathname === ME_PATH);
    await page.goto('./');

    const me = await meResponse;
    expect(me.status()).toBe(200);
    const body = (await me.json()) as { user: { username: string }; learning: { learned: number; mastered: number }; hero: { name: string } | null };
    expect(body.user.username).toBe(persona.username);
    expect(body.learning.learned).toBe(LEARNED_WORD_COUNT);
    expect(body.learning.mastered).toBe(MASTERED_WORD_COUNT);
    expect(body.hero?.name).toBe(persona.heroName);

    await waitForWorldLevel(page, START_LEVEL_ID);
    await attachScreenshot(page, 'ban-do-sau-dang-nhap');

    // Số từ hiển thị cho người chơi: thanh tài nguyên thành trì và danh sách từ ở thư viện.
    const library = await openBuilding(page, 'library');
    await expect(library).toBeVisible();
    await expect(library.getByText(`${LEARNED_WORD_COUNT} từ đã học`)).toBeVisible();
    const wordRows = library.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Nghe' }) });
    await expect(wordRows).toHaveCount(LEARNED_WORD_COUNT);
    await expect(wordRows.filter({ hasText: '★' })).toHaveCount(MASTERED_WORD_COUNT);
    await attachScreenshot(page, 'thu-vien-so-tu');
  });

  test('không có phiên LingoBrain thì dừng ở màn mời đăng nhập, không gọi API', async ({ page }) => {
    const heroxRequests: string[] = [];
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith(HEROX_API_PREFIX)) heroxRequests.push(pathname);
    });
    await page.goto('./');
    await waitForSceneActive(page, SCENE_KEYS.boot);
    await page.waitForTimeout(LOGIN_SCREEN_SETTLE_MS);

    expect(await isSceneActive(page, SCENE_KEYS.world)).toBe(false);
    expect(heroxRequests).toEqual([]);
    await attachScreenshot(page, 'man-moi-dang-nhap');
  });
});
