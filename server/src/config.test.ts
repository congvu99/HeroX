import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_PORT, loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses defaults when variables are absent', () => {
    expect(loadConfig({})).toEqual({
      port: DEFAULT_PORT,
      databaseUrl: undefined,
      trustProxyHops: 0,
      pgSsl: false,
      pgSslRootCert: undefined,
    });
  });

  it('parses provided values', () => {
    const config = loadConfig({
      PORT: '4000',
      DATABASE_URL: 'postgres://user@db/app',
      TRUST_PROXY_HOPS: '1',
      PGSSL: 'TRUE',
      PGSSLROOTCERT: '/etc/ssl/postgres-ca.pem',
    });
    expect(config).toEqual({
      port: 4000,
      databaseUrl: 'postgres://user@db/app',
      trustProxyHops: 1,
      pgSsl: true,
      pgSslRootCert: '/etc/ssl/postgres-ca.pem',
    });
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['TRUST_PROXY_HOPS', '-1'],
    ['PGSSL', 'yes'],
  ])('rejects invalid %s=%s', (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(ConfigError);
  });

  it('does not echo the raw value in the error message', () => {
    let message = '';
    try {
      loadConfig({ PGSSL: 'secret-value' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('PGSSL');
    expect(message).not.toContain('secret-value');
  });
});
