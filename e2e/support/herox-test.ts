import { test as base, expect, type Page, type Request } from '@playwright/test';
import { SETTINGS_STORAGE_KEY, type BattleInputMode } from '../../client/src/config/game-settings.js';
import { personaFor, type E2ePersona, type PersonaPurpose } from '../fixtures/e2e-fixture.js';

/** Khoá localStorage LingoBrain lưu phiên `{ token, username }`; hợp đồng của LingoBrain, client đọc ở `client/src/api/me-api.ts`. */
export const ENG_AUTH_STORAGE_KEY = 'eng.auth.v1';

export const HEROX_API_PREFIX = '/herox/api/';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Request ghi (không phải GET/HEAD/OPTIONS) ra ngoài API HeroX: LingoBrain chỉ được đọc, không được ghi. */
export function describeForeignWrite(request: Request): string | null {
  const method = request.method();
  if (READ_METHODS.has(method)) return null;
  const { pathname } = new URL(request.url());
  return pathname.startsWith(HEROX_API_PREFIX) ? null : `${method} ${pathname}`;
}

export interface RequestLog {
  /** Request ghi ra ngoài `/herox/api/` (ví dụ API `/api/*` của LingoBrain); phải luôn rỗng. */
  readonly foreignWrites: string[];
  /** Request ghi vào API HeroX, để spec chứng minh bộ lọc thực sự thấy request ghi. */
  readonly heroxWrites: string[];
}

interface HeroxFixtures {
  /** Nhóm người dùng fixture của spec; đặt bằng `test.use({ purpose })`. */
  purpose: PersonaPurpose;
  persona: E2ePersona;
  requestLog: RequestLog;
}

/**
 * `test` của E2E HeroX: mỗi test có người dùng fixture riêng theo project và nhóm spec,
 * và luôn kiểm cuối test rằng không có request ghi nào tới API của LingoBrain.
 */
export const test = base.extend<HeroxFixtures>({
  purpose: ['auth', { option: true }],
  persona: async ({ purpose }, use, testInfo) => {
    await use(personaFor(testInfo.project.name, purpose));
  },
  requestLog: [
    async ({ page }, use) => {
      const log: RequestLog = { foreignWrites: [], heroxWrites: [] };
      page.on('request', (request) => {
        const foreign = describeForeignWrite(request);
        if (foreign !== null) log.foreignWrites.push(foreign);
        else if (!READ_METHODS.has(request.method())) log.heroxWrites.push(`${request.method()} ${new URL(request.url()).pathname}`);
      });
      await use(log);
      expect(log.foreignWrites, 'Không được có request ghi tới API LingoBrain').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Giả lập người dùng đã đăng nhập LingoBrain cùng origin: ghi phiên vào localStorage trước khi trang chạy. */
export async function signInAs(page: Page, persona: E2ePersona): Promise<void> {
  const session = JSON.stringify({ token: persona.token, username: persona.username });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [ENG_AUTH_STORAGE_KEY, session] as const);
}

/** Chọn kiểu nhập trong trận (gõ / vòng từ) và tắt âm thanh qua cài đặt đã lưu, như người chơi đã chọn trước đó. */
export async function useBattleInputMode(page: Page, inputMode: BattleInputMode): Promise<void> {
  const settings = JSON.stringify({ inputMode, soundEnabled: false });
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [SETTINGS_STORAGE_KEY, settings] as const);
}

/** Đính ảnh chụp vào kết quả test (lưu trong thư mục báo cáo E2E). */
export async function attachScreenshot(page: Page, name: string): Promise<void> {
  await test.info().attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}
