import { buildApp } from './app.js';
import { PgSessionRepository } from './auth/session-repository.js';
import { PgBattleRepository } from './battle/battle-repository.js';
import { PgCitadelRepository } from './citadel/citadel-repository.js';
import { ConfigError, loadConfig } from './config.js';
import { purgeHeroesOfDeletedUsers } from './db/deleted-user-cleanup.js';
import { startDatabase } from './db/migrate.js';
import { createPgDatabase, type DatabaseLogger } from './db/pool.js';
import { PgHeroRepository } from './hero/hero-repository.js';
import { PgLearningRepository } from './learning/learning-repository.js';

const DELETED_USER_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const config = loadConfig();
if (config.databaseUrl === undefined) throw new ConfigError('DATABASE_URL', 'bắt buộc để kết nối Postgres');

let databaseReady = false;
const startupAbort = new AbortController();
// Logger được gán sau khi tạo app; trước đó (rất ngắn) không có gì để log.
const appLogger: { current?: DatabaseLogger } = {};
const databaseLogger: DatabaseLogger = {
  info: (message) => appLogger.current?.info(message),
  warn: (message) => appLogger.current?.warn(message),
};

const database = createPgDatabase(
  {
    connectionString: config.databaseUrl,
    ssl: config.pgSsl,
    sslRootCertFile: config.pgSslRootCert,
  },
  databaseLogger,
);

const app = buildApp(config, {
  services: {
    sessions: new PgSessionRepository(database),
    learning: new PgLearningRepository(database),
    heroes: new PgHeroRepository(database),
    battles: new PgBattleRepository(database),
    citadel: new PgCitadelRepository(database),
    isReady: () => databaseReady,
  },
});
appLogger.current = { info: (message) => app.log.info(message), warn: (message) => app.log.warn(message) };

async function cleanUpDeletedUsers(): Promise<void> {
  try {
    const removed = await purgeHeroesOfDeletedUsers(database);
    if (removed > 0) app.log.info({ removed }, 'Đã xoá nhân vật của tài khoản LingoBrain đã xoá');
  } catch (error) {
    app.log.warn({ err: error }, 'Dọn nhân vật của tài khoản đã xoá thất bại, thử lại ở lượt sau');
  }
}

const cleanupTimer = setInterval(() => {
  if (databaseReady) void cleanUpDeletedUsers();
}, DELETED_USER_CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

app.addHook('onClose', async () => {
  startupAbort.abort();
  clearInterval(cleanupTimer);
  await database.close();
});

const shutdownSignals = ['SIGINT', 'SIGTERM'] as const;
for (const signal of shutdownSignals) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error, 'Đóng server thất bại');
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error, 'Không khởi động được server');
  process.exit(1);
}

// Migration chạy nền: server đã lắng nghe nên health check sống, API trả 503 tới khi DB sẵn sàng.
databaseReady = await startDatabase({ database, log: databaseLogger, signal: startupAbort.signal });
// Dọn ngay một lượt: container thường khởi động lại sớm hơn chu kỳ 24 giờ.
if (databaseReady) await cleanUpDeletedUsers();
