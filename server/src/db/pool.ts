import { readFileSync } from 'node:fs';
import pg from 'pg';

/** Chạy một câu SQL có tham số; mọi repository chỉ phụ thuộc interface này để test được bằng Postgres nhúng. */
export interface Queryable {
  query<Row>(text: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
}

/** Thêm khả năng chạy script nhiều câu (migration), không tham số. */
export interface SqlExecutor extends Queryable {
  exec(sql: string): Promise<void>;
}

export interface Database extends SqlExecutor {
  /** Chạy `work` trong một transaction; lỗi thì ROLLBACK rồi ném tiếp. */
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  readonly connectionString: string;
  readonly ssl: boolean;
  /** File CA để xác thực chứng chỉ Postgres khi bật TLS; thiếu thì dùng CA hệ thống. */
  readonly sslRootCertFile: string | undefined;
}

/** Logger có mức: lỗi kết nối/migration phải lên warn để cảnh báo vận hành bắt được. */
export interface DatabaseLogger {
  info(message: string): void;
  warn(message: string): void;
}

// Ít kết nối: HeroX chỉ đọc vài dòng mỗi request và dùng chung Postgres với LingoBrain.
const POOL_MAX_CONNECTIONS = 5;
const CONNECTION_TIMEOUT_MS = 10_000;
// Truy vấn của HeroX đều nhỏ; chặn treo khi bảng LingoBrain bị khoá (ALTER/LOCK) hoặc socket nửa mở sau failover,
// nếu không vài request treo là hết pool. Phía client dài hơn phía server một chút để server huỷ trước.
const STATEMENT_TIMEOUT_MS = 5_000;
const QUERY_TIMEOUT_MS = 7_000;
// Tên hiện trong pg_stat_activity để DBA nhận ra kết nối của HeroX trên DB dùng chung.
const APPLICATION_NAME = 'herox';

// Lỗi do DB không dùng được (mất kết nối, đang khởi động lại, hết slot) → API trả 503 thay vì 500.
// Cùng danh sách với eng/server/database.js isDbUnavailable.
const UNAVAILABLE_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'EPIPE',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  // query_canceled: hết statement_timeout.
  '57014',
]);
const CONNECTION_EXCEPTION_CLASS = '08';
const UNAVAILABLE_MESSAGE_PATTERN = /timeout exceeded when trying to connect|Connection terminated/i;

export function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = 'code' in error ? String(error.code) : '';
  return (
    UNAVAILABLE_ERROR_CODES.has(code) ||
    code.startsWith(CONNECTION_EXCEPTION_CLASS) ||
    UNAVAILABLE_MESSAGE_PATTERN.test(error.message)
  );
}

function buildSslOption(options: DatabaseOptions): pg.PoolConfig['ssl'] {
  if (!options.ssl) return false;
  if (options.sslRootCertFile === undefined) return { rejectUnauthorized: true };
  return { ca: readFileSync(options.sslRootCertFile, 'utf8'), rejectUnauthorized: true };
}

class PgExecutor implements SqlExecutor {
  constructor(private readonly target: pg.Pool | pg.PoolClient) {}

  async query<Row>(text: string, values: readonly unknown[] = []): Promise<{ rows: Row[] }> {
    const result = await this.target.query<pg.QueryResultRow>(text, [...values]);
    return { rows: result.rows as Row[] };
  }

  async exec(sql: string): Promise<void> {
    // Không truyền tham số → giao thức simple query, cho phép script nhiều câu.
    await this.target.query(sql);
  }
}

class PgDatabase extends PgExecutor implements Database {
  constructor(private readonly pool: pg.Pool) {
    super(pool);
  }

  async transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    // Client đang mượn không còn listener 'error' của pool: thiếu listener thì DB rớt giữa transaction làm chết process.
    let brokenConnection: Error | undefined;
    const onClientError = (error: Error): void => {
      brokenConnection = error;
    };
    client.on('error', onClientError);
    try {
      await client.query('BEGIN');
      const result = await work(new PgExecutor(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError: unknown) => {
        brokenConnection ??= rollbackError instanceof Error ? rollbackError : new Error('ROLLBACK thất bại');
      });
      throw error;
    } finally {
      client.off('error', onClientError);
      // Kết nối hỏng thì huỷ, không trả lại pool.
      client.release(brokenConnection);
    }
  }

  close(): Promise<void> {
    return this.pool.end();
  }
}

/**
 * Tạo pool Postgres; lỗi của client rảnh chỉ được log, không làm chết process.
 * Tham số trong connection string (ví dụ `sslmode`) ghi đè tuỳ chọn ở đây: cấu hình TLS bằng PGSSL, không bằng URL.
 */
export function createPgDatabase(options: DatabaseOptions, log: DatabaseLogger): Database {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    ssl: buildSslOption(options),
    max: POOL_MAX_CONNECTIONS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    keepAlive: true,
    application_name: APPLICATION_NAME,
  });
  pool.on('error', (error) => log.warn(`Lỗi kết nối Postgres đang rảnh: ${error.message}`));
  return new PgDatabase(pool);
}
