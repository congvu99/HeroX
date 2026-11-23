// Sinh map chương 4 `assets/maps/chapter-4-hellmaw.ldtk` + atlas `assets/tilesets/chapter-4.png`
// (ghép từ Kenney Tiny Town + Tiny Dungeon, CC0). Chạy: npm run generate:chapter-4 -w @herox/client.
// Script tất định; không sửa tay file .ldtkl. id level/entity là hợp đồng với client và dữ liệu truyện.
import { generateChapter } from './lib/generate-chapter.mjs';
import { LEGEND, LEVELS } from './chapter-4/levels.mjs';

generateChapter({
  mapName: 'chapter-4-hellmaw',
  tilesetIdentifier: 'Chapter_4',
  chapterTitle: 'chương 4',
  iidTagPrefix: 'c4a7e0',
  projectIid: 'c4a7e000-0b5d-4e1f-9a04-000000000000',
  dummyWorldIid: 'c4a7e000-0b5d-4e1f-9a04-0000000000ff',
  bgColor: '#3A1220',
  legend: LEGEND,
  levels: LEVELS,
});
