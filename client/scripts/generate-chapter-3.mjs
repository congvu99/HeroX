// Sinh map chương 3 `assets/maps/chapter-3-saint-catacomb.ldtk` + atlas `assets/tilesets/chapter-3.png`
// (ghép từ Kenney Tiny Town + Tiny Dungeon, CC0). Chạy: npm run generate:chapter-3 -w @herox/client.
// Script tất định; không sửa tay file .ldtkl. id level/entity là hợp đồng với client và dữ liệu truyện.
import { generateChapter } from './lib/generate-chapter.mjs';
import { LEGEND, LEVELS } from './chapter-3/levels.mjs';

generateChapter({
  mapName: 'chapter-3-saint-catacomb',
  tilesetIdentifier: 'Chapter_3',
  chapterTitle: 'chương 3',
  iidTagPrefix: 'c3a7e0',
  projectIid: 'c3a7e000-0b5d-4e1f-9a03-000000000000',
  dummyWorldIid: 'c3a7e000-0b5d-4e1f-9a03-0000000000ff',
  bgColor: '#2A2733',
  legend: LEGEND,
  levels: LEVELS,
});
