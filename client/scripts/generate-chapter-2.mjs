// Sinh map chương 2 `assets/maps/chapter-2-ash-forest.ldtk` + atlas `assets/tilesets/chapter-2.png`
// (ghép từ Kenney Tiny Town + Tiny Dungeon, CC0). Chạy: npm run generate:chapter-2 -w @herox/client.
// Script tất định; không sửa tay file .ldtkl. id level/entity là hợp đồng với client và dữ liệu truyện.
import { generateChapter } from './lib/generate-chapter.mjs';
import { LEGEND, LEVELS } from './chapter-2/levels.mjs';

generateChapter({
  mapName: 'chapter-2-ash-forest',
  tilesetIdentifier: 'Chapter_2',
  chapterTitle: 'chương 2',
  iidTagPrefix: 'c2a7e0',
  projectIid: 'c2a7e000-0b5d-4e1f-9a02-000000000000',
  dummyWorldIid: 'c2a7e000-0b5d-4e1f-9a02-0000000000ff',
  bgColor: '#6E5A4B',
  legend: LEGEND,
  levels: LEVELS,
});
