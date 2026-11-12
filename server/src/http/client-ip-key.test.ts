import { describe, expect, it } from 'vitest';
import { rateLimitKeyForIp } from './client-ip-key.js';

describe('rateLimitKeyForIp', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:aaaa:bbbb:cccc:dddd', '2001:db8:1:2::/64'],
    ['2001:0db8:0001:0002::1', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['FE80::1%eth0', 'fe80:0:0:0::/64'],
  ])('maps %s to %s', (ip, expected) => {
    expect(rateLimitKeyForIp(ip)).toBe(expected);
  });

  it('puts addresses of one /64 under the same key', () => {
    expect(rateLimitKeyForIp('2001:db8:1:2::a')).toBe(rateLimitKeyForIp('2001:db8:1:2:ffff::b'));
  });
});
