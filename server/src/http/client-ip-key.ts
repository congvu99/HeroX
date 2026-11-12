import { isIPv6 } from 'node:net';

const IPV4_MAPPED_PREFIX = '::ffff:';
const IPV6_GROUP_COUNT = 8;
// Một máy/hộ gia đình IPv6 thường nhận cả khối /64 (4 nhóm đầu): đếm theo từng địa chỉ thì xoay địa chỉ là vượt hạn mức.
const IPV6_RATE_LIMIT_GROUPS = 4;

function expandIpv6Groups(address: string): string[] {
  const [head = '', tail] = address.split('::');
  const headGroups = head === '' ? [] : head.split(':');
  if (tail === undefined) return headGroups;
  const tailGroups = tail === '' ? [] : tail.split(':');
  const zeros = Array.from({ length: IPV6_GROUP_COUNT - headGroups.length - tailGroups.length }, () => '0');
  return [...headGroups, ...zeros, ...tailGroups];
}

/** Key rate limit theo IP: IPv4 giữ nguyên, IPv4-mapped bỏ tiền tố, IPv6 gom theo khối /64. */
export function rateLimitKeyForIp(ip: string): string {
  const address = ip.toLowerCase();
  if (address.startsWith(IPV4_MAPPED_PREFIX) && address.includes('.')) return address.slice(IPV4_MAPPED_PREFIX.length);
  if (!isIPv6(address)) return address;
  const prefix = expandIpv6Groups(address.split('%')[0] ?? address)
    .slice(0, IPV6_RATE_LIMIT_GROUPS)
    .map((group) => group.replace(/^0+(?=.)/, ''));
  return `${prefix.join(':')}::/64`;
}
