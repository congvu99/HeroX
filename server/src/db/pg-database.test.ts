import { createServer } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { loadMigrations, runMigrations, startDatabase } from './migrate.js';
import { createPgDatabase, isDatabaseUnavailable, type Database, type DatabaseLogger } from './pool.js';

const LOCALHOST = '127.0.0.1';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, LOCALHOST, () => {
      const address = probe.address();
      probe.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('no port'))));
    });
  });
}

function collectingLogger(): DatabaseLogger & { warnings: string[] } {
  const warnings: string[] = [];
  return { warnings, info: () => undefined, warn: (message) => warnings.push(message) };
}

const connectTo = (port: number) => ({
  connectionString: `postgres://postgres@${LOCALHOST}:${port}/postgres`,
  ssl: false,
  sslRootCertFile: undefined,
});

// Chạy driver `pg` thật qua giao thức mạng Postgres (PGlite phục vụ qua TCP), không cần Docker.
describe('PgDatabase over the Postgres wire protocol', () => {
  let pglite: PGlite;
  let socketServer: PGLiteSocketServer;
  let database: Database;

  beforeAll(async () => {
    pglite = await PGlite.create();
    const port = await freePort();
    socketServer = new PGLiteSocketServer({ db: pglite, port, host: LOCALHOST, maxConnections: 10 });
    await socketServer.start();
    database = createPgDatabase(connectTo(port), collectingLogger());
  });

  afterAll(async () => {
    await database.close();
    await socketServer.stop();
    await pglite.close();
  });

  it('runs the real migrations through pg', async () => {
    await expect(runMigrations(database, await loadMigrations())).resolves.toEqual(['001-herox-schema.sql', '002-battles.sql', '003-citadel.sql']);
    await expect(runMigrations(database, await loadMigrations())).resolves.toEqual([]);
  });

  it('rolls a failed transaction back and keeps the pool usable', async () => {
    await database.exec('CREATE TABLE herox.rollback_probe (id int PRIMARY KEY)');
    const failure = database.transaction(async (tx) => {
      await tx.query('INSERT INTO herox.rollback_probe (id) VALUES ($1)', [1]);
      await tx.query('INSERT INTO herox.rollback_probe (id) VALUES ($1)', [1]);
    });
    await expect(failure).rejects.toMatchObject({ code: '23505' });
    const rows = await database.query('SELECT id FROM herox.rollback_probe');
    expect(rows.rows).toEqual([]);
  });

  it('commits a successful transaction', async () => {
    await database.transaction((tx) => tx.query("INSERT INTO herox.heroes (user_id, name, gender) VALUES (9, 'Commit', 'male')"));
    const rows = await database.query<{ name: string }>('SELECT name FROM herox.heroes WHERE user_id = 9');
    expect(rows.rows).toEqual([{ name: 'Commit' }]);
  });
});

describe('startDatabase', () => {
  it('reports an unreachable Postgres as unavailable and keeps retrying until aborted', async () => {
    const port = await freePort();
    const logger = collectingLogger();
    const database = createPgDatabase(connectTo(port), logger);
    const abort = new AbortController();
    try {
      const started = startDatabase({ database, log: logger, firstRetryDelayMs: 10, maxRetryDelayMs: 20, signal: abort.signal });
      await expect.poll(() => logger.warnings.length, { timeout: 5_000 }).toBeGreaterThanOrEqual(2);
      abort.abort();
      await expect(started).resolves.toBe(false);
      expect(logger.warnings[0]).toContain('Chưa kết nối được Postgres');
    } finally {
      await database.close();
    }
  });

  it('reports ready once migrations succeed', async () => {
    const logger = collectingLogger();
    const database: Database = {
      query: () => Promise.resolve({ rows: [] }),
      exec: () => Promise.resolve(),
      transaction: (work) => work({ query: () => Promise.resolve({ rows: [] }), exec: () => Promise.resolve() }),
      close: () => Promise.resolve(),
    };
    await expect(startDatabase({ database, log: logger, loadMigrationFiles: () => Promise.resolve([]) })).resolves.toBe(true);
    expect(logger.warnings).toEqual([]);
  });
});

describe('isDatabaseUnavailable', () => {
  const withCode = (code: string) => Object.assign(new Error('x'), { code });

  it.each(['ECONNREFUSED', '57P01', '57014', '08006', '53300'])('treats %s as unavailable', (code) => {
    expect(isDatabaseUnavailable(withCode(code))).toBe(true);
  });

  it('treats connection timeouts as unavailable', () => {
    expect(isDatabaseUnavailable(new Error('timeout exceeded when trying to connect'))).toBe(true);
  });

  it.each([withCode('23505'), withCode('42501'), 'text', null])('does not treat %s as unavailable', (error) => {
    expect(isDatabaseUnavailable(error)).toBe(false);
  });
});
