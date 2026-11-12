import Fastify, { type FastifyInstance } from 'fastify';
import { apiPath, type ApiErrorBody } from '@herox/shared';
import type { ServerConfig } from './config.js';
import { isDatabaseUnavailable } from './db/pool.js';
import { registerGuardedApi, type ApiGuardServices } from './http/api-guard.js';
import { API_ERROR_CODES, HttpError, type ApiErrorCode } from './http/http-error.js';
import { UnsupportedProgressVersionError } from './learning/learning-stats.js';
import { registerBattleRoutes, type BattleRouteServices } from './routes/battle-routes.js';
import { registerCitadelRoutes, type CitadelRouteServices } from './routes/citadel-routes.js';
import { registerMeRoutes, type MeRouteServices } from './routes/me-routes.js';
import { registerStoryRoutes, type StoryRouteServices } from './routes/story-routes.js';

export type AppServices = ApiGuardServices & MeRouteServices & BattleRouteServices & CitadelRouteServices & StoryRouteServices;

export interface BuildAppOptions {
  readonly logger?: boolean;
  /** Thiếu thì chỉ có health check (dùng cho test khung, không cần DB). */
  readonly services?: AppServices;
}

// API chỉ nhận body JSON nhỏ (tên nhân vật, lựa chọn trong game); route kết quả trận nới riêng.
const BODY_LIMIT_BYTES = 16 * 1024;
const HTTP_BAD_REQUEST = 400;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_INTERNAL_ERROR = 500;

interface ErrorResponse {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly body: ApiErrorBody;
}

function respond(statusCode: number, code: ApiErrorCode, message: string): ErrorResponse {
  return { statusCode, code, body: { error: message } };
}

// Lỗi Fastify tự sinh khi đọc body (JSON hỏng, quá cỡ, sai Content-Type) → câu thân thiện, không lộ chi tiết nội bộ.
function mapFrameworkError(statusCode: number | undefined): ErrorResponse | null {
  if (statusCode === HTTP_PAYLOAD_TOO_LARGE) {
    return respond(statusCode, API_ERROR_CODES.payloadTooLarge, 'Dữ liệu quá lớn');
  }
  if (statusCode === HTTP_UNSUPPORTED_MEDIA_TYPE) {
    return respond(statusCode, API_ERROR_CODES.unsupportedMediaType, 'Cần Content-Type: application/json');
  }
  if (statusCode !== undefined && statusCode >= HTTP_BAD_REQUEST && statusCode < HTTP_INTERNAL_ERROR) {
    return respond(statusCode, API_ERROR_CODES.invalidRequest, 'Yêu cầu không hợp lệ');
  }
  return null;
}

function readStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;
  return typeof error.statusCode === 'number' ? error.statusCode : undefined;
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return String(error.code);
}

function toErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof HttpError) return respond(error.statusCode, error.code, error.message);
  if (error instanceof UnsupportedProgressVersionError) {
    return respond(
      HTTP_SERVICE_UNAVAILABLE,
      API_ERROR_CODES.progressVersion,
      'HeroX đang cập nhật để đọc tiến độ LingoBrain mới, thử lại sau',
    );
  }
  if (isDatabaseUnavailable(error)) {
    return respond(
      HTTP_SERVICE_UNAVAILABLE,
      API_ERROR_CODES.databaseUnavailable,
      'Máy chủ tạm thời không kết nối được dữ liệu, thử lại sau',
    );
  }
  return (
    mapFrameworkError(readStatusCode(error)) ?? respond(HTTP_INTERNAL_ERROR, API_ERROR_CODES.internal, 'Lỗi máy chủ')
  );
}

/** Tạo instance Fastify đã đăng ký route; tách khỏi `listen` để test bằng `inject`. */
export function buildApp(config: ServerConfig, options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: BODY_LIMIT_BYTES,
    // Chỉ tin X-Forwarded-* từ đúng số proxy phía trước; 0 nghĩa là không tin.
    // Type của Fastify 5 bỏ dạng số nên dùng hàm tương đương với proxy-addr.
    trustProxy: (_address: string, hop: number) => hop < config.trustProxyHops,
  });

  // Chỉ nhận application/json: form HTML chéo site (text/plain) không gửi được JSON nếu không qua preflight CORS.
  app.removeContentTypeParser('text/plain');

  app.setErrorHandler((error, request, reply) => {
    const response = toErrorResponse(error);
    // Log chỉ mã lỗi (userId đã gắn vào logger của request sau khi xác thực); stack chỉ khi lỗi không lường trước.
    if (response.code === API_ERROR_CODES.internal) {
      request.log.error({ code: response.code, err: error }, 'Lỗi API');
    } else if (response.code === API_ERROR_CODES.databaseUnavailable) {
      // Giữ mã lỗi gốc của pg/socket để truy nguyên sự cố DB.
      request.log.warn({ code: response.code, cause: readErrorCode(error) }, 'Postgres không dùng được');
    } else {
      request.log.info({ code: response.code, statusCode: response.statusCode }, 'Từ chối yêu cầu API');
    }
    return reply.code(response.statusCode).header('Cache-Control', 'no-store').send(response.body);
  });

  app.get(apiPath('health'), () => ({ status: 'ok' }));

  const services = options.services;
  if (services) {
    // Readiness: 503 tới khi migration xong; health ở trên chỉ báo process còn sống.
    app.get(apiPath('ready'), (_request, reply) =>
      services.isReady()
        ? { status: 'ready' }
        : reply.code(HTTP_SERVICE_UNAVAILABLE).header('Cache-Control', 'no-store').send({ status: 'starting' }),
    );
    registerGuardedApi(app, services, (scope, authorize) => {
      registerMeRoutes(scope, services, authorize);
      registerBattleRoutes(scope, services, authorize);
      registerCitadelRoutes(scope, services, authorize);
      registerStoryRoutes(scope, services, authorize);
    });
  }

  return app;
}
