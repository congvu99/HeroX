import { readdir, readFile } from 'node:fs/promises';
import { isDatabaseUnavailable, type Database, type DatabaseLogger } from './pool.js';

export interface Migration {
  /** Tên file, ví dụ `001-herox-schema.sql`; thứ tự chạy theo tên. */
  readonly name: string;
  readonly sql: string;
}

const MIGRATION_DIRECTORY = new URL('./migrations/', import.meta.url);
const MIGRATION_FILE_PATTERN = /^\d{3}-[a-z0-9-]+\.sql$/;
// Khoá advisory chung cho mọi instance HeroX: hai container khởi động cùng lúc không chạy trùng migration.
const MIGRATION_LOCK_KEY = 0x4845_5258;
const HEROX_SCHEMA = 'herox';

/** Đọc các file migration đi kèm server, sắp theo tên. */
export async function loadMigrations(directory: URL = MIGRATION_DIRECTORY): Promise<Migration[]> {
  const fileNames = (await readdir(directory)).filter((name) => MIGRATION_FILE_PATTERN.test(name)).sort();
  return Promise.all(fileNames.map(async (name) => ({ name, sql: await readFile(new URL(name, directory), 'utf8') })));
}

async function ensureMigrationTable(database: Database): Promise<void> {
  await database.transaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
    // CREATE SCHEMA kiểm quyền CREATE trên database trước cả IF NOT EXISTS; DBA có thể đã tạo sẵn schema
    // và chỉ cấp quyền trên schema, nên chỉ tạo khi chưa có.
    const existing = await tx.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [HEROX_SCHEMA]);
    if (existing.rows.length === 0) await tx.exec(`CREATE SCHEMA IF NOT EXISTS ${HEROX_SCHEMA}`);
    await tx.exec(
      `CREATE TABLE IF NOT EXISTS herox.schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
  });
}

/** Chạy các migration chưa áp dụng, mỗi file một transaction; chạy lại bao nhiêu lần cũng được. Trả tên file vừa áp dụng. */
export async function runMigrations(database: Database, migrations: readonly Migration[]): Promise<string[]> {
  await ensureMigrationTable(database);
  const applied: string[] = [];
  for (const migration of migrations) {
    const wasApplied = await database.transaction(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);
      const existing = await tx.query('SELECT 1 FROM herox.schema_migrations WHERE name = $1', [migration.name]);
      if (existing.rows.length > 0) return false;
      await tx.exec(migration.sql);
      await tx.query('INSERT INTO herox.schema_migrations (name) VALUES ($1)', [migration.name]);
      return true;
    });
    if (wasApplied) applied.push(migration.name);
  }
  return applied;
}

export interface DatabaseStartupOptions {
  readonly database: Database;
  readonly log: DatabaseLogger;
  readonly loadMigrationFiles?: () => Promise<Migration[]>;
  readonly firstRetryDelayMs?: number;
  readonly maxRetryDelayMs?: number;
  readonly signal?: AbortSignal;
}

const DEFAULT_FIRST_RETRY_DELAY_MS = 2_000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function describeStartupError(error: unknown): string {
  if (!(error instanceof Error)) return 'lỗi không xác định';
  const code = 'code' in error ? ` [${String(error.code)}]` : '';
  return `${error.message}${code}`;
}

/**
 * Chạy migration lúc khởi động, thử lại có backoff (2s → 30s) cho tới khi xong hoặc bị huỷ.
 * Không bao giờ ném lỗi: trong lúc chưa xong, API trả 503 còn health check vẫn sống.
 * @returns `true` khi DB sẵn sàng, `false` khi bị huỷ trước đó.
 */
export async function startDatabase(options: DatabaseStartupOptions): Promise<boolean> {
  const loadFiles = options.loadMigrationFiles ?? loadMigrations;
  const maxDelay = options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
  let delay = options.firstRetryDelayMs ?? DEFAULT_FIRST_RETRY_DELAY_MS;
  while (options.signal?.aborted !== true) {
    try {
      const applied = await runMigrations(options.database, await loadFiles());
      options.log.info(applied.length > 0 ? `Đã áp dụng migration: ${applied.join(', ')}` : 'Schema herox đã cập nhật');
      return true;
    } catch (error) {
      const kind = isDatabaseUnavailable(error) ? 'Chưa kết nối được Postgres' : 'Migration lỗi';
      options.log.warn(`${kind} (${describeStartupError(error)}), thử lại sau ${delay / 1000}s`);
    }
    await sleep(delay, options.signal);
    delay = Math.min(delay * 2, maxDelay);
  }
  return false;
}
