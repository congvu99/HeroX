import { describe, expect, it } from 'vitest';
import { RING_SIZE } from '@herox/shared';
import { ringSide } from '../src/ui/word-ring';

describe('ringSide', () => {
  it('chia đều từ hai bên hiệp sĩ, xen kẽ trái/phải theo thứ tự hàng', () => {
    const sides = Array.from({ length: RING_SIZE }, (_, index) => ringSide(index));
    expect(sides.filter((side) => side === 'left')).toHaveLength(RING_SIZE / 2);
    expect(sides.filter((side) => side === 'right')).toHaveLength(RING_SIZE / 2);
    expect(sides.slice(0, 2)).toEqual(['left', 'right']);
  });
});
