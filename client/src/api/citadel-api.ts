import { apiPath, type CitadelAction, type CitadelResponse } from '@herox/shared';
import { requestJson, type ApiResult } from './api-request';

/** Route ghi theo loại thao tác; trùng `MUTATION_PARSERS` ở `server/src/routes/citadel-routes.ts`. */
const ACTION_ROUTES: Readonly<Record<CitadelAction['type'], string>> = {
  upgrade: 'citadel/upgrade',
  equip: 'citadel/equip',
  outfit: 'citadel/outfit',
  loadout: 'citadel/loadout',
  'daily-crystals': 'citadel/daily-crystals',
};

export const HTTP_CONFLICT = 409;

function withUtcOffset(route: string, utcOffsetMinutes: number): string {
  return `${apiPath(route)}?utcOffset=${encodeURIComponent(String(utcOffsetMinutes))}`;
}

function isCitadelResponse(value: unknown): value is CitadelResponse {
  if (typeof value !== 'object' || value === null) return false;
  const { state, learning, words } = value as Partial<Record<keyof CitadelResponse, unknown>>;
  return (
    typeof state === 'object' && state !== null &&
    typeof (state as { rowVersion?: unknown }).rowVersion === 'number' &&
    typeof learning === 'object' && learning !== null &&
    Array.isArray(words)
  );
}

/** Body gửi kèm thao tác: bỏ trường `type` (route đã nói loại thao tác), thêm `rowVersion` client đang thấy. */
function actionBody(action: CitadelAction, rowVersion: number): Record<string, unknown> {
  const fields: Record<string, unknown> = { rowVersion, ...action };
  delete fields['type'];
  return fields;
}

/** `GET /herox/api/citadel`: trạng thái thành trì kèm số liệu học từ. */
export function fetchCitadel(token: string, utcOffsetMinutes: number, fetchImpl: typeof fetch): Promise<ApiResult<CitadelResponse>> {
  return requestJson({ method: 'GET', url: withUtcOffset('citadel', utcOffsetMinutes), token, isExpected: isCitadelResponse }, fetchImpl);
}

/** Gửi một thao tác; 409 (`status`) nghĩa là trạng thái đã đổi ở máy khác, cần tải lại. */
export function sendCitadelAction(
  token: string,
  action: CitadelAction,
  rowVersion: number,
  utcOffsetMinutes: number,
  fetchImpl: typeof fetch,
): Promise<ApiResult<CitadelResponse>> {
  return requestJson(
    {
      method: 'POST',
      url: withUtcOffset(ACTION_ROUTES[action.type], utcOffsetMinutes),
      token,
      body: actionBody(action, rowVersion),
      isExpected: isCitadelResponse,
    },
    fetchImpl,
  );
}
