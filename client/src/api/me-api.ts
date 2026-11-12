import { apiPath, type MeResponse } from '@herox/shared';
import { readErrorMessage, UNAVAILABLE_MESSAGE, NETWORK_ERROR_MESSAGE } from './api-request';

/** Khoá localStorage LingoBrain lưu phiên đăng nhập `{ token, username }` (cùng origin nên HeroX đọc được). */
export const ENG_AUTH_STORAGE_KEY = 'eng.auth.v1';

const HTTP_UNAUTHORIZED = 401;
/** Mạng di động treo thì báo lỗi để người chơi bấm Thử lại, không chờ mãi. */
export const ME_REQUEST_TIMEOUT_MS = 15_000;

export type MeResult =
  | { readonly kind: 'ok'; readonly me: MeResponse }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'unavailable'; readonly message: string };

interface StorageReader {
  getItem(key: string): string | null;
}

/**
 * Đọc token phiên LingoBrain; JSON hỏng, thiếu token hoặc trình duyệt chặn storage (Safari chặn cookie
 * ném `SecurityError` ngay khi truy cập `localStorage`) đều coi như chưa đăng nhập.
 */
export function readEngSessionToken(getStorage: () => StorageReader): string | null {
  try {
    const raw = getStorage().getItem(ENG_AUTH_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== 'object' || parsed === null || !('token' in parsed)) return null;
    return typeof parsed.token === 'string' && parsed.token !== '' ? parsed.token : null;
  } catch {
    return null;
  }
}

/** Phút về phía đông UTC, đúng tham số `utcOffset` server cần để tính "hôm nay". */
export function currentUtcOffsetMinutes(date: Date = new Date()): number {
  return -date.getTimezoneOffset();
}

function isMeResponse(value: unknown): value is MeResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { user, learning } = value as Partial<Record<keyof MeResponse, unknown>>;
  return (
    typeof user === 'object' && user !== null && typeof (user as { id?: unknown }).id === 'number' &&
    typeof learning === 'object' && learning !== null && 'hero' in value
  );
}

/** Gọi `GET /herox/api/me`; không ném lỗi, trả kết quả để scene quyết định màn hình. */
export async function fetchMe(
  token: string | null,
  fetchImpl: typeof fetch,
  utcOffsetMinutes: number,
): Promise<MeResult> {
  if (token === null) return { kind: 'unauthenticated' };
  const url = `${apiPath('me')}?utcOffset=${encodeURIComponent(String(utcOffsetMinutes))}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(ME_REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { kind: 'unavailable', message: NETWORK_ERROR_MESSAGE };
  }
  if (response.status === HTTP_UNAUTHORIZED) return { kind: 'unauthenticated' };
  if (!response.ok) return { kind: 'unavailable', message: await readErrorMessage(response) };
  try {
    // Proxy lỗi có thể trả trang HTML với mã 200, hoặc kết nối đứt giữa chừng khi đọc body.
    const body: unknown = await response.json();
    return isMeResponse(body) ? { kind: 'ok', me: body } : { kind: 'unavailable', message: UNAVAILABLE_MESSAGE };
  } catch {
    return { kind: 'unavailable', message: NETWORK_ERROR_MESSAGE };
  }
}
