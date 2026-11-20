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

/** Nhịp dò token dự phòng khi tab không nhận `storage` event (ví dụ đăng nhập trong cùng tab bằng back/forward). */
export const ENG_SESSION_POLL_MS = 1_000;

/** Phần phụ thuộc trình duyệt tiêm vào để `waitForEngSession` test được mà không cần DOM thật. */
export interface EngSessionWatchEnv {
  readonly getStorage: () => StorageReader;
  readonly addStorageListener: (handler: () => void) => void;
  readonly removeStorageListener: (handler: () => void) => void;
  readonly setPoll: (handler: () => void, ms: number) => number;
  readonly clearPoll: (id: number) => void;
}

/**
 * Chờ phiên LingoBrain xuất hiện ở localStorage rồi gọi `onToken` một lần với token.
 * Đăng nhập mở ở tab khác (cùng origin) nên tab game nhận `storage` event; kèm nhịp dò dự phòng
 * cho trình duyệt không bắn event. Trả về hàm hủy để dọn listener và nhịp dò khi rời màn hình.
 */
export function waitForEngSession(env: EngSessionWatchEnv, onToken: (token: string) => void): () => void {
  let done = false;
  const stop = (): void => {
    if (done) return;
    done = true;
    env.removeStorageListener(check);
    env.clearPoll(pollId);
  };
  function check(): void {
    if (done) return;
    const token = readEngSessionToken(env.getStorage);
    if (token === null) return;
    stop();
    onToken(token);
  }
  env.addStorageListener(check);
  const pollId = env.setPoll(check, ENG_SESSION_POLL_MS);
  return stop;
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
