// Đưa sprite/tile tạm về bảng màu chung, ghi đè tại chỗ.
// Chạy: node tools/palette-harmonize.mjs <file.png>...
// File đã có chunk tEXt `herox-harmonized` được bỏ qua để chạy lại không chỉnh chồng.
import { readPng, writePng } from './lib/png.mjs';
import { harmonizeImage, isHarmonized } from './lib/palette.mjs';

const files = process.argv.slice(2);
if (files.length === 0) {
  process.stderr.write('Cách dùng: node tools/palette-harmonize.mjs <file.png>...\n');
  process.exit(1);
}

let changed = 0;
for (const file of files) {
  const image = readPng(file);
  if (isHarmonized(image)) {
    process.stdout.write(`bỏ qua (đã chỉnh): ${file}\n`);
    continue;
  }
  writePng(file, harmonizeImage(image));
  changed++;
  process.stdout.write(`đã chỉnh: ${file}\n`);
}
process.stdout.write(`Xong: chỉnh ${changed}/${files.length} file.\n`);
