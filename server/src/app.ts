import Fastify, { type FastifyInstance } from 'fastify';
import { apiPath } from '@herox/shared';
import type { ServerConfig } from './config.js';

export interface BuildAppOptions {
  readonly logger?: boolean;
}

/** Tạo instance Fastify đã đăng ký route; tách khỏi `listen` để test bằng `inject`. */
export function buildApp(config: ServerConfig, options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
    // Chỉ tin X-Forwarded-* từ đúng số proxy phía trước; 0 nghĩa là không tin.
    // Type của Fastify 5 bỏ dạng số nên dùng hàm tương đương với proxy-addr.
    trustProxy: (_address: string, hop: number) => hop < config.trustProxyHops,
  });

  app.get(apiPath('health'), () => ({ status: 'ok' }));

  return app;
}
