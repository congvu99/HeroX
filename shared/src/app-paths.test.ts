import { describe, expect, it } from 'vitest';
import { API_PREFIX, APP_BASE_PATH, apiPath } from './app-paths.js';

describe('app paths', () => {
  it('keeps the API under the app base path so one proxy rule covers both', () => {
    expect(API_PREFIX.startsWith(APP_BASE_PATH)).toBe(true);
  });

  it('joins a route with exactly one slash', () => {
    expect(apiPath('health')).toBe('/herox/api/health');
    expect(apiPath('/health')).toBe('/herox/api/health');
    expect(apiPath('')).toBe('/herox/api');
  });
});
