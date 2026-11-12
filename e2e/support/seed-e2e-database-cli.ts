/**
 * Seed dữ liệu E2E vào Postgres thật của `compose.dev.yml` (service `seed`).
 * Chỉ chạy trên DB có tên chứa "e2e" để không bao giờ ghi nhầm vào DB của LingoBrain.
 * Chạy: DATABASE_URL=... npx tsx --conditions=source e2e/support/seed-e2e-database-cli.ts
 */
import { createPgDatabase } from '../../server/src/db/pool.js';
import { seedE2eDatabase } from './seed-e2e-database.js';

const THROWAWAY_DATABASE_PATTERN = /e2e/i;

const connectionString = process.env.DATABASE_URL?.trim();
if (connectionString === undefined || connectionString === '') {
  throw new Error('Thiếu DATABASE_URL của DB thử E2E');
}

const database = createPgDatabase(
  { connectionString, ssl: false, sslRootCertFile: undefined },
  {
    info: (message) => process.stdout.write(`${message}\n`),
    warn: (message) => process.stderr.write(`${message}\n`),
  },
);

try {
  const result = await database.query<{ name: string }>('SELECT current_database() AS name');
  const databaseName = result.rows[0]?.name ?? '';
  if (!THROWAWAY_DATABASE_PATTERN.test(databaseName)) {
    throw new Error('Từ chối seed: tên DB không chứa "e2e", có thể đang trỏ vào DB thật');
  }
  await seedE2eDatabase(database);
  process.stdout.write(`Đã seed dữ liệu E2E vào DB ${databaseName}\n`);
} finally {
  await database.close();
}
