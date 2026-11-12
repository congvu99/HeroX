import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate, type SessionLookup, type SessionUser } from '../auth/eng-session.js';
import { rateLimitKeyForIp } from './client-ip-key.js';
import { API_ERROR_CODES, HttpError } from './http-error.js';
import { FixedWindowRateLimiter } from './rate-limiter.js';

export interface ApiGuardServices {
  readonly sessions: SessionLookup;
  /** `false` khi migration chưa chạy xong: API trả 503. */
  readonly isReady: () => boolean;
  readonly now?: () => number;
}

/** Xác thực phiên LingoBrain và tính hạn mức theo user; gắn userId vào logger của request. */
export type AuthorizeRequest = (request: FastifyRequest) => Promise<SessionUser>;

const MINUTE_MS = 60_000;
const RATE_LIMIT_MAX_KEYS = 10_000;
// Hạn mức theo IP chặn token rác (mỗi request vẫn tốn 1 query), theo user chặn client lỗi gọi dồn.
// Mọi route có xác thực dùng chung một hạn mức.
const REQUESTS_PER_IP_PER_MINUTE = 120;
const REQUESTS_PER_USER_PER_MINUTE = 60;

function rateLimitedError(): HttpError {
  return new HttpError(429, 'Quá nhiều yêu cầu, đợi 1 phút', API_ERROR_CODES.rateLimited);
}

/**
 * Đăng ký một scope API có xác thực: `Cache-Control: no-store`, 503 khi DB chưa sẵn sàng, rate limit theo IP và user.
 * `registerRoutes` nhận scope và hàm `authorize` để đăng ký route bên trong.
 */
export function registerGuardedApi(
  app: FastifyInstance,
  services: ApiGuardServices,
  registerRoutes: (scope: FastifyInstance, authorize: AuthorizeRequest) => void,
): void {
  const now = services.now ?? Date.now;
  const ipLimiter = new FixedWindowRateLimiter({
    limit: REQUESTS_PER_IP_PER_MINUTE,
    windowMs: MINUTE_MS,
    maxKeys: RATE_LIMIT_MAX_KEYS,
  });
  const userLimiter = new FixedWindowRateLimiter({
    limit: REQUESTS_PER_USER_PER_MINUTE,
    windowMs: MINUTE_MS,
    maxKeys: RATE_LIMIT_MAX_KEYS,
  });

  const authorize: AuthorizeRequest = async (request) => {
    const user = await authenticate(request, services.sessions);
    // Từ đây mọi log của request kèm userId (không bao giờ kèm token hay username).
    request.log = request.log.child({ userId: user.userId });
    if (!userLimiter.hit(String(user.userId), now())) throw rateLimitedError();
    return user;
  };

  app.register((scope, _options, done) => {
    const sweepTimer = setInterval(() => {
      ipLimiter.sweep(now());
      userLimiter.sweep(now());
    }, MINUTE_MS);
    sweepTimer.unref();
    scope.addHook('onClose', (_instance, closeDone) => {
      clearInterval(sweepTimer);
      closeDone();
    });

    scope.addHook('onRequest', (request, reply, hookDone) => {
      void reply.header('Cache-Control', 'no-store');
      if (!services.isReady()) {
        hookDone(new HttpError(503, 'Máy chủ chưa sẵn sàng, thử lại sau', API_ERROR_CODES.notReady));
        return;
      }
      hookDone(ipLimiter.hit(rateLimitKeyForIp(request.ip), now()) ? undefined : rateLimitedError());
    });

    registerRoutes(scope, authorize);
    done();
  });
}
