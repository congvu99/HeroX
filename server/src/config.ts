/** Cấu hình server đọc từ biến môi trường; bất biến sau khi khởi động. */
export interface ServerConfig {
  readonly port: number;
  /** Bắt buộc khi chạy server (kiểm ở `server.ts`); để trống được trong test không cần DB. */
  readonly databaseUrl: string | undefined;
  readonly trustProxyHops: number;
  readonly pgSsl: boolean;
  /** File CA xác thực chứng chỉ Postgres khi `pgSsl` bật; trống thì dùng CA hệ thống. */
  readonly pgSslRootCert: string | undefined;
}

export const DEFAULT_PORT = 3180;
const MAX_PORT = 65_535;

type Env = Readonly<Record<string, string | undefined>>;

export class ConfigError extends Error {
  constructor(variableName: string, reason: string) {
    super(`Biến môi trường ${variableName} không hợp lệ: ${reason}`);
    this.name = 'ConfigError';
  }
}

function readNonNegativeInteger(env: Env, name: string, fallback: number, max: number): number {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new ConfigError(name, 'phải là số nguyên không âm');
  const value = Number(raw);
  if (value > max) throw new ConfigError(name, `phải không lớn hơn ${max}`);
  return value;
}

function readBoolean(env: Env, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new ConfigError(name, 'phải là true hoặc false');
}

function readOptionalString(env: Env, name: string): string | undefined {
  const raw = env[name]?.trim();
  return raw === undefined || raw === '' ? undefined : raw;
}

/** Đọc và kiểm tra cấu hình; `ConfigError` không chứa giá trị gốc để tránh lộ bí mật vào log. */
export function loadConfig(env: Env = process.env): ServerConfig {
  return {
    port: readNonNegativeInteger(env, 'PORT', DEFAULT_PORT, MAX_PORT),
    databaseUrl: readOptionalString(env, 'DATABASE_URL'),
    trustProxyHops: readNonNegativeInteger(env, 'TRUST_PROXY_HOPS', 0, Number.MAX_SAFE_INTEGER),
    pgSsl: readBoolean(env, 'PGSSL', false),
    pgSslRootCert: readOptionalString(env, 'PGSSLROOTCERT'),
  };
}
