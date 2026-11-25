/** Mã lỗi nội bộ để log và theo dõi; không chứa dữ liệu người dùng. */
export const API_ERROR_CODES = {
  authMissing: 'HEROX_AUTH_MISSING',
  authExpired: 'HEROX_AUTH_EXPIRED',
  rateLimited: 'HEROX_RATE_LIMITED',
  notReady: 'HEROX_NOT_READY',
  databaseUnavailable: 'HEROX_DB_UNAVAILABLE',
  deckNotReady: 'HEROX_DECK_NOT_READY',
  progressVersion: 'HEROX_PROGRESS_VERSION',
  invalidRequest: 'HEROX_INVALID_REQUEST',
  payloadTooLarge: 'HEROX_PAYLOAD_TOO_LARGE',
  unsupportedMediaType: 'HEROX_UNSUPPORTED_MEDIA_TYPE',
  heroExists: 'HEROX_HERO_EXISTS',
  heroMissing: 'HEROX_HERO_MISSING',
  battleNotFound: 'HEROX_BATTLE_NOT_FOUND',
  battleRejected: 'HEROX_BATTLE_REJECTED',
  battleLocked: 'HEROX_BATTLE_LOCKED',
  battleSettled: 'HEROX_BATTLE_SETTLED',
  citadelConflict: 'HEROX_CITADEL_CONFLICT',
  citadelRejected: 'HEROX_CITADEL_REJECTED',
  storyRejected: 'HEROX_STORY_REJECTED',
  internal: 'HEROX_INTERNAL',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Lỗi có chủ đích: `message` là câu thân thiện gửi về client, `code` dùng cho log. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: ApiErrorCode,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
