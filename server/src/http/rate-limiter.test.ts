import { describe, expect, it } from 'vitest';
import { FixedWindowRateLimiter } from './rate-limiter.js';

describe('FixedWindowRateLimiter', () => {
  it('allows up to the limit inside one window, then blocks', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 2, windowMs: 1000, maxKeys: 10 });
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 10)).toBe(true);
    expect(limiter.hit('a', 20)).toBe(false);
    expect(limiter.hit('b', 20)).toBe(true);
  });

  it('opens a new window after windowMs', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 10 });
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 999)).toBe(false);
    expect(limiter.hit('a', 1000)).toBe(true);
  });

  it('evicts the oldest key when full', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    limiter.hit('a', 0);
    limiter.hit('b', 0);
    limiter.hit('c', 0);
    expect(limiter.size).toBe(2);
    expect(limiter.hit('a', 1)).toBe(true);
  });

  it('sweeps expired windows', () => {
    const limiter = new FixedWindowRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 10 });
    limiter.hit('a', 0);
    limiter.hit('b', 500);
    limiter.sweep(1200);
    expect(limiter.size).toBe(1);
  });
});
