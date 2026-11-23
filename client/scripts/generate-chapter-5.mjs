// Sinh map chương 5 `assets/maps/chapter-5-broken-heaven.ldtk` + atlas `assets/tilesets/chapter-5.png`
// (ghép từ Kenney Tiny Town + Tiny Dungeon, CC0). Chạy: npm run generate:chapter-5 -w @herox/client.
// Script tất định; không sửa tay file .ldtkl. id level/entity là hợp đồng với client và dữ liệu truyện.
import { generateChapter } from './lib/generate-chapter.mjs';
import { LEGEND, LEVELS } from './chapter-5/levels.mjs';

generateChapter({
  mapName: 'chapter-5-broken-heaven',
  tilesetIdentifier: 'Chapter_5',
  chapterTitle: 'chương 5',
  iidTagPrefix: 'c5a7e0',
  projectIid: 'c5a7e000-0b5d-4e1f-9a05-000000000000',
  dummyWorldIid: 'c5a7e000-0b5d-4e1f-9a05-0000000000ff',
  bgColor: '#C9B98A',
  legend: LEGEND,
  levels: LEVELS,
});
