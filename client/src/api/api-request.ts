import type { ApiErrorBody } from '@herox/shared';

export const UNAVAILABLE_MESSAGE = 'Máy chủ HeroX chưa sẵn sàng, thử lại sau ít phút';
export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ HeroX';
/** Mạng di động treo thì báo lỗi để người chơi thử lại, không để màn hình chờ mãi. */
export const API_REQUEST_TIMEOUT_MS = 15_000;

const HTTP_UNAUTHORIZED = 401;

/** Kết quả gọi API: không ném lỗi để scene tự chọn màn hình. `status` có khi server trả lỗi HTTP. */
export type ApiResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'unauthenticated' }
  | { readonly kind: 'failed'; readonly message: string; readonly status?: number };

/** Lấy thông báo lỗi tiếng Việt server trả trong body `{ error }`; body lạ thì dùng thông báo chung. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    return typeof body.error === 'string' ? body.error : UNAVAILABLE_MESSAGE;
  } catch {
    return UNAVAILABLE_MESSAGE;
  }
}

export interface JsonRequest<T> {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly token: string;
  /** Chỉ dùng với POST. */
  readonly body?: unknown;
  readonly isExpected: (value: unknown) => value is T;
}

/** Gọi API HeroX kèm Bearer token LingoBrain, không cache, có hạn chờ; kiểm hình dạng body trả về. */
export async function requestJson<T>(request: JsonRequest<T>, fetchImpl: typeof fetch): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${request.token}`, Accept: 'application/json' };
  const init: RequestInit = { method: request.method, headers, cache: 'no-store', signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS) };
  if (request.method === 'POST') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(request.body);
  }
  let response: Response;
  try {
    response = await fetchImpl(request.url, init);
  } catch {
    return { kind: 'failed', message: NETWORK_ERROR_MESSAGE };
  }
  if (response.status === HTTP_UNAUTHORIZED) return { kind: 'unauthenticated' };
  if (!response.ok) return { kind: 'failed', message: await readErrorMessage(response), status: response.status };
  try {
    // Proxy lỗi có thể trả trang HTML với mã 200, hoặc kết nối đứt giữa chừng khi đọc body.
    const parsed: unknown = await response.json();
    return request.isExpected(parsed) ? { kind: 'ok', value: parsed } : { kind: 'failed', message: UNAVAILABLE_MESSAGE };
  } catch {
    return { kind: 'failed', message: NETWORK_ERROR_MESSAGE };
  }
}
