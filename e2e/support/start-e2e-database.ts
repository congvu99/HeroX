/**
 * Postgres nhúng (PGlite) cho E2E chạy trên máy dev, không cần Docker: seed dữ liệu E2E rồi mở cổng TCP
 * cho server HeroX kết nối như Postgres thật. Dữ liệu chỉ nằm trong RAM, mất khi process dừng.
 * Chạy: npx tsx --conditions=source e2e/support/start-e2e-database.ts (Playwright tự gọi qua webServer).
 */
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { EmbeddedPostgres } from '../../server/test/embedded-postgres.js';
import { E2E_DATABASE_HOST, E2E_DATABASE_PORT } from './e2e-environment.js';
import { seedE2eDatabase } from './seed-e2e-database.js';

// Server HeroX mở tối đa 5 kết nối; chừa thêm cho lần khởi động lại khi Playwright chạy lại.
const MAX_SOCKET_CONNECTIONS = 10;

const database = await EmbeddedPostgres.create();
await seedE2eDatabase(database);
const socketServer = new PGLiteSocketServer({
  db: database.pglite,
  host: E2E_DATABASE_HOST,
  port: E2E_DATABASE_PORT,
  maxConnections: MAX_SOCKET_CONNECTIONS,
});
await socketServer.start();
process.stdout.write(`Postgres E2E (PGlite) đã seed, lắng nghe ${E2E_DATABASE_HOST}:${E2E_DATABASE_PORT}\n`);

async function shutdown(): Promise<void> {
  await socketServer.stop();
  await database.close();
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => void shutdown());
