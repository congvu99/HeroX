/** Đường dẫn gốc HeroX được phục vụ, cùng origin với LingoBrain. */
export const APP_BASE_PATH = '/herox/';

/** Tiền tố mọi route API của HeroX; client gọi, server đăng ký, Vite proxy dùng chung. */
export const API_PREFIX = `${APP_BASE_PATH}api`;

/** Ghép route con vào tiền tố API, ví dụ `apiPath('health')` → `/herox/api/health`. */
export function apiPath(route: string): string {
  const trimmedRoute = route.replace(/^\/+/, '');
  return trimmedRoute === '' ? API_PREFIX : `${API_PREFIX}/${trimmedRoute}`;
}
