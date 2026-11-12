// Sinh `assets/CREDITS.md` (tiếng Việt, gom theo nguồn) từ `assets/credits.json` và `tools/pixellab/art-recipes.json`.
// Chạy: node tools/build-credits.mjs          → ghi file
//       node tools/build-credits.mjs --check  → chỉ so sánh, mã thoát 1 nếu file lệch (dùng trong test/CI)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSETS_DIR, readCredits, REPO_ROOT } from './lib/credits-store.mjs';

const CREDITS_MD = join(ASSETS_DIR, 'CREDITS.md');
const ART_RECIPES = join(REPO_ROOT, 'tools', 'pixellab', 'art-recipes.json');
const EXIT_MISMATCH = 1;

function cell(value) {
  return (value === '' ? '—' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function groupBySource(credits) {
  const groups = new Map();
  for (const entry of credits) {
    const group = groups.get(entry.source) ?? [];
    group.push(entry);
    groups.set(entry.source, group);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function renderSource(source, entries) {
  const urls = [...new Set(entries.map((entry) => entry.url).filter(Boolean))];
  const lines = [`## ${source}`, ''];
  if (urls.length > 0) lines.push(`Trang nguồn: ${urls.join(', ')}`, '');
  lines.push('| File | Nội dung | Tác giả | License | Chỉnh sửa |', '|---|---|---|---|---|');
  for (const entry of [...entries].sort((left, right) => left.path.localeCompare(right.path))) {
    lines.push(`| \`${entry.path}\` | ${cell(entry.title)} | ${cell(entry.authors)} | ${cell(entry.license)} | ${cell(entry.modified)} |`);
  }
  return [...lines, ''];
}

function renderPixelLab(recipes) {
  const lines = ['## PixelLab', ''];
  if (recipes.assets.length === 0) return [...lines, 'Chưa có asset PixelLab; mọi hình hiện tại là hình tạm ở các mục trên.', ''];
  lines.push('| File | Mã công thức | Kích thước | Hướng | Hoạt ảnh | Ngày tạo |', '|---|---|---|---|---|---|');
  for (const recipe of recipes.assets) {
    const size = `${recipe.size.width}x${recipe.size.height}`;
    lines.push(`| \`${recipe.path}\` | ${cell(recipe.id)} | ${size} | ${recipe.directions} | ${cell(recipe.animations.join(', '))} | ${recipe.createdAt} |`);
  }
  return [...lines, '', 'Prompt, seed và ảnh tham chiếu để tạo lại: `tools/pixellab/art-recipes.json`.', ''];
}

/** Nội dung CREDITS.md tất định (sắp theo nguồn rồi theo đường dẫn). */
export function renderCreditsMarkdown(credits, recipes) {
  const header = [
    '# Nguồn hình HeroX',
    '',
    'File này sinh tự động bằng `node tools/build-credits.mjs` từ `assets/credits.json` và `tools/pixellab/art-recipes.json`; sửa dữ liệu nguồn rồi chạy lại, không sửa tay.',
    '',
    '- Đường dẫn tính từ thư mục `assets/`. Hiệu ứng chiêu (pixelfx, MIT) ghi riêng ở `assets/fx/CREDITS.md`.',
    '- Hình LPC chỉ dùng layer có ít nhất một license không phải GPL; tác giả và license từng layer ở `assets/sprites/hero/lpc-credits.csv` (trích `CREDITS.csv` của LPC).',
    '- Hình đánh dấu `palette-harmonize` đã được đưa về bảng màu chung bằng `node tools/palette-harmonize.mjs`.',
    '',
  ];
  const sections = groupBySource(credits).flatMap(([source, entries]) => renderSource(source, entries));
  return [...header, ...sections, ...renderPixelLab(recipes)].join('\n');
}

const markdown = renderCreditsMarkdown(readCredits(), JSON.parse(readFileSync(ART_RECIPES, 'utf8')));
if (process.argv.includes('--check')) {
  const current = existsSync(CREDITS_MD) ? readFileSync(CREDITS_MD, 'utf8') : '';
  if (current !== markdown) {
    process.stderr.write('assets/CREDITS.md lệch với assets/credits.json; chạy: node tools/build-credits.mjs\n');
    process.exit(EXIT_MISMATCH);
  }
  process.stdout.write('assets/CREDITS.md khớp.\n');
} else {
  writeFileSync(CREDITS_MD, markdown);
  process.stdout.write('Đã ghi assets/CREDITS.md.\n');
}
