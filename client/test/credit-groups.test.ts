import { describe, expect, it } from 'vitest';
import { groupCredits, parseCredits } from '../src/ui/asset-credits';

describe('credit groups for the library screen', () => {
  it('gộp theo nguồn + giấy phép, tác giả không lặp, bỏ dòng sai dạng', () => {
    const credits = parseCredits([
      { path: 'sprites/monsters/imp.png', source: 'DCSS', license: 'CC0', url: 'https://example.test/dcss', authors: 'A, B' },
      { path: 'tiles/dcss/floor.png', source: 'DCSS', license: 'CC0', authors: ['B', 'C'] },
      { path: 'sprites/hero/hero_walk.png', source: 'LPC', license: 'CC-BY-SA 3.0', authors: ['D'] },
      { path: 'broken.png', source: 'X' },
      'junk',
    ]);
    expect(credits).toHaveLength(3);
    expect(groupCredits(credits)).toEqual([
      { source: 'DCSS', license: 'CC0', url: 'https://example.test/dcss', authors: ['A', 'B', 'C'], count: 2 },
      { source: 'LPC', license: 'CC-BY-SA 3.0', url: '', authors: ['D'], count: 1 },
    ]);
    expect(parseCredits({ not: 'an array' })).toEqual([]);
  });
});
