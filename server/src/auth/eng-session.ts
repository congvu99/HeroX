import { createHash } from 'node:crypto';
import { API_ERROR_CODES, HttpError } from '../http/http-error.js';

// Cùng quy tắc với LingoBrain (eng/server/auth-and-sync-routes.js authUser): token base64url 20–200 ký tự.
// Sao chép thuật toán, không import từ repo eng; test hợp đồng so khớp khi có repo eng bên cạnh.
const BEARER_TOKEN_PATTERN = /^Bearer ([A-Za-z0-9_-]{20,200})$/;

/** Phiên LingoBrain hết hạn trượt sau số ngày không dùng này (eng/server/auth-and-sync-routes.js SESSION_DAYS). */
export const ENG_SESSION_IDLE_DAYS = 180;

export interface SessionUser {
  readonly userId: number;
  readonly username: string;
}

export interface SessionLookup {
  /** Tìm người dùng của phiên còn hạn theo hash token; `null` khi không có hoặc hết hạn. */
  findActiveSessionUser(tokenHash: string): Promise<SessionUser | null>;
}

/** Lấy token từ header `Authorization: Bearer <token>`; sai định dạng trả `null`. */
export function parseBearerToken(authorizationHeader: string | undefined): string | null {
  return BEARER_TOKEN_PATTERN.exec(authorizationHeader ?? '')?.[1] ?? null;
}

/** Băm token như LingoBrain lưu ở `sessions.token_hash`: SHA-256, hex (eng/server/password-hashing-and-session-tokens.js hashToken). */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Xác thực request bằng phiên đăng nhập LingoBrain.
 * Không gia hạn `last_used_at`: HeroX chỉ có quyền SELECT trên bảng của LingoBrain.
 * @throws HttpError 401 khi thiếu token hoặc phiên hết hạn.
 */
export async function authenticate(
  request: { readonly headers: { readonly authorization?: string | undefined } },
  sessions: SessionLookup,
): Promise<SessionUser> {
  const token = parseBearerToken(request.headers.authorization);
  if (token === null) throw new HttpError(401, 'Chưa đăng nhập', API_ERROR_CODES.authMissing);
  const user = await sessions.findActiveSessionUser(hashSessionToken(token));
  if (user === null) throw new HttpError(401, 'Phiên đăng nhập hết hạn', API_ERROR_CODES.authExpired);
  return user;
}
